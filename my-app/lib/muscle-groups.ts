/**
 * Los grupos musculares que usa la app, en una sola lista.
 *
 * Existía por duplicado y estaban divergiendo: los seeds del entrenador
 * escriben «Isquiotibiales», «Glúteo», «Pantorrilla», «Core», y el desplegable
 * de Rutinas ofrecía «Femorales», «Glúteos», «Pantorrillas», «Abdominales».
 * Son los mismos músculos con dos nombres, y el balance por grupo de
 * Estadísticas agrupa por el texto: cada ejercicio creado a mano con el nombre
 * del desplegable se abría una barra propia en vez de sumarse a la de sus
 * compañeros de músculo. Ya había pasado con «Peso muerto».
 *
 * Manda el nombre del seed, no el del desplegable: es el que usa el entrenador
 * en el PDF y el que ya tiene historial detrás.
 *
 * El orden es anatómico —de arriba hacia abajo y de empuje a tracción—, no
 * alfabético: al cargar un ejercicio uno piensa «esto es de pierna», y con ese
 * orden los tres candidatos quedan juntos en vez de repartidos por el abecedario.
 *
 * La base NO tiene constraint contra esta lista, a propósito: una fase nueva
 * puede traer un grupo que todavía no esté acá, y que el seed falle por eso
 * sería peor que tener un grupo suelto. Esto es la convención; el desplegable
 * la aplica y con eso alcanza para que la app no vuelva a introducir variantes.
 */
export const MUSCLE_GROUPS = [
  'Pecho',
  'Espalda',
  'Hombro',
  'Deltoide posterior',
  'Trapecio',
  'Bíceps',
  'Tríceps',
  'Antebrazo',
  'Core',
  'Oblicuos',
  'Lumbares',
  'Cuádriceps',
  'Isquiotibiales',
  'Glúteo',
  'Glúteo medio',
  'Aductores',
  'Pantorrilla',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
