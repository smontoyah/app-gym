import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { supabase } from '@/lib/supabase';
import { passwordChangeProblem } from '../_lib/password';
import type { AppColorScheme } from '@/constants/theme';

type PasswordModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function PasswordModal({ visible, onClose }: PasswordModalProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const s = useMemo(() => createStyles(colors), [colors]);
  const overlayInset = useKeyboardHeight();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    const problem = passwordChangeProblem({ current, next, confirm });
    if (problem) {
      setError(problem);
      return;
    }
    if (!user?.email) return;

    setBusy(true);
    setError(null);

    // Supabase no pide la contraseña actual para cambiarla: la verificamos
    // nosotros, para que no baste con tener el celular desbloqueado.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (signInError) {
      setBusy(false);
      setError(
        signInError.code === 'invalid_credentials'
          ? 'La contraseña actual no es correcta.'
          : signInError.message,
      );
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    close();
    Alert.alert('Contraseña actualizada', 'La próxima vez que ingreses, usá la nueva.');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={[s.overlay, { paddingBottom: 20 + overlayInset }]}>
        <View style={s.sheet}>
          <Text style={s.title}>Cambiar contraseña</Text>

          <View style={s.fields}>
            <View>
              <Text style={s.fieldLabel}>Contraseña actual</Text>
              <TextInput
                style={s.input}
                value={current}
                onChangeText={setCurrent}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
              />
            </View>
            <View>
              <Text style={s.fieldLabel}>Nueva contraseña</Text>
              <TextInput
                style={s.input}
                value={next}
                onChangeText={setNext}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
              />
            </View>
            <View>
              <Text style={s.fieldLabel}>Confirmar nueva contraseña</Text>
              <TextInput
                style={s.input}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
              />
            </View>
          </View>

          {error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity
            style={[s.primaryBtn, busy && s.primaryBtnDisabled]}
            onPress={handleSave}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <Text style={s.primaryText}>Guardar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={close} disabled={busy}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>
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
    fields: { gap: 12, marginTop: 16 },
    fieldLabel: { color: c.textMuted, fontSize: 11, marginBottom: 4 },
    input: {
      backgroundColor: c.surfaceSecondary,
      borderRadius: 8,
      color: c.text,
      fontSize: 15,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    error: { color: c.danger, fontSize: 12, marginTop: 10 },
    primaryBtn: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 18,
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryText: { color: c.accentText, fontSize: 15, fontWeight: '700' },
    cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    cancelText: { color: c.textMuted, fontSize: 14, fontWeight: '600' },
  });
