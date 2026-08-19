#!/usr/bin/env node
/**
 * Sube en lote las fotos de los alimentos genéricos del catálogo.
 *
 * El bucket 'nutrition' es privado y su política exige que el primer segmento
 * de la ruta sea el uuid del dueño, así que hace falta una sesión real. Dos
 * formas de dársela:
 *
 *   # a) con tu propio usuario de la app (recomendada: la política de RLS se
 *   #    valida de verdad, igual que cuando la app sube una foto)
 *   APP_EMAIL=smontoyah99@gmail.com APP_PASSWORD='…' \
 *     node scripts/subir-fotos-catalogo.mjs
 *
 *   # b) con la llave service_role del panel de Supabase, que salta la RLS
 *   SUPABASE_SERVICE_ROLE_KEY='…' USER_ID=345f2fa2-… \
 *     node scripts/subir-fotos-catalogo.mjs
 *
 * Es idempotente: sube con upsert, así que se puede volver a correr sin
 * duplicar nada. Con --dry-run no toca ni el storage ni la base.
 */
import { createClient } from '@supabase/supabase-js';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const FOTOS = process.env.FOTOS_DIR ?? '/home/sebastian/Documentos/valtross_2026/fotos-catalogo';
const BUCKET = 'nutrition';
const DRY = process.argv.includes('--dry-run');

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
    const sb = createClient(URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const userId = process.env.USER_ID;
    if (!userId) throw new Error('Con service_role hay que pasar USER_ID=<uuid>.');
    return { sb, userId, modo: 'service_role' };
  }

  if (!APP_EMAIL || !APP_PASSWORD) {
    throw new Error(
      'Faltan credenciales: definí APP_EMAIL y APP_PASSWORD, o SUPABASE_SERVICE_ROLE_KEY con USER_ID.'
    );
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error('No pude leer supabaseAnonKey de lib/supabase.ts; pasala en SUPABASE_ANON_KEY.');
  }
  const sb = createClient(URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({
    email: APP_EMAIL,
    password: APP_PASSWORD,
  });
  if (error) throw new Error(`No se pudo iniciar sesión: ${error.message}`);
  return { sb, userId: data.user.id, modo: 'usuario' };
}

// Un stack trace de node no le sirve a nadie acá: los errores esperables son
// credenciales malas o la carpeta de fotos vacía, y ambos se explican en una línea.
const conexion = await conectar().catch((e) => {
  console.error(`\n✗ ${e.message}\n`);
  process.exit(1);
});
const { sb, userId, modo } = conexion;
console.log(`Sesión: ${modo} · usuario ${userId}${DRY ? ' · DRY RUN' : ''}`);

// El nombre de cada archivo ES el id del producto: 66 fotos, 66 uuid.
const archivos = (await readdir(FOTOS)).filter((f) => f.endsWith('.jpg'));
if (archivos.length === 0) throw new Error(`No hay .jpg en ${FOTOS}`);

// Solo los productos que existen y siguen sin foto, para que reintentar sea barato.
const ids = archivos.map((f) => path.basename(f, '.jpg'));
const { data: productos, error: qErr } = await sb
  .from('food_products')
  .select('id, name, front_photo_path')
  .in('id', ids);
if (qErr) throw new Error(`No se pudo leer el catálogo: ${qErr.message}`);

const porId = new Map(productos.map((p) => [p.id, p]));
let subidas = 0;
let saltadas = 0;
const fallos = [];

for (const archivo of archivos.sort()) {
  const id = path.basename(archivo, '.jpg');
  const prod = porId.get(id);
  if (!prod) {
    fallos.push(`${id}: no existe ese producto en el catálogo`);
    continue;
  }

  const ruta = `${userId}/${id}/front.jpg`;
  if (prod.front_photo_path === ruta) {
    saltadas++;
    continue;
  }

  if (DRY) {
    console.log(`  [dry] ${prod.name} → ${ruta}`);
    subidas++;
    continue;
  }

  const bytes = await readFile(path.join(FOTOS, archivo));
  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(ruta, bytes, { contentType: 'image/jpeg', upsert: true });
  if (upErr) {
    fallos.push(`${prod.name}: storage — ${upErr.message}`);
    continue;
  }

  // El path se guarda, no la URL: las firmadas caducan.
  const { error: dbErr } = await sb
    .from('food_products')
    .update({ front_photo_path: ruta })
    .eq('id', id);
  if (dbErr) {
    fallos.push(`${prod.name}: base — ${dbErr.message}`);
    continue;
  }

  subidas++;
  console.log(`  ✓ ${prod.name}`);
}

console.log(`\n${subidas} subidas · ${saltadas} ya estaban · ${fallos.length} con error`);
for (const f of fallos) console.log(`  ✗ ${f}`);
process.exit(fallos.length ? 1 : 0);
