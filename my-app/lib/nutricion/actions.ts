import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { currentUserId } from '@/lib/auth-helpers';
import type { FoodProduct, FoodProductUsage } from '@/types/database';
import { MACRO_FIELDS, type MacroField, type OcrResult, type ProductDraft } from './types';
import type { Shot } from './scan';

const BUCKET = 'nutrition';

/**
 * Las etiquetas colombianas escriben los decimales con coma ("3,7 g") y el
 * teclado numérico de Android deja escribirlos así. `Number('3,7')` da NaN, y
 * un NaN silencioso aquí termina siendo una macro perdida en la base.
 */
export function parseNum(value: string): number | null {
  const clean = value.trim().replace(',', '.');
  if (clean === '') return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

export function draftToRow(draft: ProductDraft) {
  const macros = Object.fromEntries(
    MACRO_FIELDS.map((f) => [f, parseNum(draft[f])])
  ) as Record<MacroField, number | null>;

  return {
    name: draft.name.trim(),
    brand: draft.brand.trim() || null,
    package_size_g: parseNum(draft.package_size_g),
    serving_size_g: parseNum(draft.serving_size_g),
    serving_label: draft.serving_label.trim() || null,
    servings_per_package: parseNum(draft.servings_per_package),
    intake_unit: draft.intake_unit,
    // Se guarda el peso aunque el producto quede en gramos: si mañana se
    // vuelve a marcar "unidades", la equivalencia ya está y no hay que
    // buscarla otra vez.
    unit_weight_g: parseNum(draft.unit_weight_g),
    unit_label: draft.unit_label.trim() || null,
    base_state: draft.base_state,
    // Sin forma base no hay desde dónde convertir, así que el rendimiento
    // suelto no se guarda: sería un número que nadie puede usar.
    cooked_yield_pct: draft.base_state ? parseNum(draft.cooked_yield_pct) : null,
    ...macros,
  };
}

/**
 * Lo que no puede pasar de acá a la base. Es el mismo par de reglas que valida
 * la tabla (nombre no vacío, unidades con equivalencia), dicho en castellano y
 * antes de gastar el viaje: el mensaje de Postgres no le sirve a nadie.
 */
export function validateDraft(draft: ProductDraft): string | null {
  if (!draft.name.trim()) return 'El nombre no puede quedar vacío.';

  const unitWeight = parseNum(draft.unit_weight_g);
  if (draft.intake_unit === 'unidad' && (unitWeight === null || unitWeight <= 0)) {
    return 'Si el producto se ingresa en unidades, escribí cuánto pesa una: sin esa equivalencia no se puede convertir a gramos.';
  }
  if (unitWeight !== null && unitWeight <= 0) {
    return 'El peso de una unidad tiene que ser mayor que 0. Dejalo vacío si no aplica.';
  }

  const yieldPct = parseNum(draft.cooked_yield_pct);
  if (yieldPct !== null && (yieldPct <= 0 || yieldPct > 1000)) {
    return 'El rendimiento al cocinar tiene que estar entre 0 y 1000 g por cada 100 g crudos. Dejalo vacío si no lo sabés.';
  }
  if (yieldPct !== null && !draft.base_state) {
    return 'Para usar el rendimiento hay que decir primero en qué forma están las macros: crudo o cocido.';
  }

  const serving = parseNum(draft.serving_size_g);
  if (serving !== null && serving <= 0) {
    return 'Los gramos por porción tienen que ser mayores que 0. Dejalo vacío si la etiqueta no los trae.';
  }

  const energy = parseNum(draft.energy_kcal);
  if (energy !== null && (energy < 0 || energy > MAX_KCAL_PER_100G)) {
    return `Las calorías por 100 g tienen que estar entre 0 y ${MAX_KCAL_PER_100G}: ni el aceite puro pasa de ahí. Si el número que tenés es por porción, convertilo primero.`;
  }
  return null;
}

/** Mismo techo que el CHECK `food_products_energy_sane`: la grasa pura da 900. */
const MAX_KCAL_PER_100G = 900;

/**
 * Guarda el producto y después sube las fotos.
 *
 * Ese orden es deliberado: si la subida falla queda un producto sin fotos, que
 * el usuario ve y puede reintentar. Al revés quedarían archivos huérfanos en el
 * bucket que nadie referencia y nadie va a limpiar.
 */
export async function saveProduct(params: {
  draft: ProductDraft;
  ocr: OcrResult | null;
  model: string | null;
  label: Shot | null;
  front: Shot | null;
}): Promise<{ id: string | null; error: string | null; photoWarning: string | null }> {
  const invalid = validateDraft(params.draft);
  if (invalid) return { id: null, error: invalid, photoWarning: null };

  const auth = await currentUserId();
  if (!auth.userId) return { id: null, error: auth.error, photoWarning: null };
  const userId = auth.userId;

  const row = draftToRow(params.draft);

  const { data, error } = await supabase
    .from('food_products')
    .insert({
      user_id: userId,
      ...row,
      ocr_raw: params.ocr ?? null,
      ocr_model: params.model,
      ocr_confidence: params.ocr?.confidence ?? null,
      verified: true, // el usuario acaba de revisarlo en el formulario
    })
    .select('id')
    .single();

  if (error || !data) return { id: null, error: error?.message ?? 'No se pudo guardar.', photoWarning: null };

  const paths: { label_photo_path?: string; front_photo_path?: string } = {};
  const failed: string[] = [];

  for (const [kind, shot] of [['label', params.label], ['front', params.front]] as const) {
    if (!shot) continue;
    const path = `${userId}/${data.id}/${kind}.jpg`;
    const up = await uploadPhoto(path, shot.uri);
    if (up) failed.push(kind === 'label' ? 'tabla' : 'frente');
    else paths[kind === 'label' ? 'label_photo_path' : 'front_photo_path'] = path;
  }

  if (Object.keys(paths).length > 0) {
    await supabase.from('food_products').update(paths).eq('id', data.id);
  }

  return {
    id: data.id,
    error: null,
    photoWarning: failed.length
      ? `El producto quedó guardado, pero no se pudo subir la foto de ${failed.join(' ni la de ')}.`
      : null,
  };
}

async function uploadPhoto(path: string, uri: string): Promise<string | null> {
  try {
    const bytes = await new File(uri).arrayBuffer();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
    return error?.message ?? null;
  } catch (e) {
    return String(e);
  }
}

export async function fetchProduct(
  id: string
): Promise<{ product: FoodProduct | null; error: string | null }> {
  const { data, error } = await supabase
    .from('food_products')
    .select('*')
    .eq('id', id)
    .single();
  return { product: data ?? null, error: error?.message ?? null };
}

/** Vuelca una fila de la base al formulario editable (todo string). */
export function productToDraft(p: FoodProduct): ProductDraft {
  const str = (v: number | string | null) => (v == null ? '' : String(v));
  return {
    name: p.name,
    brand: p.brand ?? '',
    package_size_g: str(p.package_size_g),
    serving_size_g: str(p.serving_size_g),
    serving_label: p.serving_label ?? '',
    servings_per_package: str(p.servings_per_package),
    intake_unit: p.intake_unit ?? 'g',
    unit_weight_g: str(p.unit_weight_g),
    unit_label: p.unit_label ?? '',
    base_state: p.base_state ?? null,
    cooked_yield_pct: str(p.cooked_yield_pct),
    ...(Object.fromEntries(
      MACRO_FIELDS.map((f) => [f, str(p[f])])
    ) as Record<MacroField, string>),
  };
}

/** Lo que ve el usuario cuando intenta escribir sobre un producto ajeno. */
const NOT_AUTHOR =
  'Este producto lo cargó otro usuario. Podés usarlo en tu diario y en tus recetas, pero solo quien lo creó puede modificarlo.';

export async function updateProduct(
  id: string,
  draft: ProductDraft
): Promise<{ error: string | null }> {
  const invalid = validateDraft(draft);
  if (invalid) return { error: invalid };

  const row = draftToRow(draft);

  // verified queda en true: si el usuario editó a mano, revisó los valores.
  //
  // El `select` no es para leer el resultado: es para saber CUÁNTAS filas se
  // tocaron. Sobre un producto ajeno la RLS no devuelve error, devuelve cero
  // filas, y sin este conteo la app diría "guardado" sin haber guardado nada.
  const { data, error } = await supabase
    .from('food_products')
    .update({ ...row, verified: true })
    .eq('id', id)
    .select('id');

  if (error) return { error: error.message };
  return { error: data && data.length > 0 ? null : NOT_AUTHOR };
}

/**
 * Todo el catálogo, de todos los usuarios: un producto se escanea una sola vez
 * y queda disponible para los demás (la RLS abre el SELECT y acota la
 * escritura al autor). Sin filtro por `user_id` a propósito.
 */
export async function fetchProducts(): Promise<{ products: FoodProduct[]; error: string | null }> {
  const { data, error } = await supabase
    .from('food_products')
    .select('*')
    .order('name');

  if (error) return { products: [], error: error.message };
  return { products: data ?? [], error: null };
}

/**
 * El bucket es privado, así que las miniaturas van por URL firmada. La ruta de
 * Storage sirve de `cacheKey` estable en expo-image: sin eso, cada URL firmada
 * nueva se ve como una imagen distinta y se vuelve a descargar cada sesión.
 */
export async function signPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const wanted = paths.filter(Boolean);
  if (wanted.length === 0) return {};

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(wanted, 60 * 60 * 24 * 7);

  if (error || !data) return {};

  return Object.fromEntries(
    data.filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl])
  );
}

export async function deleteProduct(id: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('food_products')
    .delete()
    .eq('id', id)
    .select('id');

  // Igual que en el update: cero filas y sin error significa que la RLS lo
  // filtró porque el producto es de otro, no que se haya borrado.
  if (!error) return { error: data && data.length > 0 ? null : NOT_AUTHOR };

  // 23503 = foreign_key_violation: las FK hacia food_products son ON DELETE
  // RESTRICT a propósito, para que borrar un producto no vacíe el historial.
  if (error.code === '23503') return { error: await usageMessage(id) };
  return { error: error.message };
}

/**
 * Explica por qué no se pudo borrar. Va por RPC y no por un `count` normal
 * porque en un catálogo compartido quien bloquea el borrado puede ser el diario
 * de OTRO usuario: filas que la RLS no deja ni contar desde el cliente. Un
 * `count` acotado a lo propio informaría "0 registros" justo cuando Postgres
 * acaba de negarse.
 */
async function usageMessage(id: string): Promise<string> {
  const { data } = await supabase
    .rpc('food_product_usage', { p_product_id: id })
    .maybeSingle<FoodProductUsage>();

  const propios = (data?.own_logs ?? 0) + (data?.own_items ?? 0);
  const ajenos = (data?.other_logs ?? 0) + (data?.other_items ?? 0);

  // Sin conteos no hay nada que explicar en detalle, pero el borrado igual
  // falló: el genérico es la verdad mínima.
  if (propios + ajenos === 0) {
    return 'Este producto está usado en el diario o en alguna receta, así que no se puede borrar.';
  }

  const partes: string[] = [];
  if (propios > 0) partes.push(`${propios} registro(s) tuyo(s)`);
  if (ajenos > 0) partes.push(`${ajenos} de otros usuarios`);

  const detalle = partes.join(' y ');
  return propios > 0 && ajenos === 0
    ? `Este producto está usado en ${detalle} del diario o de tus recetas. Borrá esos registros primero.`
    : `Este producto está usado en ${detalle}. Los registros de otros usuarios no los podés borrar, así que este producto no se puede eliminar: editalo si tiene algo mal.`;
}
