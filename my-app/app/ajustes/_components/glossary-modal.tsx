import { useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { AppColorScheme } from '@/constants/theme';

/** Escala de esfuerzo percibido, tal cual la define el protocolo. */
const RPE_SCALE: [string, string][] = [
  ['10', 'Máximo esfuerzo'],
  ['9', 'Muy intenso'],
  ['7-8', 'Intenso'],
  ['4-6', 'Moderado'],
  ['1-3', 'Muy fácil'],
];

/** Correlación RPE ↔ repeticiones en reserva. */
const RPE_TO_RIR: [string, string][] = [
  ['10', '0 — fallo muscular'],
  ['9', '1 rep en reserva'],
  ['8-7', '2-3 reps en reserva'],
  ['6-4', '4-6 reps en reserva'],
];

const CONCEPTS: { term: string; body: string }[] = [
  {
    term: 'Super serie',
    body: 'Combinar dos ejercicios seguidos sin aplicar descanso entre ellos.',
  },
  {
    term: 'DS — Series descendentes',
    body: 'Realizar una serie hasta el número de repeticiones propuesto, luego reducir el peso un 20-25 % y, sin descanso, seguir hasta el fallo muscular.',
  },
  {
    term: 'FM — Fallo muscular',
    body: 'Situación en la que los músculos no consiguen efectuar correctamente una repetición más por el cansancio y el estrés acumulado en la serie.',
  },
  {
    term: 'RP — Rest pause',
    body: 'Realizar una serie hasta el número de repeticiones propuesto, aplicar una pausa de 15-20 segundos y volver a repetir hasta el fallo muscular.',
  },
  {
    term: 'Piramidal ascendente',
    body: 'Se empieza con un peso ligero y muchas repeticiones; a medida que avanzan las series se aumenta la carga y se reducen las repeticiones.',
  },
  {
    term: 'Piramidal descendente',
    body: 'Se empieza con la carga más alta y pocas repeticiones; a medida que avanzan las series se baja la carga y se aumentan las repeticiones.',
  },
  {
    term: 'Cadencia',
    body: 'Tiempo que debe durar cada fase del movimiento: concéntrica, isométrica y excéntrica. «1-0-2» = 1 s de subida, 0 s de pausa, 2 s de bajada.',
  },
  {
    term: 'Series clúster',
    body: 'Serie dividida en mini-series dentro de la misma serie, con pausas cortas de 20-30 s. Permite mayor volumen total manteniendo la calidad.',
  },
  {
    term: 'Método circuito',
    body: 'Realizar una serie de ejercicios uno tras otro con poco o ningún descanso. Al completar todos, se considera una vuelta o circuito completo.',
  },
];

type GlossaryModalProps = {
  visible: boolean;
  onClose: () => void;
};

/** Conceptos del protocolo, para no tener que abrir el PDF en mitad del gimnasio. */
export function GlossaryModal({ visible, onClose }: GlossaryModalProps) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        <View style={s.topBar}>
          <Text style={s.topTitle}>Conceptos del plan</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content}>
          <View style={s.card}>
            <Text style={s.cardTitle}>RPE — Escala de esfuerzo</Text>
            <Text style={s.cardBody}>
              Escala subjetiva del 1 al 10 que indica qué tan difícil se siente una serie. Sirve
              para ajustar la carga sin depender sólo del peso.
            </Text>
            {RPE_SCALE.map(([value, label]) => (
              <View key={value} style={s.row}>
                <Text style={s.rowKey}>{value}</Text>
                <Text style={s.rowValue}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>RIR — Repeticiones en reserva</Text>
            <Text style={s.cardBody}>
              Las repeticiones que te dejás sin hacer. Si terminás la serie pudiendo hacer dos
              más, es RIR 2.
            </Text>
            {RPE_TO_RIR.map(([rpe, rir]) => (
              <View key={rpe} style={s.row}>
                <Text style={s.rowKey}>RPE {rpe}</Text>
                <Text style={s.rowValue}>{rir}</Text>
              </View>
            ))}
          </View>

          {CONCEPTS.map((concept) => (
            <View key={concept.term} style={s.card}>
              <Text style={s.cardTitle}>{concept.term}</Text>
              <Text style={s.cardBody}>{concept.body}</Text>
            </View>
          ))}

          <Text style={s.footer}>
            «Aprender a escuchar tu cuerpo es clave para progresar de forma inteligente y segura.»
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

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
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    card: { backgroundColor: c.surface, borderRadius: 12, padding: 16 },
    cardTitle: { color: c.text, fontSize: 15, fontWeight: '800' },
    cardBody: { color: c.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderDashed,
    },
    rowKey: { color: c.accent, fontSize: 13, fontWeight: '800', width: 62 },
    rowValue: { flex: 1, color: c.text, fontSize: 13 },
    footer: {
      color: c.textMuted,
      fontSize: 13,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 12,
    },
  });
