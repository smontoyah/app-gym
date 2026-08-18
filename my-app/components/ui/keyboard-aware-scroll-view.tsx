import { ScrollView, type ScrollViewProps } from 'react-native';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';

/**
 * ScrollView que reserva abajo el alto del teclado, para que el campo que se
 * está escribiendo siempre se pueda traer a la vista.
 *
 * Reemplaza a KeyboardAvoidingView, que acá no servía: en Android edge-to-edge
 * el teclado se superpone a la ventana en vez de encogerla, así que la vista
 * nunca se entera de que la taparon (y en `behavior={undefined}` no hacía nada).
 */
export function KeyboardAwareScrollView({ contentContainerStyle, ...props }: ScrollViewProps) {
  const keyboardHeight = useKeyboardHeight();

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      {...props}
      contentContainerStyle={[
        contentContainerStyle,
        keyboardHeight > 0 && { paddingBottom: keyboardHeight },
      ]}
    />
  );
}
