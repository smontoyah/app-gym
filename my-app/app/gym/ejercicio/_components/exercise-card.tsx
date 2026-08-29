import { memo, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { labelWeight, type WeightUnit } from '@/lib/units';
import { ExerciseGuideModal } from './exercise-guide-modal';
import { SetRow, type SetField } from './set-row';
import { WeightUnitToggle } from './weight-unit-toggle';
import type { ExerciseWithSets, LoadSuggestion, SetInput } from '../_lib/types';
import type { AppColorScheme } from '@/constants/theme';

type ExerciseCardProps = {
  exercise: ExerciseWithSets;
  /** RPE objetivo de la fase, usado como placeholder. */
  targetRpe: string | null;
  /** Etiqueta dentro de una super serie: 'A1', 'A2'… */
  positionLabel?: string;
  onSetValueChange: (exerciseId: string, setIndex: number, field: SetField, value: string) => void;
  onUnitChange: (exerciseId: string, unit: WeightUnit) => void;
  onSaveSet: (exerciseId: string, set: SetInput, unit: WeightUnit) => void;
  onSaveAllSets: (exerciseId: string, sets: SetInput[], unit: WeightUnit) => void;
};

/** La sugerencia se calcula en kg y se dice en la unidad que se está usando. */
function suggestionText(suggestion: LoadSuggestion, unit: WeightUnit): string {
  const load = labelWeight(suggestion.weightKg, unit);
  switch (suggestion.action) {
    case 'increase':
      return `Sugerido: subí a ${load}`;
    case 'hold-rpe':
      return `Sugerido: mantené ${load} (RPE por encima del objetivo)`;
    case 'hold-reps':
      return `Sugerido: mantené ${load} hasta completar ${suggestion.targetReps} reps`;
  }
}

export const ExerciseCard = memo(function ExerciseCard({
  exercise,
  targetRpe,
  positionLabel,
  onSetValueChange,
  onUnitChange,
  onSaveSet,
  onSaveAllSets,
}: ExerciseCardProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [guideOpen, setGuideOpen] = useState(false);

  const { name, muscle_group, image_url, instructions } = exercise.exercises;
  // Un ejercicio sin vincular al dataset —o vinculado a uno que el dataset no
  // ilustra— sigue siendo un ejercicio normal: simplemente no abre la guía.
  const hasGuide = image_url !== null || (instructions?.length ?? 0) > 0;

  const unsavedWithData = useMemo(
    () => exercise.sets_data.filter((st) => !st.saved && st.reps !== '' && st.weight !== ''),
    [exercise.sets_data]
  );

  const done = exercise.sets_data.length > 0 && exercise.sets_data.every((st) => st.saved);

  return (
    <View style={[s.root, done && s.rootDone]}>
      {/* Todo el encabezado abre la guía, no un botón aparte: es el área que
          uno ya mira para saber qué ejercicio toca, y con una mano ocupada
          conviene que el blanco sea grande. */}
      <TouchableOpacity
        style={s.header}
        onPress={() => setGuideOpen(true)}
        disabled={!hasGuide}
        activeOpacity={0.7}
      >
        {image_url && (
          <View style={s.thumbFrame}>
            {/* Sin animar en la lista: seis tarjetas animando a la vez no
                aportan nada y calientan el teléfono en mitad de la sesión.
                El movimiento se ve al abrir la guía. */}
            <Image
              source={image_url}
              style={s.thumb}
              contentFit="contain"
              autoplay={false}
              cachePolicy="memory-disk"
              transition={0}
            />
          </View>
        )}
        <View style={s.headerText}>
          <View style={s.titleRow}>
            {positionLabel && (
              <View style={s.positionBadge}>
                <Text style={s.positionText}>{positionLabel}</Text>
              </View>
            )}
            <Text style={s.name}>{name}</Text>
          </View>
          <Text style={s.muscle}>
            {muscle_group}
            {hasGuide && <Text style={s.guideLink}>  ·  cómo se hace</Text>}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Prescripción del entrenador, tal cual el PDF */}
      <View style={s.chips}>
        <View style={s.chip}>
          <Text style={s.chipText}>
            {exercise.sets} × {exercise.target_reps ?? '—'}
          </Text>
        </View>
        {exercise.rest_seconds !== null && (
          <View style={s.chip}>
            <Text style={s.chipText}>
              {exercise.rest_seconds === 0 ? 'sin descanso' : `${exercise.rest_seconds}s`}
            </Text>
          </View>
        )}
        {exercise.cadence && (
          <View style={s.chip}>
            <Text style={s.chipText}>cadencia {exercise.cadence}</Text>
          </View>
        )}
      </View>

      {exercise.notes && <Text style={s.notes}>{exercise.notes}</Text>}
      {exercise.suggestion && !done && (
        <Text style={s.suggestion}>{suggestionText(exercise.suggestion, exercise.weightUnit)}</Text>
      )}

      <View style={s.setsHeader}>
        <Text style={[s.label, s.labelSet]}>#</Text>
        <Text style={s.label}>Reps</Text>
        <WeightUnitToggle
          unit={exercise.weightUnit}
          onChange={(unit) => onUnitChange(exercise.exercise_id, unit)}
        />
        <Text style={[s.label, s.labelRpe]}>RPE</Text>
        <View style={s.labelSpacer} />
      </View>

      {exercise.sets_data.map((set, setIndex) => (
        <SetRow
          key={set.set_number}
          set={set}
          setIndex={setIndex}
          exerciseId={exercise.exercise_id}
          unit={exercise.weightUnit}
          targetReps={exercise.target_reps}
          targetRpe={targetRpe}
          onValueChange={onSetValueChange}
          onSave={onSaveSet}
        />
      ))}

      {unsavedWithData.length > 0 && (
        <TouchableOpacity
          style={s.saveAllBtn}
          onPress={() =>
            onSaveAllSets(
              exercise.exercise_id,
              unsavedWithData.map((st) => ({
                setNumber: st.set_number,
                reps: st.reps,
                weight: st.weight,
                rpe: st.rpe,
              })),
              exercise.weightUnit
            )
          }
        >
          <Text style={s.saveAllText}>Guardar todas ({unsavedWithData.length})</Text>
        </TouchableOpacity>
      )}

      {/* Montado sólo cuando se abre: si no, cada día de rutina cargaría media
          docena de modales invisibles a la espera de un toque que casi nunca
          llega. */}
      {guideOpen && (
        <ExerciseGuideModal
          visible
          onClose={() => setGuideOpen(false)}
          name={name}
          imageUrl={image_url}
          instructions={instructions}
        />
      )}
    </View>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    root: { gap: 2 },
    rootDone: { opacity: 0.55 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    // Blanco fijo y no `c.surface`: la ilustración viene dibujada sobre blanco
    // opaco, así que en tema oscuro cualquier otro color deja un marco visible.
    thumbFrame: { backgroundColor: '#ffffff', borderRadius: 8, padding: 2 },
    thumb: { width: 44, height: 44 },
    headerText: { flex: 1 },
    guideLink: { color: c.textSecondary, fontWeight: '600' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    positionBadge: {
      backgroundColor: c.warning,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    positionText: { color: '#000', fontSize: 11, fontWeight: '900' },
    name: { flex: 1, color: c.text, fontSize: 17, fontWeight: '700' },
    muscle: { color: c.accent, fontSize: 13, marginTop: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    chip: { backgroundColor: c.accentBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { color: c.accent, fontSize: 12, fontWeight: '700' },
    notes: { color: c.warning, fontSize: 12, marginBottom: 8 },
    suggestion: { color: c.textSecondary, fontSize: 12, fontStyle: 'italic', marginBottom: 8 },
    setsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
    label: { flex: 1, color: c.textMuted, fontSize: 11, textAlign: 'center' },
    labelSet: { width: 18, flex: 0 },
    labelRpe: { flex: 0.8 },
    labelSpacer: { width: 38 },
    saveAllBtn: { marginTop: 6, backgroundColor: c.accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    saveAllText: { color: c.accentText, fontSize: 14, fontWeight: '700' },
  });
