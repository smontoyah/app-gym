import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import { Field } from '@/components/nutricion/field';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { GOAL_FIELDS, GOAL_LABELS, GOAL_UNITS, fetchGoals, saveGoals, type GoalField } from '@/lib/nutricion/diario';
import { parseNum } from '@/lib/nutricion/actions';

type Draft = Record<GoalField, string>;
const EMPTY = Object.fromEntries(GOAL_FIELDS.map((f) => [f, ''])) as Draft;

export default function ObjetivosScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { goals } = await fetchGoals();
    if (!goals) return;
    setDraft(
      Object.fromEntries(
        GOAL_FIELDS.map((f) => [f, goals[f] == null ? '' : String(goals[f])])
      ) as Draft
    );
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    setSaving(true);
    const values = Object.fromEntries(
      GOAL_FIELDS.map((f) => [f, parseNum(draft[f])])
    ) as Record<GoalField, number | null>;
    const { error } = await saveGoals(values);
    setSaving(false);
    Alert.alert(error ? 'No se pudo guardar' : 'Listo', error ?? 'Objetivo actualizado.');
  };

  // Referencia útil: las calorías que implican los macros escritos. Si no
  // cuadra con la meta de kcal, es que algo está mal tipeado.
  const impliedKcal =
    (parseNum(draft.protein_g) ?? 0) * 4 +
    (parseNum(draft.carbs_g) ?? 0) * 4 +
    (parseNum(draft.fat_g) ?? 0) * 9;
  const goalKcal = parseNum(draft.energy_kcal);
  const mismatch = !!goalKcal && impliedKcal > 0 && Math.abs(impliedKcal - goalKcal) > goalKcal * 0.05;

  return (
    <KeyboardAwareScrollView style={s.flex} contentContainerStyle={s.content}>
      <Text style={s.intro}>
        Tu meta diaria. Dejá en blanco lo que no quieras seguir: solo se muestran
        en el diario los que tengan valor.
      </Text>

      {GOAL_FIELDS.map((f) => (
        <Field
          key={f}
          label={GOAL_LABELS[f]}
          value={draft[f]}
          onChange={(v) => setDraft((d) => ({ ...d, [f]: v }))}
          numeric
          suffix={GOAL_UNITS[f]}
        />
      ))}

      {impliedKcal > 0 && (
        <View style={[s.check, mismatch && s.checkWarn]}>
          <Text style={s.checkText}>
            Los macros que escribiste suman {Math.round(impliedKcal)} kcal
            {' '}(proteína y carbos ×4, grasa ×9)
            {mismatch ? `, que no cuadra con las ${goalKcal} kcal de la meta.` : '.'}
          </Text>
        </View>
      )}

      <TouchableOpacity style={[s.primary, saving && s.disabled]} onPress={handleSave} disabled={saving}>
        <Text style={s.primaryText}>{saving ? 'Guardando…' : 'Guardar objetivo'}</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 48 },
    intro: { color: c.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 20 },
    check: { backgroundColor: c.accentBg, borderRadius: 8, padding: 12, marginTop: 4 },
    checkWarn: { backgroundColor: c.warningBg },
    checkText: { color: c.text, fontSize: 12, lineHeight: 17 },
    primary: { backgroundColor: c.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
    primaryText: { color: c.accentText, fontSize: 16, fontWeight: '700' },
    disabled: { opacity: 0.45 },
  });
