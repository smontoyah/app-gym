import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Cuánto tapa el teclado, medido desde el borde inferior de la ventana; 0 si
 * está cerrado.
 *
 * En Android edge-to-edge el teclado se dibuja encima sin encoger la ventana,
 * así que todo lo que esté anclado abajo hay que apartarlo a mano. Ojo: RN
 * informa el alto ya descontada la barra de navegación (ReactRootView hace
 * `ime - systemBars`), y acá la queremos incluida.
 *
 * No aplica dentro de un <Modal>: a ese diálogo RN le pone ADJUST_RESIZE y se
 * encoge solo en Android. Ahí solo hace falta compensar en iOS.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const onHide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => { onShow.remove(); onHide.remove(); };
  }, []);

  if (height === 0) return 0;
  return Platform.OS === 'android' ? height + insets.bottom : height;
}
