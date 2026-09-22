import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import type { GoalProfile } from '@/types/database';
import { Field } from '@/components/nutricion/field';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { fetchGoals, saveGoals } from '@/lib/nutricion/diario';
import {
  GOAL_FIELDS,
  GOAL_INPUT_UNITS,
  GOAL_LABELS,
  GOAL_PROFILES,
  isPerKg,
  PER_KG_COLUMN,
  PROFILE_LABELS,
  type GoalField,
} from '@/lib/nutricion/objetivos';
import { formatKg } from '@/lib/nutricion/peso';
import { parseNum } from '@/lib/nutricion/actions';

type Draft = Record<GoalField, string>;
const EMPTY: Draft = Object.fromEntries(GOAL_FIELDS.map((f) => [f, ''])) as Draft;

/** Un borrador por perfil: se editan los dos sin recargar la pantalla. */
type Drafts = Record<GoalProfile, Draft>;
const EMPTY_DRAFTS: Drafts = { normal: { ...EMPTY }, ciclado: { ...EMPTY } };

export default function ObjetivosScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [drafts, setDrafts] = useState<Drafts>(EMPTY_DRAFTS);
  const [profile, setProfile] = useState<GoalProfile>('normal');
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { byProfile, weightKg } = await fetchGoals();
    setWeightKg(weightKg);
    setDrafts(
      Object.fromEntries(
        GOAL_PROFILES.map((p) => {
          const row = byProfile[p];
          return [
            p,
            Object.fromEntries(
              GOAL_FIELDS.map((f) => {
                // Los macros se editan en g/kg: lo que se muestra es el ratio
                // guardado, no el gramaje. El gramaje va debajo, calculado.
                const value = row ? (isPerKg(f) ? row[PER_KG_COLUMN[f]] : row[f]) : null;
                return [f, value == null ? '' : String(value)];
              })
            ),
          ];
        })
      ) as Drafts
    );
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const draft = drafts[profile];
  const setField = (f: GoalField, v: string) =>
    setDrafts((d) => ({ ...d, [profile]: { ...d[profile], [f]: v } }));

  /** Lo escrito, ya en gramos. Es contra esto que se hace toda lectura. */
  const resolved = useMemo(() => {
    const out = Object.fromEntries(GOAL_FIELDS.map((f) => [f, null])) as Record<
      GoalField,
      number | null
    >;
    for (const f of GOAL_FIELDS) {
      const n = parseNum(draft[f]);
      if (n === null) continue;
      out[f] = isPerKg(f)
        ? weightKg !== null && weightKg > 0
          ? Math.round(n * weightKg * 10) / 10
          : null
        : n;
    }
    return out;
  }, [draft, weightKg]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await saveGoals(profile, {
      energy_kcal: parseNum(draft.energy_kcal),
      protein_g_kg: parseNum(draft.protein_g),
      carbs_g_kg: parseNum(draft.carbs_g),
      fat_g_kg: parseNum(draft.fat_g),
      fiber_g: parseNum(draft.fiber_g),
    });
    setSaving(false);
    Alert.alert(
      error ? 'No se pudo guardar' : 'Listo',
      error ?? `${PROFILE_LABELS[profile]} actualizado.`
    );
  };

  // Referencia útil: las calorías que implican los macros escritos. Corre sobre
  // los gramos RESUELTOS, no sobre los g/kg — con el ratio daría unas 21 kcal.
  const impliedKcal =
    (resolved.protein_g ?? 0) * 4 + (resolved.carbs_g ?? 0) * 4 + (resolved.fat_g ?? 0) * 9;
  const goalKcal = resolved.energy_kcal;
  const mismatch =
    !!goalKcal && impliedKcal > 0 && Math.abs(impliedKcal - goalKcal) > goalKcal * 0.05;

  return (
    <KeyboardAwareScrollView style={s.flex} contentContainerStyle={s.content}>
      <View style={s.profiles}>
        {GOAL_PROFILES.map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.profile, profile === p && s.profileOn]}
            onPress={() => setProfile(p)}>
            <Text style={[s.profileText, profile === p && s.profileTextOn]}>
              {PROFILE_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.intro}>
        Proteína, carbos y grasa se escriben por kilo de peso corporal; calorías
        y fibra, en total. Dejá en blanco lo que no quieras seguir.
      </Text>

      {weightKg === null ? (
        <TouchableOpacity style={s.warn} onPress={() => router.push('/nutricion/peso')}>
          <Text style={s.warnText}>
            Todavía no registraste un peso, así que los g/kg no se pueden
            convertir a gramos. Registrá tu peso →
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={s.weight}>Se calcula con tu último peso: {formatKg(weightKg)} kg</Text>
      )}

      {GOAL_FIELDS.map((f) => (
        <View key={f}>
          <Field
            label={GOAL_LABELS[f]}
            value={draft[f]}
            onChange={(v) => setField(f, v)}
            numeric
            suffix={GOAL_INPUT_UNITS[f]}
          />
          {/* La cuenta hecha, para no tener que confiar en ella a ciegas. */}
          {isPerKg(f) && resolved[f] !== null && weightKg !== null && (
            <Text style={s.resolved}>
              {draft[f]} g/kg × {formatKg(weightKg)} kg = {resolved[f]} g por día
            </Text>
          )}
        </View>
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
        <Text style={s.primaryText}>
          {saving ? 'Guardando…' : `Guardar ${PROFILE_LABELS[profile].toLowerCase()}`}
        </Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 48 },
    profiles: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    profile: {
      flex: 1, paddingVertical: 9, borderRadius: 18, alignItems: 'center',
      borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
    },
    profileOn: { backgroundColor: c.accent, borderColor: c.accent },
    profileText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    profileTextOn: { color: c.accentText },
    intro: { color: c.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 12 },
    weight: { color: c.textMuted, fontSize: 12, marginBottom: 16 },
    warn: { backgroundColor: c.warningBg, borderRadius: 8, padding: 12, marginBottom: 16 },
    warnText: { color: c.text, fontSize: 12, lineHeight: 17 },
    resolved: { color: c.textMuted, fontSize: 11, marginTop: -8, marginBottom: 12 },
    check: { backgroundColor: c.accentBg, borderRadius: 8, padding: 12, marginTop: 4 },
    checkWarn: { backgroundColor: c.warningBg },
    checkText: { color: c.text, fontSize: 12, lineHeight: 17 },
    primary: { backgroundColor: c.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
    primaryText: { color: c.accentText, fontSize: 16, fontWeight: '700' },
    disabled: { opacity: 0.45 },
  });
