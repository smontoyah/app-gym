import { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ExerciseCard } from './exercise-card';
import type { SetField } from './set-row';
import type { WorkoutBlock } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

type BlockCardProps = {
  block: WorkoutBlock;
  targetRpe: string | null;
  onSetValueChange: (exerciseId: string, setIndex: number, field: SetField, value: string) => void;
  onSaveSet: (exerciseId: string, setNumber: number, reps: string, weight: string, rpe: string) => void;
  onSaveAllSets: (
    exerciseId: string,
    sets: { setNumber: number; reps: string; weight: string; rpe: string }[]
  ) => void;
};

/**
 * Una super serie es una unidad de ejecución, no dos ejercicios sueltos:
 * se rendericen juntos y en el orden del plan, sin descanso entre medio.
 */
export const BlockCard = memo(function BlockCard({
  block,
  targetRpe,
  onSetValueChange,
  onSaveSet,
  onSaveAllSets,
}: BlockCardProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const isSuperset = block.supersetGroup !== null && block.exercises.length > 1;

  return (
    <View style={[s.card, isSuperset && s.superset]}>
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
