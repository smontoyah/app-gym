import { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { RoutineWithExercise } from '@/types/database';
import type { AppColorScheme } from '@/constants/theme';

type RoutineCardProps = {
  routine: RoutineWithExercise;
  onUpdateSets: (routineId: string, sets: number) => void;
  onRemove: (routineId: string, exerciseName: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

export const RoutineCard = memo(function RoutineCard({ routine, onUpdateSets, onRemove, onMoveUp, onMoveDown }: RoutineCardProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={s.card}>
      <View style={s.reorderButtons}>
        <TouchableOpacity onPress={onMoveUp} disabled={!onMoveUp} style={[s.arrowBtn, !onMoveUp && s.arrowBtnDisabled]}>
          <Text style={s.arrowText}>▲</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onMoveDown} disabled={!onMoveDown} style={[s.arrowBtn, !onMoveDown && s.arrowBtnDisabled]}>
          <Text style={s.arrowText}>▼</Text>
        </TouchableOpacity>
      </View>
      <View style={s.info}>
        <Text style={s.name}>{routine.exercises.name}</Text>
        <Text style={s.muscle}>{routine.exercises.muscle_group}</Text>
      </View>
      <View style={s.setsControl}>
        <TouchableOpacity onPress={() => onUpdateSets(routine.id, routine.sets - 1)} style={s.setsBtn}>
          <Text style={s.setsBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={s.setsCount}>{routine.sets}</Text>
        <TouchableOpacity onPress={() => onUpdateSets(routine.id, routine.sets + 1)} style={s.setsBtn}>
          <Text style={s.setsBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => onRemove(routine.id, routine.exercises.name)} style={s.removeBtn}>
        <Text style={s.removeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
    info: { flex: 1 },
    name: { color: c.text, fontSize: 16, fontWeight: '600' },
    muscle: { color: c.accent, fontSize: 12, marginTop: 2 },
    setsControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    setsBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
    setsBtnText: { color: c.text, fontSize: 18, fontWeight: '600' },
    setsCount: { color: c.text, fontSize: 16, fontWeight: '700', minWidth: 20, textAlign: 'center' },
    removeBtn: { marginLeft: 12, padding: 4 },
    removeBtnText: { color: c.danger, fontSize: 16 },
    reorderButtons: { justifyContent: 'center', alignItems: 'center', marginRight: 10, gap: 2 },
    arrowBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    arrowBtnDisabled: { opacity: 0.25 },
    arrowText: { color: c.textSecondary, fontSize: 12 },
  });
