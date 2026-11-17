import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { NOTE_MAX_LENGTH } from '@/lib/workout-notes';
import type { AppColorScheme } from '@/constants/theme';

type ExerciseNoteModalProps = {
  /** Nombre del ejercicio, para saber a cuál se le está escribiendo. */
  name: string;
  /** Nota guardada de este ejercicio en la fecha que se está viendo. */
  initialNote: string | null;
  onClose: () => void;
  /**
   * Guarda (o borra, con texto vacío). Devuelve un mensaje si falló: el modal
   * se queda abierto con lo escrito para no perderlo.
   */
  onSave: (text: string) => Promise<string | null>;
};

/**
 * Observación del ejercicio en el día: lo que los números no explican.
 *
 * Se monta solo cuando está abierto (ver ExerciseCard), así que el estado del
 * texto nace de la nota guardada cada vez que se abre.
 */
export function ExerciseNoteModal({ name, initialNote, onClose, onSave }: ExerciseNoteModalProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const overlayInset = useKeyboardHeight();

  const [text, setText] = useState(initialNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (value: string) => {
    setBusy(true);
    setError(null);
    const problem = await onSave(value);
    setBusy(false);
    if (problem) setError(problem);
    else onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[s.overlay, { paddingBottom: 20 + overlayInset }]}>
        <View style={s.sheet}>
          <Text style={s.title}>Observaciones</Text>
          <Text style={s.subtitle}>{name}</Text>

          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            maxLength={NOTE_MAX_LENGTH}
            textAlignVertical="top"
            placeholder="Cambio de máquina, molestia, menos peso en la serie 3…"
            placeholderTextColor={colors.placeholder}
            editable={!busy}
          />
          <Text style={s.hint}>
            Va como nota en el Sheet de Ciro · {text.length}/{NOTE_MAX_LENGTH}
          </Text>

          {error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity
            style={[s.primaryBtn, busy && s.primaryBtnDisabled]}
            onPress={() => submit(text)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <Text style={s.primaryText}>Guardar</Text>
            )}
          </TouchableOpacity>

          <View style={s.secondaryRow}>
            {initialNote !== null && (
              <TouchableOpacity style={s.secondaryBtn} onPress={() => submit('')} disabled={busy}>
                <Text style={s.deleteText}>Borrar nota</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.secondaryBtn} onPress={onClose} disabled={busy}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    sheet: { backgroundColor: c.surface, borderRadius: 16, padding: 20 },
    title: { color: c.text, fontSize: 18, fontWeight: '800' },
    subtitle: { color: c.accent, fontSize: 13, marginTop: 2 },
    input: {
      backgroundColor: c.surfaceSecondary,
      borderRadius: 8,
      color: c.text,
      fontSize: 15,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginTop: 14,
      minHeight: 110,
      maxHeight: 220,
    },
    hint: { color: c.textMuted, fontSize: 11, marginTop: 6 },
    error: { color: c.danger, fontSize: 12, marginTop: 10 },
    primaryBtn: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 16,
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryText: { color: c.accentText, fontSize: 15, fontWeight: '700' },
    secondaryRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 4 },
    secondaryBtn: { paddingVertical: 12, paddingHorizontal: 4 },
    deleteText: { color: c.danger, fontSize: 14, fontWeight: '600' },
    cancelText: { color: c.textMuted, fontSize: 14, fontWeight: '600' },
  });
