/**
 * Qué ejercicio del catálogo es cuál en el dataset de referencia.
 *
 * La clave es el nombre EXACTO como está en `exercises` (el del PDF del
 * entrenador); el valor, el id de 4 dígitos en exercises-dataset. Emparejar es
 * trabajo manual y de una sola vez por ejercicio: los nombres de la app están
 * en español y describen la máquina del gimnasio, y los del dataset están en
 * inglés y describen el patrón de movimiento. Ninguna heurística acierta eso
 * —«Pec deck en cabina» es `lever seated fly`— y una que acierte a medias es
 * peor que no tenerla: deja la ilustración equivocada al lado del nombre
 * correcto, que es exactamente lo que uno no quiere mirar a mitad de una serie.
 *
 * Para agregar uno nuevo: buscalo en el navegador del dataset (abrí su
 * `index.html` en el navegador, tiene búsqueda y filtros), copiá el id, sumá la
 * línea acá y corré `node scripts/vincular-ejercicios.mjs`.
 *
 * Los marcados con ≈ no tienen equivalente exacto en el dataset y se vinculan a
 * lo más cercano. Se deja anotado: la ilustración se parece pero no es el mismo
 * movimiento, y conviene saberlo antes que descubrirlo mirando el gif.
 */
export const MAPA = {
  // ── Pierna ──
  'Flexión de rodilla sentado en máquina': '0599', // lever seated leg curl
  'Flexión de rodilla acostado en máquina': '0586', // lever lying leg curl
  'Sentadilla hack': '0743', // sled hack squat
  'Extensión de rodilla sentado en máquina': '0585', // lever leg extension
  'Sentadilla sumo con mancuerna': '1760', // ≈ dumbbell goblet squat — el dataset no trae el sumo con mancuerna
  'Estocadas con mancuernas (paso hacia atrás)': '0381', // dumbbell rear lunge
  'Hip thrust con barra/máquina': '1409', // ≈ barbell glute bridge — no hay hip thrust con barra; el puente es desde el piso, no apoyado en banco
  'Abducción de cadera sentado en máquina': '0597', // lever seated hip abduction
  'Aducción de cadera sentado en máquina': '0598', // lever seated hip adduction
  'Plantiflexión en máquina (rodilla ligeramente flexionada)': '0605', // lever standing calf raise
  'Plantiflexión sentado': '0594', // lever seated calf raise
  'Peso muerto': '0032', // barbell deadlift

  // ── Torso ──
  'Press inclinado con mancuernas': '0314', // dumbbell incline bench press
  'Pec deck en cabina': '0596', // lever seated fly
  'Press militar (neutro) con mancuernas en banco a 70°': '0404', // dumbbell seated shoulder press (parallel grip)
  'Vuelos laterales con mancuernas': '0334', // dumbbell lateral raise
  'Rear delt en cabina': '0601', // lever seated reverse fly (parallel grip)
  'Rear delt con mancuernas en banco inclinado': '0326', // dumbbell incline rear lateral raise
  'Pull down (neutro) en polea': '2616', // cable lateral pulldown with v-bar
  'Remo (neutro) en máquina': '1350', // lever seated row
  'Extensión de codo en polea alta con barra': '0201', // cable pushdown
  'Curl de bíceps con barra (supinación)': '0031', // barbell curl

  // ── Core ──
  'Abdominales a 30° en colchoneta': '0274', // crunch floor
  'Extensión de columna a 15° en banco': '0488', // hyperextension (on bench)
};
