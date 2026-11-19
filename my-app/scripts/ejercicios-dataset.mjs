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
  // ══ Fase CULMINACIÓN (REST P | RIR 0-1) — noviembre 2026 ═══════════════════
  // Ojo: en este PDF varias miniaturas NO son de Gym visual sino de Lyfta (traen
  // la marca de agua) o fotogramas de videos de Ciro. Ahí no hay dibujo idéntico
  // que encontrar y se compara el movimiento: máquina, postura y agarre. Por eso
  // los ya vinculados (pec deck, remos, face pull, pull-over, hacka, zancadas,
  // press de pecho) dan puntajes bajos contra su gif y aun así están bien.
  'Sentadilla búlgara con mancuernas': '0410', // dumbbell single leg split squat — pie trasero en el banco y mancuernas, como el PDF (3533 «quads» es sin carga)
  'Patada sprinter en polea media': '0228', // ≈ cable standing hip extension — la miniatura es un video de Ciro; el dataset no trae la patada sprinter, esta es la extensión de cadera de pie con tobillera
  'Elevaciones frontales en polea baja (acostado)': '0162', // ≈ cable front raise — de pie; el de Ciro (video) es acostado en la colchoneta. No es «… (de pie)», que es otra fila
  'Press francés con mancuernas en colchoneta': '0351', // ≈ dumbbell lying triceps extension — en banco; el de Ciro es acostado en el piso
  'Plancha con elevación de brazo y pierna opuestos': '0803', // ≈ superman push-up — el dibujo más parecido (plancha alta, brazo y pierna opuestos extendidos), pero el gif mete una flexión que acá no va
  'Chin-up asistido en máquina': '0572', // lever assisted chin-up — la de rodillas, como el PDF (1431 es de pie)
  'Curl de bíceps en polea baja con cuerda': '0165', // cable hammer curl (with rope)
  'Crunch con balón suizo': '0271', // ≈ crunch (on stability ball) — con la espalda sobre el balón; el PDF lo dibuja en el piso con las piernas sobre el balón
  'Rueda abdominal': '0857', // wheel rollerout — ahora sí exacto: desde las rodillas y sin pared (comparte gif con «Ab Rollout con apoyo de pared»)
  'Remo sentado en polea con agarre estrecho': '0861', // cable seated row — maneral en V, como el PDF
  'Spider Curl con barra EZ': '0454', // ez barbell spider curl — boca abajo en banco inclinado, como el PDF (1628 es en el predicador)
  'Abdominales sentado en máquina': '1452', // lever seated crunch — agarrando las manijas sobre los hombros, como el PDF (0595 es con almohadilla al pecho)
  // Renombrados en este seed (mismo id de `exercises`, mismo historial):
  // · «Press militar (neutro) con mancuernas sentado» → «Press militar con
  //   mancuernas en banco inclinado». La miniatura ahora es con agarre PRONO
  //   (es el fotograma 0 de 3546, que alterna brazos), así que pasa de 0404
  //   (neutro) a 0405, el mismo press a dos brazos. Ver «Hombro».
  // · «Abducción de cadera sentado en máquina» → «… en máquina sentado» (0597).
  // La «Elevación de talón sentado en máquina» de la pierna 1 trae OTRA máquina
  // (2315 lever rotary calf, piernas extendidas); la de la pierna 2 es 0594. El
  // PDF las llama igual y en la base es una sola fila, así que queda 0594.

  // ══ Fase IMPACTO (S.ASCEN | RIR 1) — octubre 2026 ══════════════════════════
  // Emparejados contra TODOS los fotogramas de cada gif, no solo contra
  // `images/*.jpg`: la miniatura del PDF suele ser otro fotograma de la misma
  // animación, y comparando un solo cuadro no aparecían ni los que sí están
  // (la plancha lateral es el fotograma 6 de 0464, no su portada).

  // ── Nuevos ──
  'Abducción de cadera con polea': '0710', // ≈ side hip abduction — el mismo movimiento acostado; el dataset solo trae la ADUCCIÓN en polea (0168), que es el opuesto, y 1427 «outer hip abductor» es un estiramiento
  'Estocada en smith con déficit': '0769', // ≈ smith sprint lunge — la zancada en Smith; sin el escalón del déficit y los pasos hablan de la variante sprint
  'Crunch de polea arrodillado': '0175', // cable kneeling crunch
  'Push up': '0662', // push-up
  'Fondos en máquina': '1451', // lever seated dip — la misma máquina del PDF
  'Abdominales en banco declinado': '0277', // decline crunch — el dibujo del PDF es este, no el sit-up (0282)
  'Remo Inclinado con Barra (pronación)': '0027', // barbell bent over row
  'Lat Pulldown con agarre supino cerrado': '0245', // cable underhand pulldown
  'Curl de bíceps con mancuernas en banco inclinado': '0318', // dumbbell incline curl (el PDF trae un fotograma de video)
  'Press Pallof en media rodilla con polea': '0979', // ≈ band horizontal pallof press — de pie y con banda; el de Ciro es en media rodilla con polea
  'Peso muerto sumo con kettlebell': '2808', // ≈ dumbbell sumo pull through — postura sumo con UNA pesa entre las piernas, como el PDF; más cerca que la barra (0117)
  'Ab Rollout con apoyo de pared': '0857', // ≈ wheel rollerout — sin la pared que corta el recorrido
  'Curl de bíceps con mancuernas (neutro)': '0312', // dumbbell hammer curl v. 2 (las dos a la vez, como el PDF)
  'Plancha lateral con elevación de brazo': '0464', // front plank with twist — sus fotogramas 4-8 son el dibujo del PDF: sobre la mano, brazo al techo

  // ── Vuelven de AJUSTE 1, renombrados ──
  'Press de banca inclinado con mancuernas': '0314', // dumbbell incline bench press (antes «Press inclinado con mancuernas»)
  'Rear Delt Fly en máquina': '0601', // lever seated reverse fly (parallel grip) (antes «Rear delt en cabina»)
  'Rear delt con mancuernas en banco inclinado': '0326', // dumbbell incline rear lateral raise
  'Curl de bíceps con barra de pie (supinación)': '0031', // barbell curl (antes «Curl de bíceps con barra (supinación)»)

  // ══ Fase CARGA (DS | RIR 2) — septiembre 2026 ══════════════════════════════

  // ── Pierna ──
  'Sentadilla hacka en máquina': '0743', // sled hack squat
  'Prensa de piernas inclinada': '0739', // sled 45° leg press
  'Zancadas con mancuernas en movimiento': '0336', // dumbbell lunge (en movimiento)
  'Extensión de rodilla sentado en máquina': '0585', // lever leg extension
  'Leg curl en máquina sentado': '0599', // lever seated leg curl
  'Leg curl en máquina acostado': '0586', // lever lying leg curl
  'Leg curl unilateral de pie en máquina': '0582', // ≈ lever kneeling leg curl — el dataset no trae la versión de pie
  'Abducción de cadera en máquina sentado': '0597', // lever seated hip abduction (hasta IMPACTO, «Abducción de cadera sentado en máquina»)
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
  // En IMPACTO se renombraron: eran «Press militar con mancuernas en banco
  // inclinado» y «Elevaciones laterales con mancuernas». En CULMINACIÓN el press
  // vuelve a su nombre de AJUSTE 1/CARGA y con agarre prono (antes 0404, neutro).
  'Press militar con mancuernas en banco inclinado': '0405', // dumbbell seated shoulder press
  'Vuelos laterales con mancuernas': '0334', // dumbbell lateral raise
  // El reemplazo que se hizo desde el 14-sep; no sale en ningún PDF, así que no
  // hay miniatura con qué comparar: es la de asiento con discos.
  'Press militar en máquina': '0587', // lever military press
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
  'Curl de muñeca con barra EZ sentado': '0125', // ≈ barbell wrist curl v. 2 — sentado con antebrazos en los muslos; el dataset no trae la barra EZ

  // ══ Fases anteriores ═══════════════════════════════════════════════════════
  // Siguen en el catálogo con su historial: un ejercicio no se borra, deja de
  // aparecer en `routines`. Se mantienen acá para que si vuelven, vuelvan ya
  // con ilustración.
  'Sentadilla sumo con mancuerna': '1760', // ≈ dumbbell goblet squat — el dataset no trae el sumo con mancuerna
  'Estocadas con mancuernas (paso hacia atrás)': '0381', // dumbbell rear lunge
  'Plantiflexión en máquina (rodilla ligeramente flexionada)': '0605', // lever standing calf raise
  'Abdominales a 30° en colchoneta': '0274', // crunch floor

  // Creado a mano desde la app.
  'Caminata inclinada LISS': '3666', // walking on incline treadmill

  // De otro usuario de la app, no de Sebastián. Corriendo el script con
  // APP_EMAIL/APP_PASSWORD la RLS lo esconde y sale reportado como «no existe
  // en el catálogo»: es esperable, no un error del mapa.
  'Peso muerto': '0032', // barbell deadlift
};
