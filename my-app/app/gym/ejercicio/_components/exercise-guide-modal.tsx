import { memo, useMemo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';

type ExerciseGuideModalProps = {
  visible: boolean;
  onClose: () => void;
  /** El nombre del catálogo, el que usa el entrenador. No el del dataset. */
  name: string;
  imageUrl: string | null;
  instructions: string[] | null;
};

/**
 * Cómo se ejecuta el movimiento: la animación y los pasos, sin salir del día
 * de entrenamiento.
 *
 * Se abre desde la tarjeta y no vive en una pantalla propia a propósito: la
 * duda aparece en mitad de una serie, con el teléfono en una mano, y lo que
 * hace falta ahí es mirar el gif tres segundos y volver a la casilla de reps.
 * Un modal se cierra con el gesto de atrás; una ruta obliga a navegar de vuelta
 * y pierde el estado de lo que se estaba escribiendo.
 */
export const ExerciseGuideModal = memo(function ExerciseGuideModal({
  visible,
  onClose,
  name,
  imageUrl,
  instructions,
}: ExerciseGuideModalProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        <View style={s.topBar}>
          <Text style={s.topTitle}>Cómo se hace</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.name}>{name}</Text>

          {imageUrl && (
            // Fondo blanco fijo, no `c.surface`: la ilustración viene dibujada
            // sobre blanco opaco, así que en tema oscuro un recuadro del color
            // de la tarjeta dejaría un borde blanco flotando alrededor.
            <View style={s.figure}>
              <Image
                source={imageUrl}
                style={s.image}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={150}
                accessibilityLabel={`Animación de ${name}`}
              />
            </View>
          )}

          {instructions?.map((step, i) => (
            <View key={i} style={s.step}>
              <Text style={s.stepNumber}>{i + 1}</Text>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}

          {/* Condición del NOTICE del dataset: la media se usa a 180×180 y con
              la atribución a la vista. */}
          <Text style={s.credit}>Ilustración © Gym visual — gymvisual.com</Text>
        </ScrollView>
      </View>
    </Modal>
  );
});

const createStyles = (c: AppColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
      backgroundColor: c.header,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    topTitle: { color: c.headerText, fontSize: 17, fontWeight: '800' },
    closeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    closeText: { color: c.accent, fontSize: 15, fontWeight: '600' },
    content: { padding: 16, paddingBottom: 40 },
    name: { color: c.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
    figure: {
      alignSelf: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 12,
      padding: 8,
      marginBottom: 20,
    },
    // 240 sobre un original de 180: se agranda para que se lea de un vistazo
    // con el teléfono apoyado, y el interpolado a esa escala no se nota.
    image: { width: 240, height: 240 },
    step: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    stepNumber: {
      color: c.accent,
      fontSize: 13,
      fontWeight: '800',
      width: 18,
      textAlign: 'right',
      lineHeight: 20,
    },
    stepText: { flex: 1, color: c.text, fontSize: 14, lineHeight: 20 },
    credit: {
      color: c.textMuted,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 16,
    },
  });
