import { memo, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Section } from '@/components/stats/section';
import { ChipRow, type ChipOption } from '@/components/stats/chip-row';
import { SORTS, type SortKey } from '../_lib/analysis';
import type { AppColorScheme } from '@/constants/theme';

/** Sentinela del chip «Todos»: ningún grupo muscular se llama así. */
const ALL = '__all__';

type FilterBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  /** Sólo los grupos presentes en el período: un filtro que no filtra estorba. */
  muscles: string[];
  muscle: string | null;
  onMuscleChange: (muscle: string | null) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  shown: number;
  total: number;
};

export const FilterBar = memo(function FilterBar({
  query,
  onQueryChange,
  muscles,
  muscle,
  onMuscleChange,
  sort,
  onSortChange,
  shown,
  total,
}: FilterBarProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const muscleOptions = useMemo<ChipOption<string>[]>(
    () => [{ key: ALL, label: 'Todos' }, ...muscles.map((group) => ({ key: group, label: group }))],
    [muscles]
  );

  return (
    <Section title="Ejercicios" hint={shown === total ? `${total}` : `${shown} de ${total}`}>
      <View style={s.searchBox}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.input}
          value={query}
          onChangeText={onQueryChange}
          placeholder="Buscar ejercicio o grupo"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => onQueryChange('')} hitSlop={8}>
            <Text style={s.clear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {muscles.length > 1 && (
        <View style={s.filterRow}>
          <ChipRow
            options={muscleOptions}
            selected={muscle ?? ALL}
            onSelect={(key) => onMuscleChange(key === ALL ? null : key)}
            size="sm"
          />
        </View>
      )}

      <View style={s.sortRow}>
        <Text style={s.sortLabel}>Orden</Text>
        <View style={s.sortChips}>
          <ChipRow options={SORTS} selected={sort} onSelect={onSortChange} size="sm" />
        </View>
      </View>
    </Section>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.surfaceSecondary,
      borderRadius: 10,
      paddingHorizontal: 12,
    },
    searchIcon: { fontSize: 13 },
    input: { flex: 1, color: c.text, fontSize: 14, paddingVertical: 10 },
    clear: { color: c.textMuted, fontSize: 14, paddingHorizontal: 2 },
    filterRow: { marginTop: 10 },
    sortRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
    sortLabel: { color: c.textMuted, fontSize: 11, fontWeight: '600' },
    sortChips: { flex: 1 },
  });
