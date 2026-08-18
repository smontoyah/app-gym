// TEMPORAL — banco de pruebas visual para el selector kg/lb. Borrar.
import { ScrollView, View, Text } from 'react-native';
import { useState } from 'react';
import { BlockCard } from './(tabs)/ejercicio/_components/block-card';
import { convertWeightInput, type WeightUnit } from '@/lib/units';
import type { ExerciseWithSets, WorkoutBlock } from './(tabs)/ejercicio/_lib/types';

const base = {
  id: 'r1', user_id: 'u', day_of_week: 1, exercise_id: 'e1', sets: 3, sort_order: 0,
  created_at: '', target_reps: '13', rest_seconds: 90, cadence: '1-0-2',
  superset_group: null, notes: null,
  exercises: { id: 'e1', user_id: 'u', name: 'Press de pecho en máquina', muscle_group: 'Pecho', image_url: null, created_at: '' },
};

function make(id: string, name: string, unit: WeightUnit): ExerciseWithSets {
  const kg = [45.36, 45.36, 47.63];
  return {
    ...base, id, exercise_id: id,
    exercises: { ...base.exercises, id, name },
    weightUnit: unit,
    suggestion: { action: 'increase', weightKg: 47.5, targetReps: 13 },
    sets_data: kg.map((w, i) => ({
      set_number: i + 1,
      reps: '13',
      weight: convertWeightInput(String(w), 'kg', unit),
      rpe: i === 0 ? '8' : '',
      saved: i === 0,
      previous: { weightKg: w, reps: 12, rpe: 8 },
    })),
  };
}

// Sólo para el banco de pruebas en web: react-native-web le da a <input> un
// min-width intrínseco (~20 caracteres) que en nativo no existe y que rompe el
// flex de la fila. Lo anulamos para que el preview se parezca al teléfono.
if (typeof document !== 'undefined' && !document.getElementById('preview-fix')) {
  const st = document.createElement('style');
  st.id = 'preview-fix';
  st.textContent = 'input{min-width:0!important}';
  document.head.appendChild(st);
}

export default function Preview() {
  const [units, setUnits] = useState<Record<string, WeightUnit>>({ a: 'kg', b: 'lb' });
  const blocks: WorkoutBlock[] = [
    { key: 'a', supersetGroup: null, exercises: [make('a', 'Press de pecho en máquina', units.a)] },
    { key: 'b', supersetGroup: null, exercises: [make('b', 'Jalón al pecho (polea)', units.b)] },
  ];
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 0 }}>
      {[390, 360, 320].map((w) => (
        <View key={w} style={{ width: w, marginBottom: 24, borderWidth: 1, borderColor: '#444' }}>
          <Text style={{ color: '#888', fontSize: 10, padding: 2 }}>ancho {w}px</Text>
          {blocks.map((b, i) => (
            <BlockCard
              key={`${w}-${b.key}`}
              block={b}
              current={i === 0}
              targetRpe="8"
              onSetValueChange={() => {}}
              onUnitChange={(id, unit) => setUnits((p) => ({ ...p, [id]: unit }))}
              onSaveSet={() => {}}
              onSaveAllSets={() => {}}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
