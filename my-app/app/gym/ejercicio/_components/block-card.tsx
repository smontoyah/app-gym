import { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { WeightUnit } from '@/lib/units';
import { ExerciseCard } from './exercise-card';
import type { SetField } from './set-row';
import type { SetInput, WorkoutBlock } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

type BlockCardProps = {
  block: WorkoutBlock;
  /** Primer bloque con series pendientes: el que toca ahora. */
  current: boolean;
  targetRpe: string | null;
  onSetValueChange: (exerciseId: string, setIndex: number, field: SetField, value: string) => void;
  onUnitChange: (exerciseId: string, unit: WeightUnit) => void;
  onSaveSet: (exerciseId: string, set: SetInput, unit: WeightUnit) => void;
  onSaveAllSets: (exerciseId: string, sets: SetInput[], unit: WeightUnit) => void;
};

/**
 * Una super serie es una unidad de ejecución, no dos ejercicios sueltos:
 * se rendericen juntos y en el orden del plan, sin descanso entre medio.
 */
export const BlockCard = memo(function BlockCard({
  block,
  current,
  targetRpe,
  onSetValueChange,
  onUnitChange,
  onSaveSet,
  onSaveAllSets,
}: BlockCardProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const isSuperset = block.supersetGroup !== null && block.exercises.length > 1;

  return (
    <View style={[s.card, isSuperset && s.superset, current && s.current]}>
      {current && (
        <View style={s.currentHeader}>
          <View style={s.currentDot} />
          <Text style={s.currentLabel}>En curso</Text>
        </View>
      )}

      {isSuperset && (
        <View style={s.supersetHeader}>
          <Text style={s.supersetTitle}>Super serie {block.supersetGroup}</Text>
          <Text style={s.supersetHint}>sin descanso entre ejercicios</Text>
        </View>
      )}

      {block.exercises.map((exercise, i) => (
        <View key={exercise.id} style={i > 0 ? s.spaced : undefined}>
          <ExerciseCard
            exercise={exercise}
            targetRpe={targetRpe}
            positionLabel={isSuperset ? `${block.supersetGroup}${i + 1}` : undefined}
            onSetValueChange={onSetValueChange}
            onUnitChange={onUnitChange}
            onSaveSet={onSaveSet}
            onSaveAllSets={onSaveAllSets}
          />
        </View>
      ))}
    </View>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 16 },
    superset: { borderWidth: 1, borderColor: c.warning },
    current: { borderWidth: 1, borderColor: c.accent },
    currentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    currentDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent },
    currentLabel: { color: c.accent, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
    supersetHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 },
    supersetTitle: { color: c.warning, fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
    supersetHint: { color: c.textMuted, fontSize: 11 },
    spaced: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderDashed,
    },
  });
