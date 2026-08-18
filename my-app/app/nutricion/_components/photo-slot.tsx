import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';
import type { Shot } from '../_lib/scan';

type Props = {
  title: string;
  hint: string;
  shot: Shot | null;
  disabled?: boolean;
  onPick: (from: 'camera' | 'library') => void;
  onClear: () => void;
};

export function PhotoSlot({ title, hint, shot, disabled, onPick, onClear }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.title}>{title}</Text>
        {shot && <Text style={s.size}>{Math.round(shot.bytes / 1024)} KB</Text>}
      </View>

      {shot ? (
        <View>
          <Image source={{ uri: shot.uri }} style={s.preview} contentFit="cover" />
          <TouchableOpacity style={s.clear} onPress={onClear} disabled={disabled}>
            <Text style={s.clearText}>Repetir</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.empty}>
          <Text style={s.hint}>{hint}</Text>
          <View style={s.buttons}>
            <TouchableOpacity
              style={[s.btn, s.btnPrimary]}
              onPress={() => onPick('camera')}
              disabled={disabled}>
              <Text style={s.btnPrimaryText}>Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btn} onPress={() => onPick('library')} disabled={disabled}>
              <Text style={s.btnText}>Galería</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    wrap: { marginBottom: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { color: c.text, fontSize: 15, fontWeight: '600' },
    size: { color: c.textMuted, fontSize: 12 },
    preview: { width: '100%', height: 180, borderRadius: 10, backgroundColor: c.surfaceSecondary },
    clear: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4 },
    clearText: { color: c.accent, fontSize: 13, fontWeight: '600' },
    empty: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.borderDashed,
      borderRadius: 10,
      padding: 16,
      alignItems: 'center',
      backgroundColor: c.surface,
    },
    hint: { color: c.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 12 },
    buttons: { flexDirection: 'row', gap: 10 },
    btn: {
      paddingVertical: 9,
      paddingHorizontal: 18,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceSecondary,
    },
    btnText: { color: c.text, fontSize: 14, fontWeight: '600' },
    btnPrimary: { backgroundColor: c.accent, borderColor: c.accent },
    btnPrimaryText: { color: c.accentText, fontSize: 14, fontWeight: '600' },
  });
