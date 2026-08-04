import { memo, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { TrainingPhase } from '@/types/database';
import type { AppColorScheme } from '@/constants/theme';

type PhaseBannerProps = { phase: TrainingPhase | null };

/** Encabezado de la fase: RPE / RIR / método y el calentamiento del PDF. */
export const PhaseBanner = memo(function PhaseBanner({ phase }: PhaseBannerProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  if (!phase) return null;

  return (
    <View style={s.card}>
      <Text style={s.name}>{phase.name}</Text>
      <View style={s.chips}>
        {phase.rpe_target && (
          <View style={s.chip}>
            <Text style={s.chipText}>RPE {phase.rpe_target}</Text>
          </View>
        )}
        {phase.rir_target && (
          <View style={s.chip}>
            <Text style={s.chipText}>RIR {phase.rir_target}</Text>
          </View>
        )}
        {phase.method && (
          <View style={s.chip}>
            <Text style={s.chipText}>{phase.method}</Text>
          </View>
        )}
      </View>

      {phase.warmup && (
        <>
          <TouchableOpacity onPress={() => setOpen((v) => !v)} style={s.toggle}>
            <Text style={s.toggleText}>{open ? '▾' : '▸'} Calentamiento</Text>
          </TouchableOpacity>
          {open && <Text style={s.warmup}>{phase.warmup}</Text>}
        </>
      )}
    </View>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    name: { color: c.text, fontSize: 15, fontWeight: '800' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    chip: { backgroundColor: c.accentBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { color: c.accent, fontSize: 12, fontWeight: '700' },
    toggle: { marginTop: 10 },
    toggleText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    warmup: { color: c.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 19 },
  });
