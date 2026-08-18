import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase';
import { deviceTimeZone } from '@/lib/date';
import type { ExportRow } from '@/types/database';

/** Orden de columnas del CSV. Coincide con lo que devuelve `export_training_data`. */
const COLUMNS: (keyof ExportRow)[] = [
  'tipo',
  'fecha',
  'dia_semana',
  'ejercicio',
  'grupo_muscular',
  'serie',
  'reps_objetivo',
  'reps',
  'peso_kg',
  'rpe',
  'e1rm_kg',
  'volumen_kg',
  'minutos',
  'descanso_prescrito_s',
  'cadencia',
  'super_serie',
  'fase',
  'inicio_sesion',
  'fin_sesion',
  'duracion_sesion_min',
  'registrado_en',
  'actualizado_en',
];

/** Escapa un valor según RFC 4180. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(rows: ExportRow[]): string {
  const lines = [COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(COLUMNS.map((column) => csvCell(row[column])).join(','));
  }
  // BOM para que Excel reconozca UTF-8 y no rompa las tildes.
  return `﻿${lines.join('\n')}\n`;
}

export async function fetchExportRows(
  from: string,
  to: string
): Promise<{ rows: ExportRow[]; error: string | null }> {
  const timeZone = deviceTimeZone();
  const { data, error } = await supabase.rpc('export_training_data', {
    p_from: from,
    p_to: to,
    ...(timeZone ? { p_tz: timeZone } : {}),
  });

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as ExportRow[], error: null };
}

/**
 * Exporta todo lo registrado en el rango como CSV y abre el diálogo de compartir.
 * Incluye lo prescrito junto a lo ejecutado, para poder comparar objetivo vs real,
 * y el inicio, fin y duración de cada jornada repetidos en sus filas.
 */
export async function exportRangeToCsv(
  from: string,
  to: string
): Promise<{ rowCount: number; error: string | null }> {
  const { rows, error } = await fetchExportRows(from, to);
  if (error) return { rowCount: 0, error };
  if (rows.length === 0) return { rowCount: 0, error: 'No hay registros en ese rango' };

  try {
    const file = new File(Paths.cache, `entrenamiento_${from}_a_${to}.csv`);
    if (file.exists) file.delete();
    file.create({ overwrite: true, intermediates: true });
    file.write(buildCsv(rows));

    if (!(await Sharing.isAvailableAsync())) {
      return { rowCount: rows.length, error: `Compartir no disponible. Archivo en: ${file.uri}` };
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Exportar entrenamiento',
      UTI: 'public.comma-separated-values-text',
    });

    return { rowCount: rows.length, error: null };
  } catch (e) {
    return { rowCount: 0, error: e instanceof Error ? e.message : 'No se pudo generar el archivo' };
  }
}
