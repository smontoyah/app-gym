import { memo, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { RoutineWithExercise } from '@/types/database';
import type { AppColorScheme } from '@/constants/theme';
import { SETS_RANGE } from '../_lib/actions';

export type PrescriptionValues = {
  sets?: number;
  target_reps?: string | null;
  rest_seconds?: number | null;
  cadence?: string | null;
};

type RoutineCardProps = {
  routine: RoutineWithExercise;
  onUpdatePrescription: (routineId: string, values: PrescriptionValues) => void;
  onRemove: (routineId: string, exerciseName: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

export const RoutineCard = memo(function RoutineCard({
  routine,
  onUpdatePrescription,
  onRemove,
  onMoveUp,
  onMoveDown,
}: RoutineCardProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  const [reps, setReps] = useState(routine.target_reps ?? '');
  const [rest, setRest] = useState(routine.rest_seconds != null ? String(routine.rest_seconds) : '');
  const [cadence, setCadence] = useState(routine.cadence ?? '');

  // Si la fila cambia desde el servidor, el editor tiene que reflejarlo.
  useEffect(() => {
    setReps(routine.target_reps ?? '');
    setRest(routine.rest_seconds != null ? String(routine.rest_seconds) : '');
    setCadence(routine.cadence ?? '');
  }, [routine.target_reps, routine.rest_seconds, routine.cadence]);

  const savePrescription = () => {
    const parsedRest = rest.trim() === '' ? null : parseInt(rest, 10);
    onUpdatePrescription(routine.id, {
      target_reps: reps.trim() || null,
      rest_seconds: Number.isFinite(parsedRest as number) ? parsedRest : null,
      cadence: cadence.trim() || null,
    });
    setOpen(false);
  };

  return (
    <View style={s.wrapper}>
      <View style={s.card}>
        <View style={s.reorderButtons}>
          <TouchableOpacity onPress={onMoveUp} disabled={!onMoveUp} style={[s.arrowBtn, !onMoveUp && s.arrowBtnDisabled]}>
            <Text style={s.arrowText}>▲</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onMoveDown} disabled={!onMoveDown} style={[s.arrowBtn, !onMoveDown && s.arrowBtnDisabled]}>
            <Text style={s.arrowText}>▼</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.info} onPress={() => setOpen((v) => !v)} activeOpacity={0.7}>
          <View style={s.nameRow}>
            {routine.superset_group && (
              <View style={s.ssBadge}>
                <Text style={s.ssText}>SS {routine.superset_group}</Text>
              </View>
            )}
            <Text style={s.name}>{routine.exercises.name}</Text>
          </View>
          <Text style={s.muscle}>{routine.exercises.muscle_group}</Text>
          <Text style={s.prescription}>
            {routine.sets} × {routine.target_reps ?? '—'}
            {routine.rest_seconds !== null &&
              ` · ${routine.rest_seconds === 0 ? 'sin descanso' : `${routine.rest_seconds}s`}`}
            {routine.cadence && ` · cad ${routine.cadence}`}
          </Text>
        </TouchableOpacity>

        <View style={s.setsControl}>
          <TouchableOpacity
            onPress={() => onUpdatePrescription(routine.id, { sets: routine.sets - 1 })}
            disabled={routine.sets <= SETS_RANGE.min}
            style={[s.setsBtn, routine.sets <= SETS_RANGE.min && s.setsBtnOff]}
          >
            <Text style={s.setsBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.setsCount}>{routine.sets}</Text>
          <TouchableOpacity
            onPress={() => onUpdatePrescription(routine.id, { sets: routine.sets + 1 })}
            disabled={routine.sets >= SETS_RANGE.max}
            style={[s.setsBtn, routine.sets >= SETS_RANGE.max && s.setsBtnOff]}
          >
            <Text style={s.setsBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => onRemove(routine.id, routine.exercises.name)} style={s.removeBtn}>
          <Text style={s.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {open && (
        <View style={s.editor}>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Reps objetivo</Text>
            <TextInput
              style={s.fieldInput}
              value={reps}
              onChangeText={setReps}
              placeholder="13"
              placeholderTextColor={colors.placeholder}
            />
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Descanso (s)</Text>
            <TextInput
              style={s.fieldInput}
              value={rest}
              onChangeText={setRest}
              keyboardType="numeric"
              placeholder="90"
              placeholderTextColor={colors.placeholder}
            />
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Cadencia</Text>
            <TextInput
              style={s.fieldInput}
              value={cadence}
              onChangeText={setCadence}
              placeholder="1-0-2"
              placeholderTextColor={colors.placeholder}
            />
          </View>
          <TouchableOpacity style={s.saveBtn} onPress={savePrescription}>
            <Text style={s.saveText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    wrapper: { marginBottom: 8 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 12, padding: 14 },
    info: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ssBadge: { backgroundColor: c.warning, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
    ssText: { color: '#000', fontSize: 10, fontWeight: '900' },
    name: { flex: 1, color: c.text, fontSize: 16, fontWeight: '600' },
    muscle: { color: c.accent, fontSize: 12, marginTop: 2 },
    prescription: { color: c.textMuted, fontSize: 12, marginTop: 3 },
    setsControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    setsBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
    setsBtnOff: { opacity: 0.3 },
    setsBtnText: { color: c.text, fontSize: 18, fontWeight: '600' },
    setsCount: { color: c.text, fontSize: 16, fontWeight: '700', minWidth: 20, textAlign: 'center' },
    removeBtn: { marginLeft: 12, padding: 4 },
    removeBtnText: { color: c.danger, fontSize: 16 },
    reorderButtons: { justifyContent: 'center', alignItems: 'center', marginRight: 10, gap: 2 },
    arrowBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    arrowBtnDisabled: { opacity: 0.25 },
    arrowText: { color: c.textSecondary, fontSize: 12 },
    editor: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      gap: 10,
      backgroundColor: c.surfaceSecondary,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      padding: 12,
    },
    field: { flex: 1, minWidth: 84 },
    fieldLabel: { color: c.textMuted, fontSize: 11, marginBottom: 4 },
    fieldInput: {
      backgroundColor: c.surface,
      borderRadius: 8,
      color: c.text,
      fontSize: 15,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    saveBtn: { backgroundColor: c.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 },
    saveText: { color: c.accentText, fontSize: 14, fontWeight: '700' },
  });
