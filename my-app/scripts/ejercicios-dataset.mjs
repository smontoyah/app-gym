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
 * **Truco que sirvió para la fase CARGA:** los PDF de Ciro traen una miniatura
 * por ejercicio y son las MISMAS ilustraciones de Gym visual que el dataset.
 * Sacarlas con `pdfimages -j -p el.pdf out/im` y compararlas contra
 * `images/*.jpg` del dataset resuelve el emparejamiento mirando el dibujo en
 * vez de traduciendo el nombre — que es cómo se cazó que los dos «Elevación de
 * talón sentado en máquina» del PDF (lunes y viernes) traen dibujos de máquinas
 * distintas. Ojo: varias miniaturas son fotogramas de los videos del propio
 * entrenador, no del dataset, y ahí no hay nada que comparar.
 *
 * Los marcados con ≈ no tienen equivalente exacto en el dataset y se vinculan a
 * lo más cercano. Se deja anotado: la ilustración se parece pero no es el mismo
 * movimiento, y conviene saberlo antes que descubrirlo mirando el gif.
 */
export const MAPA = {
  // ══ Fase CARGA (DS | RIR 2) — septiembre 2026 ══════════════════════════════

  // ── Pierna ──
  'Sentadilla hacka en máquina': '0743', // sled hack squat
  'Prensa de piernas inclinada': '0739', // sled 45° leg press
  'Zancadas con mancuernas en movimiento': '0336', // dumbbell lunge (en movimiento)
  'Extensión de rodilla sentado en máquina': '0585', // lever leg extension
  'Leg curl en máquina sentado': '0599', // lever seated leg curl
  'Leg curl en máquina acostado': '0586', // lever lying leg curl
  'Leg curl unilateral de pie en máquina': '0582', // ≈ lever kneeling leg curl — el dataset no trae la versión de pie
  'Abducción de cadera sentado en máquina': '0597', // lever seated hip abduction
  'Aducción de cadera sentado en máquina': '0598', // lever seated hip adduction
  'Hip Thrust con barra': '1409', // ≈ barbell glute bridge — no hay hip thrust con barra; el puente es desde el piso, no apoyado en banco
  'Elevación de talón sentado en máquina': '0594', // lever seated calf raise
  'Extensión de columna en banco a 45°': '0489', // hyperextension (el de 15° era 0488, sobre banco plano)

  // ── Pecho ──
  'Pec Deck': '0596', // lever seated fly
  'Press de banca plana con barra': '0025', // barbell bench press
  'Press de pecho en máquina': '0576', // lever chest press (el de discos, no el de torre)
  'Aperturas de pecho con polea alta de pie': '0227', // cable standing fly
  'Fondos en paralelas': '0251', // chest dip

  // ── Hombro ──
  'Press militar con mancuernas en banco inclinado': '0404', // dumbbell seated shoulder press (parallel grip)
  'Elevaciones laterales con mancuernas': '0334', // dumbbell lateral raise
  'Elevaciones frontales con cuerda en polea baja (de pie)': '0162', // cable front raise
  // Estos dos estuvieron cruzados una vez: los nombres del dataset engañan y
  // hay que mirar el dibujo. `0233 cable standing rear delt row (with rope)`
  // termina con las manos EN LA CARA y los codos altos —eso es el face pull—,
  // mientras `0225 cable standing cross-over high reverse fly` termina con los
  // brazos abiertos en horizontal, que es el rear delt fly (y es el movimiento
  // que se ve en el video de Ciro).
  'Rear delt unilateral en polea': '0225', // ≈ cross-over high reverse fly — bilateral; el dataset no trae la versión a un brazo
  'Face Pull': '0233', // cable standing rear delt row (with rope) = el face pull, aunque no se llame así

  // ── Espalda ──
  'Pull down (neutro) en polea': '2616', // cable lateral pulldown with v-bar
  'Lat Pulldown': '0198', // cable pulldown (agarre ancho pronado)
  'Remo (neutro) en máquina': '1350', // lever seated row
  'Pull-over con cuerda en polea': '0237', // cable straight arm pulldown (with rope)

  // ── Brazo ──
  'Extensión de codo en polea alta con barra': '0201', // cable pushdown
  // Ciro lo llama «tríceps katana», pero el movimiento es el de la polea BAJA:
  // la mano detrás de la nuca y el codo extendiendo hacia arriba. El 1723 que
  // estuvo acá hasta el 2026-09-16 era un pushdown a un brazo —otro ejercicio—,
  // y por eso el gif no se parecía a lo que se hace. Se renombró el ejercicio.
  'Extensión unilateral de tríceps en polea baja (neutro)': '1727', // ≈ cable standing reverse grip one arm overhead tricep extension — el dataset lo dibuja con agarre supino; el de Ciro es neutro
  'Extensión de tríceps en polea alta (overhead) con cuerda': '1724', // cable rope high pulley overhead tricep extension
  'Curl de bíceps predicador en máquina': '0592', // lever preacher curl
  'Curl de bíceps con polea (barra)': '0868', // cable curl
  'Curl bayesian en polea': '0190', // ≈ cable one arm curl — el bayesian es con el cable por detrás del cuerpo
  'Curl de muñeca sentado con barra EZ': '0125', // ≈ barbell wrist curl v. 2 — sentado con antebrazos en los muslos; el dataset no trae la barra EZ

  // ══ Fases anteriores ═══════════════════════════════════════════════════════
  // Siguen en el catálogo con su historial: un ejercicio no se borra, deja de
  // aparecer en `routines`. Se mantienen acá para que si vuelven, vuelvan ya
  // con ilustración.
  'Sentadilla sumo con mancuerna': '1760', // ≈ dumbbell goblet squat — el dataset no trae el sumo con mancuerna
  'Estocadas con mancuernas (paso hacia atrás)': '0381', // dumbbell rear lunge
  'Plantiflexión en máquina (rodilla ligeramente flexionada)': '0605', // lever standing calf raise
  'Press inclinado con mancuernas': '0314', // dumbbell incline bench press
  'Rear delt en cabina': '0601', // lever seated reverse fly (parallel grip)
  'Rear delt con mancuernas en banco inclinado': '0326', // dumbbell incline rear lateral raise
  'Curl de bíceps con barra (supinación)': '0031', // barbell curl
  'Abdominales a 30° en colchoneta': '0274', // crunch floor

  // De otro usuario de la app, no de Sebastián. Corriendo el script con
  // APP_EMAIL/APP_PASSWORD la RLS lo esconde y sale reportado como «no existe
  // en el catálogo»: es esperable, no un error del mapa.
  'Peso muerto': '0032', // barbell deadlift
};
