import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WeightUnit } from '@/lib/units';

const STORAGE_KEY = '@gym_weight_units';

export type WeightUnitByExercise = Record<string, WeightUnit>;

/**
 * La unidad se recuerda **por ejercicio**: una máquina está graduada como está
 * y no cambia de una sesión a la otra, así que la press de pecho abre en lb y
 * la barra libre en kg sin tocar nada.
 *
 * Es preferencia de captura, no dato de entrenamiento: vive en el dispositivo
 * y no en Supabase. Si la lectura falla se arranca en kg, que es la unidad
 * canónica — nunca se pierde un registro por esto.
 */
export async function loadWeightUnits(): Promise<WeightUnitByExercise> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const units: WeightUnitByExercise = {};
    for (const [exerciseId, unit] of Object.entries(parsed as Record<string, unknown>)) {
      if (unit === 'kg' || unit === 'lb') units[exerciseId] = unit;
    }
    return units;
  } catch {
    return {};
  }
}

export async function saveWeightUnit(exerciseId: string, unit: WeightUnit): Promise<void> {
  try {
    const current = await loadWeightUnits();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, [exerciseId]: unit }));
  } catch {
    // Se sigue registrando en la unidad elegida; sólo no se recuerda mañana.
  }
}
