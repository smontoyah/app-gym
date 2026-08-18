import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite';

// Tope defensivo: el cliente ya comprime a ~180 KB. Esto solo evita que una
// imagen sin comprimir dispare el costo o agote la cuota diaria.
const MAX_BASE64_CHARS = 3_000_000; // ~2.2 MB por imagen

// Escaneos por usuario y por día. La cuota de Gemini es una sola para toda la
// app, así que este tope existe para que un usuario no se la lleve entera.
const DAILY_LIMIT = Number(Deno.env.get('OCR_DAILY_LIMIT') ?? '40');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// Los dos bloques de macros comparten forma. Gemini no resuelve $ref de forma
// fiable en responseSchema, así que se referencia el mismo objeto dos veces.
const MACROS = {
  type: 'object',
  nullable: true,
  properties: {
    energy_kcal: { type: 'number', nullable: true },
    energy_kj: { type: 'number', nullable: true },
    protein_g: { type: 'number', nullable: true },
    carbs_g: { type: 'number', nullable: true },
    sugars_g: { type: 'number', nullable: true },
    added_sugars_g: { type: 'number', nullable: true },
    fiber_g: { type: 'number', nullable: true },
    fat_g: { type: 'number', nullable: true },
    saturated_fat_g: { type: 'number', nullable: true },
    trans_fat_mg: { type: 'number', nullable: true },
    sodium_mg: { type: 'number', nullable: true },
    calcium_mg: { type: 'number', nullable: true },
    iron_mg: { type: 'number', nullable: true },
    zinc_mg: { type: 'number', nullable: true },
    vitamin_a_ug: { type: 'number', nullable: true },
    vitamin_d_ug: { type: 'number', nullable: true },
  },
  propertyOrdering: [
    'energy_kcal', 'energy_kj', 'protein_g', 'carbs_g', 'sugars_g',
    'added_sugars_g', 'fiber_g', 'fat_g', 'saturated_fat_g', 'trans_fat_mg',
    'sodium_mg', 'calcium_mg', 'iron_mg', 'zinc_mg', 'vitamin_a_ug', 'vitamin_d_ug',
  ],
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    product_name: {
      type: 'string', nullable: true,
      description: 'Nombre del producto tal como aparece impreso en el frente.',
    },
    brand: {
      type: 'string', nullable: true,
      description: 'Marca SOLO si leíste el logo completo, carácter por carácter. Si está tapado por un dedo, cortado, borroso o alcanzas a leer apenas un fragmento, esto va en null OBLIGATORIAMENTE y el fragmento se reporta en brand_visible_text. Prohibido completar el nombre con conocimiento de marcas del mercado.',
    },
    brand_visible_text: {
      type: 'string', nullable: true,
      description: 'Los caracteres del logo que realmente se ven, sin completar nada. Ej.: "...atti" si el inicio está tapado. null si no se ve logo alguno.',
    },
    package_size_g: { type: 'number', nullable: true, description: 'Contenido neto del envase en gramos.' },
    serving_size_g: { type: 'number', nullable: true, description: 'Gramos por porción, como número.' },
    serving_label: {
      type: 'string', nullable: true,
      description: 'Transcripción LITERAL de la porción impresa, con su unidad casera. Ej.: "1 cucharada (15 g)", "1 unidad (100 g)". NO lo normalices a "1 porción (X g)": si dice cucharada, escribe cucharada.',
    },
    servings_per_package: { type: 'number', nullable: true, description: 'Número de porciones por envase.' },
    per_serving: MACROS,
    per_100g: MACROS,
    printed_columns: {
      type: 'array',
      items: { type: 'string', enum: ['per_serving', 'per_100g'] },
    },
    unreadable_fields: {
      type: 'array', items: { type: 'string' },
      description: 'Nombres de los campos que NO pudiste leer con total certeza y dejaste en null o completaste parcialmente: tapados por dedos, por el estampado de lote/vencimiento, borrosos o cortados. Si brand quedó en null por estar tapado, "brand" DEBE aparecer aquí. Una lista vacía significa que leíste absolutamente todo con certeza.',
    },
    confidence: { type: 'number', description: 'De 0 a 1. Confianza global en la extracción.' },
    notes: { type: 'string', nullable: true },
  },
  required: ['printed_columns', 'unreadable_fields', 'confidence'],
  propertyOrdering: [
    'product_name', 'brand', 'brand_visible_text', 'package_size_g', 'serving_size_g',
    'serving_label', 'servings_per_package', 'per_serving', 'per_100g', 'printed_columns',
    'unreadable_fields', 'confidence', 'notes',
  ],
};

const PROMPT = `Eres un extractor de datos de etiquetas nutricionales.

Recibes una o dos fotos del MISMO producto:
- La PRIMERA imagen es la tabla nutricional ("Información Nutricional").
- La SEGUNDA imagen, si viene, es el frente del empaque.

Reglas estrictas:

1. Transcribe SOLO lo que está impreso. No calcules, no conviertas, no estimes,
   no completes con conocimiento previo del producto. Si un valor no aparece en
   la etiqueta, va en null.

2. Muchas etiquetas traen dos columnas: "por porción" y "por 100 g". Llena cada
   una en su campo (per_serving / per_100g) y declara en printed_columns cuáles
   estaban realmente impresas. Si solo hay una columna, la otra queda en null.
   NUNCA derives una columna a partir de la otra.

2b. EL ORDEN DE LAS COLUMNAS VARÍA. Algunas etiquetas ponen "Por 100 g" en la
   PRIMERA columna y "Por porción" en la segunda; otras al revés. Guíate SIEMPRE
   por el texto del encabezado de cada columna, jamás por su posición. Si ambas
   columnas muestran los mismos números, no es un error: ocurre cuando la porción
   es exactamente 100 g.

2c. No todas las etiquetas son tablas. En envases pequeños la información viene
   como texto corrido, a veces en dos bloques separados: uno encabezado
   "Información Nutricional (100 g)" y otro "Información Nutricional (porción)".
   Trátalos igual: el primero es per_100g y el segundo per_serving.

3. product_name y brand se leen del FRENTE del empaque, no de la tabla. Si no
   hay segunda imagen o no se lee con claridad, déjalos en null.

3b. LA MARCA SE TRANSCRIBE, NO SE DEDUCE. Está terminantemente prohibido inferir
   la marca a partir del tipo de producto, del diseño del empaque, del color, o
   de tu conocimiento previo de marcas del mercado. Si el logo está tapado por un
   dedo o una mano, cortado por el encuadre, borroso o con reflejo, entonces:
   brand = null, agrega "brand" a unreadable_fields, y escribe en notes el
   fragmento literal que SÍ se alcanza a leer (ej.: "logo parcialmente cubierto,
   se lee '...latti'"). Un fragmento honesto vale más que un nombre completo
   inventado: el usuario va a corregirlo a mano y necesita saber qué se vio.

3c. serving_label se transcribe TEXTUALMENTE como aparece impreso. Si la etiqueta
   dice "1 cucharada (15 g)", eso va en serving_label; no lo normalices a
   "1 porción (15 g)" ni a ninguna otra forma genérica.

4. Energía: llena energy_kcal si está en kcal y energy_kj si está en kJ. Si solo
   viene una de las dos, la otra queda en null. No conviertas entre unidades.

5. Unidades: sodio en mg. La grasa trans casi siempre viene en mg en las
   etiquetas colombianas: cópiala tal cual en trans_fat_mg (si viniera en g,
   déjala en null y anótalo en notes). Si la etiqueta reporta sal en gramos en
   vez de sodio, deja sodium_mg en null y anótalo en notes.

5b. "Azúcares totales" y "Azúcares añadidos" son campos DISTINTOS (sugars_g y
   added_sugars_g). No los confundas ni copies uno en el otro.

6. unreadable_fields: nombres de campos que SÍ están en la etiqueta pero no
   pudiste leer con seguridad (borroso, reflejo, cortado por el encuadre, o
   tapado por el estampado de lote/vencimiento que suele imprimirse encima del
   texto). Esto es importante: es preferible declarar un campo ilegible a
   adivinarlo. Nunca rellenes un valor tapado con una suposición.

7. confidence: 0 a 1, qué tan confiable es la extracción en conjunto.

8. notes es para observaciones sobre la LECTURA, no para justificarte. Nunca
   afirmes ahí que algo "se ve" o "es visible" si en realidad lo dedujiste: si
   no lo leíste carácter por carácter, no lo viste.`;

/**
 * Devuelve el `sub` del JWT. La plataforma ya validó la firma (verify_jwt está
 * activo), así que acá basta con leer el claim: llamar a auth.getUser() sería
 * una ida y vuelta de red extra por escaneo sin ganar nada de seguridad.
 *
 * Como la anon key no trae `sub`, esto además exige una sesión real: ya no
 * alcanza con la llave pública que va embebida en la app.
 */
function userIdFromJwt(header: string | null): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const payload = header.slice(7).split('.')[1];
  if (!payload) return null;
  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const claims = JSON.parse(atob(padded));
    return typeof claims?.sub === 'string' ? claims.sub : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!GEMINI_API_KEY) {
    return json({ error: 'GEMINI_API_KEY no está configurada en los secrets' }, 500);
  }

  let body: { label?: string; front?: string; mime?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body inválido: se esperaba JSON' }, 400);
  }

  const { label, front, mime = 'image/jpeg' } = body;
  if (!label) return json({ error: 'Falta "label": la foto de la tabla nutricional' }, 400);

  for (const [name, b64] of [['label', label], ['front', front]] as const) {
    if (b64 && b64.length > MAX_BASE64_CHARS) {
      return json({ error: `La imagen "${name}" es demasiado grande; comprímela antes de enviarla` }, 413);
    }
  }

  const userId = userIdFromJwt(req.headers.get('Authorization'));
  if (!userId) {
    return json({ error: 'Se necesita una sesión iniciada para escanear.' }, 401);
  }

  // La cuota se cobra ANTES de llamar a Gemini: cobrarla después dejaría que
  // una ráfaga de peticiones simultáneas gaste la cuota compartida antes de
  // que el contador alcance a reaccionar. El costo es que un fallo de Gemini
  // igual consume un escaneo del día, que es el lado seguro del error.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { data: scansToday, error: quotaError } = await admin.rpc('bump_ocr_usage', {
    p_user: userId,
    p_limit: DAILY_LIMIT,
  });

  if (quotaError) {
    console.error('bump_ocr_usage', quotaError.message);
    return json({ error: 'No se pudo verificar la cuota de escaneos.' }, 500);
  }
  if (scansToday === -1) {
    return json(
      { error: `Llegaste al tope de ${DAILY_LIMIT} escaneos por hoy. Se reinicia mañana.` },
      429,
    );
  }

  // El orden importa: el prompt describe la primera imagen como la tabla.
  const parts: unknown[] = [{ inline_data: { mime_type: mime, data: label } }];
  if (front) parts.push({ inline_data: { mime_type: mime, data: front } });
  parts.push({ text: PROMPT });

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    );
  } catch (e) {
    return json({ error: 'No se pudo contactar a Gemini', detail: String(e) }, 502);
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    // El mensaje de Gemini se propaga para poder diagnosticar cuota agotada,
    // key inválida o modelo inexistente. Nunca se devuelve la key.
    console.error('gemini error', res.status, JSON.stringify(payload));
    return json(
      { error: 'Gemini rechazó la petición', status: res.status, detail: payload?.error?.message ?? null },
      res.status === 429 ? 429 : 502,
    );
  }

  const candidate = payload?.candidates?.[0];
  const finish = candidate?.finishReason;
  if (finish && finish !== 'STOP') {
    return json({ error: `Gemini terminó con finishReason=${finish}`, detail: payload?.promptFeedback ?? null }, 502);
  }

  const text = candidate?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    console.error('respuesta no-JSON de Gemini', text.slice(0, 500));
    return json({ error: 'Gemini devolvió una respuesta que no es JSON válido' }, 502);
  }

  return json({
    data,
    meta: {
      model: MODEL,
      images: front ? 2 : 1,
      scans_today: scansToday,
      daily_limit: DAILY_LIMIT,
      elapsed_ms: Date.now() - started,
      usage: payload?.usageMetadata ?? null,
    },
  });
});
