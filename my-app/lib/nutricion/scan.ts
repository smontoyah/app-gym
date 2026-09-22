import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import type { OcrResponse } from './types';

/**
 * Las dos fotos no merecen la misma calidad. La de la tabla tiene que dejar
 * leer números pequeños; la del frente solo tiene que servir para reconocer el
 * producto en el estante. Comprimirlas distinto baja el costo por escaneo y el
 * consumo de Storage sin perder nada que importe.
 */
const PRESET = {
  label: { width: 1280, compress: 0.7 },
  front: { width: 900, compress: 0.6 },
} as const;

export type PhotoKind = keyof typeof PRESET;

export type Shot = {
  /** URI local del archivo ya comprimido. */
  uri: string;
  base64: string;
  bytes: number;
};

export async function capture(
  kind: PhotoKind,
  from: 'camera' | 'library'
): Promise<{ shot: Shot | null; error: string | null }> {
  const permission =
    from === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return {
      shot: null,
      error:
        from === 'camera'
          ? 'Sin permiso de cámara. Habilitalo en los ajustes del sistema.'
          : 'Sin permiso para leer fotos.',
    };
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    // Sin recorte: el encuadre completo ayuda al modelo a ubicar la tabla, y
    // recortar a mano en el celular es justo la fricción que mata el flujo.
    allowsEditing: false,
    quality: 1,
  };

  const result =
    from === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.[0]) return { shot: null, error: null };

  try {
    return { shot: await compress(result.assets[0].uri, kind), error: null };
  } catch (e) {
    return { shot: null, error: `No se pudo procesar la imagen: ${String(e)}` };
  }
}

async function compress(uri: string, kind: PhotoKind): Promise<Shot> {
  const { width, compress: quality } = PRESET[kind];
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width });
  const rendered = await context.renderAsync();
  const out = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: quality,
    base64: true,
  });

  return {
    uri: out.uri,
    base64: out.base64 ?? '',
    // Cada 4 caracteres de base64 son 3 bytes.
    bytes: Math.round(((out.base64?.length ?? 0) * 3) / 4),
  };
}

/** Manda las dos fotos en una sola llamada: el frente aporta marca y nombre. */
export async function runOcr(
  label: Shot,
  front: Shot | null
): Promise<{ result: OcrResponse | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<OcrResponse>('ocr-nutricion', {
    body: { label: label.base64, front: front?.base64, mime: 'image/jpeg' },
  });

  if (error) {
    // El cuerpo del error trae el detalle útil (cuota, modelo retirado…), que
    // no viaja en error.message.
    let detail = error.message;
    const res = (error as { context?: Response }).context;
    if (res && typeof res.json === 'function') {
      try {
        const body = await res.json();
        detail = body?.detail || body?.error || detail;
      } catch {
        // Sin cuerpo legible: nos quedamos con el mensaje genérico.
      }
    }
    return { result: null, error: detail };
  }
  if (!data) return { result: null, error: 'La función no devolvió datos.' };
  return { result: data, error: null };
}

/**
 * La normalización a 100 g vive en `./normalizar`: es aritmética pura y este
 * módulo arrastra cámara, Storage y red, que la volverían intesteable.
 */
export { toPer100g } from './normalizar';
