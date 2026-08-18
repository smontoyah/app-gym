import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Alto del teclado abierto, 0 cuando está cerrado. En Android edge-to-edge —y
 * siempre en iOS— el teclado se dibuja encima de la ventana en vez de
 * encogerla, así que lo que esté anclado abajo hay que apartarlo a mano.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const onHide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => { onShow.remove(); onHide.remove(); };
  }, []);

  return height;
}
