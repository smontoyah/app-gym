#!/usr/bin/env node
/**
 * Vincula el catálogo de ejercicios con el dataset de referencia: convierte la
 * animación de cada movimiento, la sube al bucket `exercises` y guarda en la
 * fila el id del dataset, la URL de la ilustración y los pasos en español.
 *
 *   # con tu usuario de la app (recomendada: valida la RLS de verdad)
 *   APP_EMAIL=smontoyah99@gmail.com APP_PASSWORD='…' \
 *     node scripts/vincular-ejercicios.mjs
 *
 *   # o con la llave service_role del panel, que salta la RLS
 *   SUPABASE_SERVICE_ROLE_KEY='…' node scripts/vincular-ejercicios.mjs
 *
 * Es idempotente: subir es upsert sobre la misma ruta y la base se toca sólo si
 * algo cambió, así que volver a correrlo después de agregar una línea al mapa
 * cuesta lo que ese ejercicio nuevo. Con --dry-run no toca ni storage ni base.
 *
 * Requiere ffmpeg (`ffmpeg -version`) y el dataset clonado. Si el dataset está
 * en otro lado, pasá DATASET_DIR.
 *
 * La media es © Gym visual (https://gymvisual.com/) y se usa a 180×180 con la
 * atribución a la vista en la app, como pide su NOTICE. No se versiona en este
 * repo —que es público— justamente por eso: el script la reconstruye desde el
 * dataset local de quien lo corra.
 */
import { createClient } from '@supabase/supabase-js';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAPA } from './ejercicios-dataset.mjs';

const ejecutar = promisify(execFile);
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DATASET = process.env.DATASET_DIR ?? '/home/sebastian/Documentos/valtross_2026/exercises-dataset';
const BUCKET = 'exercises';
const DRY = process.argv.includes('--dry-run');

/**
 * Calidad del WebP. A 180×180 es indistinguible del GIF original y pesa un
 * cuarto: ~44 KB contra ~94 KB. Importa porque esto se baja en el gimnasio.
 *
 * Sin `-r`: el framerate del origen NO es uniforme (los frames duran 100 ms y
 * el último 1000 ms, que es la pausa al final del movimiento). Forzar un
 * framerate constante reescribe ese ritmo y agrega frames que no existían.
 */
const CALIDAD_WEBP = '75';

// La url y la llave anónima ya viven en lib/supabase.ts. Se leen de ahí en vez
// de duplicarlas acá, así este script no queda desincronizado si el proyecto cambia.
const cliente = await readFile(path.join(AQUI, '..', 'lib', 'supabase.ts'), 'utf8');
const URL = cliente.match(/const supabaseUrl\s*=\s*'([^']+)'/)?.[1];
const ANON_DEL_REPO = cliente.match(/const supabaseAnonKey\s*=\s*\n?\s*'([^']+)'/)?.[1];
if (!URL) throw new Error('No pude leer supabaseUrl de lib/supabase.ts.');

const { APP_EMAIL, APP_PASSWORD, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? ANON_DEL_REPO;

async function conectar() {
  if (SUPABASE_SERVICE_ROLE_KEY) {
    const sb = createClient(URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    return { sb, modo: 'service_role' };
  }
  if (!APP_EMAIL || !APP_PASSWORD) {
    throw new Error(
      'Faltan credenciales: definí APP_EMAIL y APP_PASSWORD, o SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error('No pude leer supabaseAnonKey de lib/supabase.ts; pasala en SUPABASE_ANON_KEY.');
  }
  const sb = createClient(URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error } = await sb.auth.signInWithPassword({ email: APP_EMAIL, password: APP_PASSWORD });
  if (error) throw new Error(`No se pudo iniciar sesión: ${error.message}`);
  return { sb, modo: 'usuario' };
}

// Un stack trace de node no le sirve a nadie acá: los errores esperables son
// credenciales malas, ffmpeg ausente o el dataset en otra carpeta, y los tres
// se explican en una línea.
async function fatal(promesa) {
  return promesa.catch((e) => {
    console.error(`\n✗ ${e.message}\n`);
    process.exit(1);
  });
}

await fatal(
  ejecutar('ffmpeg', ['-version']).catch(() => {
    throw new Error('Hace falta ffmpeg en el PATH para convertir las animaciones.');
  })
);

const crudo = await fatal(
  readFile(path.join(DATASET, 'data', 'exercises.json'), 'utf8').catch(() => {
    throw new Error(`No encontré el dataset en ${DATASET}. Pasá DATASET_DIR=<ruta al repo>.`);
  })
);
const porId = new Map(JSON.parse(crudo).map((e) => [e.id, e]));

const { sb, modo } = await fatal(conectar());
console.log(`Sesión: ${modo}${DRY ? ' · DRY RUN' : ''}`);

const { data: ejercicios, error: qErr } = await sb
  .from('exercises')
  .select('id, name, dataset_id, image_url, instructions');
if (qErr) await fatal(Promise.reject(new Error(`No se pudo leer el catálogo: ${qErr.message}`)));

// Por nombre en minúsculas: es la misma clave con la que la base garantiza que
// no haya dos ejercicios iguales (`exercises_user_name_unique`), así que un
// acento o una mayúscula de diferencia en el mapa no rompe el emparejamiento.
const porNombre = new Map(ejercicios.map((e) => [e.name.toLowerCase(), e]));

const trabajo = await mkdtemp(path.join(tmpdir(), 'gifs-'));
let vinculados = 0;
let saltados = 0;
const fallos = [];

try {
  for (const [nombre, datasetId] of Object.entries(MAPA)) {
    const ejercicio = porNombre.get(nombre.toLowerCase());
    if (!ejercicio) {
      fallos.push(`«${nombre}»: no existe en el catálogo (¿cambió de nombre?)`);
      continue;
    }
    const registro = porId.get(datasetId);
    if (!registro) {
      fallos.push(`«${nombre}»: el id ${datasetId} no existe en el dataset`);
      continue;
    }

    const ruta = `${datasetId}.webp`;
    const { data: publica } = sb.storage.from(BUCKET).getPublicUrl(ruta);
    const pasos = registro.instruction_steps.es;
    const yaEsta =
      ejercicio.dataset_id === datasetId &&
      ejercicio.image_url === publica.publicUrl &&
      JSON.stringify(ejercicio.instructions) === JSON.stringify(pasos);

    if (yaEsta) {
      saltados++;
      continue;
    }
    if (DRY) {
      console.log(`  [dry] ${nombre} → ${datasetId} ${registro.name} (${pasos.length} pasos)`);
      vinculados++;
      continue;
    }

    const destino = path.join(trabajo, ruta);
    try {
      await ejecutar('ffmpeg', [
        '-loglevel', 'error', '-y',
        '-i', path.join(DATASET, registro.gif_url),
        '-vcodec', 'libwebp', '-lossless', '0', '-q:v', CALIDAD_WEBP,
        '-loop', '0', '-an',
        destino,
      ]);
    } catch (e) {
      fallos.push(`${nombre}: ffmpeg — ${e.message.split('\n')[0]}`);
      continue;
    }

    const bytes = await readFile(destino);
    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(ruta, bytes, { contentType: 'image/webp', upsert: true });
    if (upErr) {
      fallos.push(`${nombre}: storage — ${upErr.message}`);
      continue;
    }

    // La URL sí se guarda entera, al revés que en nutrición: el bucket es
    // público, así que no caduca y `expo-image` la puede cachear por siempre.
    const { error: dbErr } = await sb
      .from('exercises')
      .update({ dataset_id: datasetId, image_url: publica.publicUrl, instructions: pasos })
      .eq('id', ejercicio.id);
    if (dbErr) {
      fallos.push(`${nombre}: base — ${dbErr.message}`);
      continue;
    }

    vinculados++;
    console.log(`  ✓ ${nombre} → ${registro.name} · ${Math.round(bytes.length / 1024)} KB`);
  }
} finally {
  await rm(trabajo, { recursive: true, force: true });
}

// Los que quedaron afuera del mapa no son un error, pero conviene verlos: son
// los que en la app van a salir sin ilustración.
const enMapa = new Set(Object.keys(MAPA).map((n) => n.toLowerCase()));
const sinVincular = ejercicios.filter((e) => !enMapa.has(e.name.toLowerCase()));

console.log(`\n${vinculados} vinculados · ${saltados} ya estaban · ${fallos.length} con error`);
for (const f of fallos) console.log(`  ✗ ${f}`);
if (sinVincular.length > 0) {
  console.log(`\n${sinVincular.length} sin equivalente en el mapa (van a salir sin guía):`);
  for (const e of sinVincular) console.log(`  · ${e.name}`);
}
process.exit(fallos.length ? 1 : 0);
