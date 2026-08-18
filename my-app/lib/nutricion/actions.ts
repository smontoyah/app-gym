import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth-helpers';
import type { FoodProduct } from '@/types/database';
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
    ...macros,
  };
}

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
  const userId = await getUserId();
  const row = draftToRow(params.draft);

  if (!row.name) return { id: null, error: 'El nombre no puede quedar vacío.', photoWarning: null };

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
  const { error } = await supabase.from('food_products').delete().eq('id', id);
  if (!error) return { error: null };

  // 23503 = foreign_key_violation: la FK de nutrition_logs es ON DELETE
  // RESTRICT a propósito, para que borrar un producto no vacíe el historial.
  if (error.code === '23503') {
    const { count } = await supabase
      .from('nutrition_logs')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id);
    return {
      error: `Este producto está usado en ${count ?? 'varios'} registro(s) del diario o en alguna receta. Borrá esos registros primero.`,
    };
  }
  return { error: error.message };
}
