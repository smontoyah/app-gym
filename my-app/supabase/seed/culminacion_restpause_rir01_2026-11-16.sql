-- =============================================================================
--  TEAM KÝROS — FASE «CULMINACIÓN (REST P | RIR 0-1)» · 5 semanas
--  Fuente : CULMINACIÓN | RIR 0-1 | REST PAUSE — Sebastian Montoya — fecha del
--           PDF 16 de noviembre de 2026 (llegó el 18)
--  Usuario: smontoyah99@gmail.com = 345f2fa2-eedc-481d-ba93-4f186fab0094
--  Días   : Mar(2) TORSO EMPUJES · Mié(3) PIERNA #1 · Jue(4) TORSO JALONES
--           Vie(5) PIERNA #2 · Sáb(6) TORSO COMPLETO · Lun(1) y Dom(0) descanso
--
--  Los días NO son los de IMPACTO (lunes pierna 1, miércoles jalones): son los
--  que quedaron en `routines` después de correr la semana del 16-nov, y la
--  sincronización del Sheet de Ciro ya los usa (pierna 1 = 3, empujes = 2,
--  jalones = 4, pierna 2 = 5, torso completo = 6). El `sort_order` de cada día
--  sigue el orden del PDF, que es el de las filas de la pestaña de la fase.
--
--  `started_on` es el lunes 2026-11-16 aunque la primera sesión sea el jueves
--  19 con jalones: en la hoja las semanas van de lunes a domingo contadas desde
--  ahí. El 17 y el 18 se entrenó todavía con IMPACTO y esas sesiones se quedan
--  como están.
--
--  Qué cambia frente a IMPACTO (S.ASCEN | RIR 1), además de los ejercicios:
--  · Método: **rest-pause** en la última serie de la mayoría de ejercicios
--    («12+fm (P 30s)»: 12 repeticiones, pausa, y al fallo con la misma carga).
--    Las repeticiones vuelven a ser iguales en todas las series (12) y salen
--    los esquemas ascendentes, salvo la abducción: 16-16-12.
--  · RIR 0-1: todavía más cerca del fallo.
--  · Descansos más largos: 2 min en los compuestos, 1m 30s en el resto.
--  · Vuelve la extensión de columna y aparece una super serie (A) en empujes.
--  · El abdomen pasa a ir por tiempo: 40 s por serie.
--  · La caminadora baja de 65 a 35 min/semana.
--
--  Es idempotente y NO destructivo con el historial: se puede volver a correr.
--  Lo único que se reemplaza son `routines` y `cardio_plan` de este usuario. El
--  catálogo de ejercicios se hace por upsert y `workout_logs` no se toca.
--
--  Lleva DELETE, así que el MCP de Supabase desde VSCode lo rechaza («was
--  declined»): correrlo en el SQL Editor del panel o desde `claude` en una
--  terminal.
-- =============================================================================

begin;

-- ── 1) Sale la prescripción anterior ────────────────────────────────────────
-- Solo la de este usuario. En `routines` hay filas de otro usuario de la app
-- (p. ej. «Peso muerto», día 3): no son de esta fase ni de esta persona.
delete from public.routines    where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094';
delete from public.cardio_plan where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094';

-- ── 2) Los ejercicios que solo cambiaron de nombre ──────────────────────────
-- Se renombra la fila existente para que el historial (y con él la carga
-- sugerida y el récord) siga colgando del mismo id. Confirmados comparando la
-- miniatura del PDF con la ilustración ya vinculada.
--
-- · Press militar: es el 0404 de siempre (mancuernas, sentado con respaldo).
--   Ciro vuelve a llamarlo como en AJUSTE 1/CARGA; IMPACTO lo había rebautizado
--   «(neutro) … sentado». Mismo caso que «Vuelos laterales» en IMPACTO.
-- · Abducción: la misma máquina sentado (0597), con las palabras en otro orden.
--
-- Va antes del upsert del catálogo: al revés, la fila nueva ya existiría y el
-- rename chocaría contra el unique. El `not exists` lo hace idempotente.
update public.exercises e set name = v.nuevo
  from (values
    ('Press militar (neutro) con mancuernas sentado', 'Press militar con mancuernas en banco inclinado'),
    ('Abducción de cadera sentado en máquina',        'Abducción de cadera en máquina sentado')
  ) as v(viejo, nuevo)
 where e.user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
   and lower(e.name) = lower(v.viejo)
   and not exists (
     select 1 from public.exercises x
      where x.user_id = e.user_id and lower(x.name) = lower(v.nuevo)
   );

-- ── 3) Catálogo: los 35 ejercicios de esta fase ─────────────────────────────
-- El PDF llama igual a las dos elevaciones de talón, pero son máquinas
-- distintas: la de pierna 1 es con las piernas extendidas y los pies en una
-- plataforma (2315), y la de pierna 2, la de siempre con el peso sobre las
-- rodillas (0594). Van en filas separadas porque cada máquina tiene su carga, y
-- con una sola fila la sugerencia mezclaba las dos. Separadas el 2026-11-25:
-- la sesión del lunes 23-nov (4×22 con 30 kg, ya en la de piernas extendidas)
-- pasó a la fila nueva; lo anterior quedó en la de siempre.
-- Nombres del PDF con las tildes corregidas («maquina», «talon», «biceps») y
-- la errata «opuestoos». Donde el PDF solo cambia mayúsculas contra uno que ya
-- existe («Leg Curl en máquina sentado») se deja el nombre de la base.
--
-- Los grupos de los que ya existían son los que tienen hoy: el `on conflict`
-- los reescribe, así que cambiar uno acá parte su barra en Estadísticas.
--
-- NO son el mismo ejercicio, aunque se parezcan a uno del catálogo:
-- · «Rueda abdominal» no es «Ab Rollout con apoyo de pared»: la miniatura es
--   la rueda completa desde las rodillas, sin la pared que corta el recorrido,
--   y ahora va por tiempo. El historial del rollout no le sirve de referencia.
-- · «Elevaciones frontales en polea baja (acostado)» no es la de pie (0162):
--   la miniatura es un video de Ciro acostado en la colchoneta.
--
-- `tracking_mode` solo se fija al insertar (el `on conflict` no lo pisa):
-- · 'reps' en el abdomen por tiempo sin carga externa (plancha, balón, rueda).
--   El PDF los prescribe a 40 s, pero el modo 'tiempo' se escribe en MINUTOS
--   (0,67 para 40 s) y con la duración fija no dice nada: lo que progresa es
--   cuántas repeticiones caben en esos 40 s, y eso es lo que se anota.
-- · 'carga' en «Abdominales sentado en máquina» (40 s, pero con el pin).
-- · 'carga' en el chin-up asistido: el peso es el CONTRAPESO de asistencia, así
--   que ahí menos kg es más difícil. Las series son al fallo ('fm'), así que no
--   hay sugerencia de carga que se confunda con eso.
--
-- `dataset_id`, `instructions` e `image_url` los pone
-- `scripts/vincular-ejercicios.mjs`, no este seed.
insert into public.exercises (user_id, name, muscle_group, tracking_mode)
select '345f2fa2-eedc-481d-ba93-4f186fab0094'::uuid, v.name, v.muscle_group, v.tracking_mode
from (values
  -- Pierna
  ('Sentadilla búlgara con mancuernas',                'Cuádriceps',         'carga'),
  ('Prensa de piernas inclinada',                      'Cuádriceps',         'carga'),
  ('Extensión de rodilla sentado en máquina',          'Cuádriceps',         'carga'),
  ('Sentadilla hacka en máquina',                      'Cuádriceps',         'carga'),
  ('Patada sprinter en polea media',                   'Glúteo',             'carga'),
  ('Hip Thrust con barra',                             'Glúteo',             'carga'),
  ('Zancadas con mancuernas en movimiento',            'Glúteo',             'carga'),
  ('Abducción de cadera en máquina sentado',           'Glúteo medio',       'carga'),
  ('Leg curl en máquina sentado',                      'Isquiotibiales',     'carga'),
  ('Leg curl en máquina acostado',                     'Isquiotibiales',     'carga'),
  ('Elevación de talón sentado en máquina',            'Pantorrilla',        'carga'),
  ('Elevación de talón sentado en máquina (piernas extendidas)', 'Pantorrilla', 'carga'),
  ('Extensión de columna en banco a 45°',              'Lumbares',           'carga'),
  -- Pecho
  ('Press de banca inclinado con mancuernas',          'Pecho',              'carga'),
  ('Pec Deck',                                         'Pecho',              'carga'),
  ('Press de pecho en máquina',                        'Pecho',              'carga'),
  -- Hombro
  ('Elevaciones frontales en polea baja (acostado)',   'Hombro',             'carga'),
  ('Vuelos laterales con mancuernas',                  'Hombro',             'carga'),
  ('Press militar con mancuernas en banco inclinado',  'Hombro',             'carga'),
  ('Face Pull',                                        'Deltoide posterior', 'carga'),
  ('Rear delt unilateral en polea',                    'Deltoide posterior', 'carga'),
  -- Espalda
  ('Chin-up asistido en máquina',                      'Espalda',            'carga'),
  ('Remo (neutro) en máquina',                         'Espalda',            'carga'),
  ('Pull-over con cuerda en polea',                    'Espalda',            'carga'),
  ('Remo sentado en polea con agarre estrecho',        'Espalda',            'carga'),
  -- Brazo
  ('Extensión de codo en polea alta con barra',        'Tríceps',            'carga'),
  ('Press francés con mancuernas en colchoneta',       'Tríceps',            'carga'),
  ('Fondos en máquina',                                'Tríceps',            'carga'),
  ('Curl de bíceps predicador en máquina',             'Bíceps',             'carga'),
  ('Curl de bíceps en polea baja con cuerda',          'Bíceps',             'carga'),
  ('Spider Curl con barra EZ',                         'Bíceps',             'carga'),
  -- Abdomen
  ('Plancha con elevación de brazo y pierna opuestos', 'Core',               'reps'),
  ('Crunch con balón suizo',                           'Core',               'reps'),
  ('Rueda abdominal',                                  'Core',               'reps'),
  ('Abdominales sentado en máquina',                   'Core',               'carga')
) as v(name, muscle_group, tracking_mode)
on conflict (user_id, lower(name)) do update
  set muscle_group = excluded.muscle_group;

-- ── 4) Rutina semanal (35 filas) ────────────────────────────────────────────
-- Rest-pause: `routines` prescribe el ejercicio, no cada serie, así que la
-- serie rest-pause va en `notes`, igual que el drop set de CARGA. La pausa
-- cambia de un ejercicio a otro (15 o 30 s), por eso cada nota la dice.
-- `target_reps` lleva las repeticiones de las series normales: la de
-- rest-pause arranca con el mismo número y se anota el TOTAL (12 + las del
-- fallo), de modo que la sugerencia de carga la da por cumplida.
--
-- Unilaterales: '12/lado', y la pausa entre lados va en `notes`; el descanso
-- de la columna DESC. es el de entre series.
--
-- Super serie A (empujes): el press francés no tiene descanso propio (0) y el
-- minuto de la plancha cierra la vuelta, como las super series de AJUSTE 1.
--
-- Abdomen por tiempo: '40s'. `parseRepScheme` lee una duración como «sin
-- objetivo de repeticiones», así que no hay sugerencia que exija 40 reps.
--
-- Descansos del PDF: 2m = 120 · 1m 30s = 90 · 1m 20s = 80 · 1m = 60
insert into public.routines
  (user_id, day_of_week, exercise_id, sets, sort_order,
   target_reps, rest_seconds, cadence, superset_group, notes)
select '345f2fa2-eedc-481d-ba93-4f186fab0094'::uuid,
       v.day_of_week, e.id, v.sets, v.sort_order,
       v.target_reps, v.rest_seconds, v.cadence, v.superset_group, v.notes
from (values
  -- ── MARTES · TORSO EMPUJES ──
  (2, 0, 'Press de banca inclinado con mancuernas',          4, '12',       120, null::text, null::text, null::text),
  (2, 1, 'Pec Deck',                                         4, '12',       120, '1-1-2',    null,       'Rest-pause en la última: 12 + pausa 30 s + al fallo (anota el total)'),
  (2, 2, 'Elevaciones frontales en polea baja (acostado)',   3, '12',        90, '1-1-3',    null,       null),
  (2, 3, 'Vuelos laterales con mancuernas',                  4, '12',        90, null,       null,       null),
  (2, 4, 'Extensión de codo en polea alta con barra',        3, '12',        90, null,       null,       'Rest-pause en la última: 12 + pausa 15 s + al fallo (anota el total)'),
  (2, 5, 'Press francés con mancuernas en colchoneta',       3, '12',         0, null,       'A',        'Super serie: encadena con la plancha, sin descanso'),
  (2, 6, 'Plancha con elevación de brazo y pierna opuestos', 3, '40s',       60, '1-3-1',    'A',        '40 s por serie: anota las repeticiones'),
  -- ── MIÉRCOLES · PIERNA COMPLETA # 1 ──
  (3, 0, 'Sentadilla búlgara con mancuernas',                4, '12/lado',   60, null,       null,       'Unilateral · 60 s entre lados'),
  (3, 1, 'Prensa de piernas inclinada',                      3, '12',       120, '4-0-1',    null,       'Rest-pause en la última: 12 + pausa 30 s + al fallo (anota el total)'),
  (3, 2, 'Extensión de rodilla sentado en máquina',          3, '12',        90, null,       null,       'Rest-pause en la última: 12 + pausa 15 s + al fallo (anota el total)'),
  (3, 3, 'Patada sprinter en polea media',                   3, '16/lado',   90, null,       null,       'Unilateral · 30 s entre lados'),
  (3, 4, 'Leg curl en máquina sentado',                      4, '12',        90, '1-0-3',    null,       'Rest-pause en la última: 12 + pausa 15 s + al fallo (anota el total)'),
  (3, 5, 'Elevación de talón sentado en máquina (piernas extendidas)', 4, '22',        90, '1-1-4',    null,       'Rest-pause en la última: 22 + pausa 15 s + al fallo (anota el total)'),
  (3, 6, 'Extensión de columna en banco a 45°',              3, '12',        60, '2-4-2',    null,       null),
  -- ── JUEVES · TORSO JALONES ──
  (4, 0, 'Chin-up asistido en máquina',                      3, 'fm',       120, null,       null,       'Todas al fallo · la carga es el contrapeso: menos kg = más difícil'),
  (4, 1, 'Remo (neutro) en máquina',                         3, '12',       120, '1-2-2',    null,       'Rest-pause en la última: 12 + pausa 30 s + al fallo (anota el total)'),
  (4, 2, 'Face Pull',                                        4, '12',        90, '1-1-2',    null,       null),
  (4, 3, 'Pull-over con cuerda en polea',                    3, '12',       120, '1-1-3',    null,       'Rest-pause en la última: 12 + pausa 30 s + al fallo (anota el total)'),
  (4, 4, 'Curl de bíceps predicador en máquina',             3, '12',        90, null,       null,       'Rest-pause en la última: 12 + pausa 15 s + al fallo (anota el total)'),
  (4, 5, 'Curl de bíceps en polea baja con cuerda',          3, '12',        90, null,       null,       null),
  (4, 6, 'Crunch con balón suizo',                           4, '40s',       60, null,       null,       '40 s por serie: anota las repeticiones'),
  -- ── VIERNES · PIERNA COMPLETA # 2 ──
  (5, 0, 'Abducción de cadera en máquina sentado',           3, '16-16-12',  90, '1-2-3',    null,       'Rest-pause en la última: 12 + pausa 15 s + al fallo (anota el total)'),
  (5, 1, 'Sentadilla hacka en máquina',                      4, '12',       120, '3-0-1',    null,       'Rest-pause en la última: 12 + pausa 30 s + al fallo (anota el total)'),
  (5, 2, 'Hip Thrust con barra',                             4, '12',       120, '1-2-1',    null,       'Rest-pause en la última: 12 + pausa 30 s + al fallo (anota el total)'),
  (5, 3, 'Zancadas con mancuernas en movimiento',            3, '24',       120, null,       null,       '24 pasos en total (12 por pierna)'),
  (5, 4, 'Leg curl en máquina acostado',                     4, '12',        90, null,       null,       'Rest-pause en la última: 12 + pausa 15 s + al fallo (anota el total)'),
  (5, 5, 'Elevación de talón sentado en máquina',            3, '26',        90, '1-1-2',    null,       'Rest-pause en la última: 26 + pausa 15 s + al fallo (anota el total)'),
  (5, 6, 'Rueda abdominal',                                  3, '40s',       60, null,       null,       '40 s por serie: anota las repeticiones'),
  -- ── SÁBADO · TORSO COMPLETO ──
  (6, 0, 'Press de pecho en máquina',                        4, '12',       120, null,       null,       'Rest-pause en la última: 12 + pausa 30 s + al fallo (anota el total)'),
  (6, 1, 'Press militar con mancuernas en banco inclinado',  4, '12',       120, null,       null,       null),
  (6, 2, 'Remo sentado en polea con agarre estrecho',        4, '12',       120, '1-1-2',    null,       'Rest-pause en la última: 12 + pausa 30 s + al fallo (anota el total)'),
  (6, 3, 'Rear delt unilateral en polea',                    3, '12/lado',   80, '1-1-2',    null,       'Unilateral · 20 s entre lados'),
  (6, 4, 'Fondos en máquina',                                4, '12',        90, null,       null,       null),
  (6, 5, 'Spider Curl con barra EZ',                         4, '12',        90, null,       null,       null),
  (6, 6, 'Abdominales sentado en máquina',                   3, '40s',       60, null,       null,       '40 s por serie: anota repeticiones y carga')
) as v(day_of_week, sort_order, exercise_name, sets,
       target_reps, rest_seconds, cadence, superset_group, notes)
join public.exercises e
  on e.user_id     = '345f2fa2-eedc-481d-ba93-4f186fab0094'
 and lower(e.name) = lower(v.exercise_name);

-- ── 5) Cardio: la caminata que cierra cada sesión ───────────────────────────
-- Columna REPS de la caminadora en el PDF: 10:00 en pierna 1 y jalones, 5:00
-- en el resto. 35 min/semana (IMPACTO eran 65). El lunes ya no lleva.
insert into public.cardio_plan (user_id, day_of_week, modality, target_minutes)
values
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 2, 'Caminata en caminadora',  5),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 3, 'Caminata en caminadora', 10),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 4, 'Caminata en caminadora', 10),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 5, 'Caminata en caminadora',  5),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 6, 'Caminata en caminadora',  5)
on conflict (user_id, day_of_week) do update
  set modality = excluded.modality, target_minutes = excluded.target_minutes;

-- ── 6) La fase vigente ──────────────────────────────────────────────────────
update public.training_phases
   set is_active = false
 where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
   and is_active
   and name <> 'CULMINACIÓN (REST P | RIR 0-1)';

-- RPE 9-10/10 no está escrito en el PDF: sale del RIR 0-1, mismo criterio que
-- las fases anteriores (RIR 1 ≈ RPE 9). La sugerencia de carga usa el TECHO
-- del rango (10): con la última serie al fallo, un tope de 9 no la dejaría
-- proponer subir nunca.
--
-- El calentamiento se hereda de AJUSTE 1: el PDF tampoco trae esa sección.
insert into public.training_phases
  (user_id, name, started_on, rpe_target, rir_target, method, warmup, is_active)
select '345f2fa2-eedc-481d-ba93-4f186fab0094'::uuid,
       'CULMINACIÓN (REST P | RIR 0-1)', '2026-11-16'::date, '9-10/10', '0-1',
       'Rest-pause · 5 semanas',
       'Cycling/caminadora 5 min · Movilidad articular 5 min · Series de aproximación',
       true
where not exists (
  select 1 from public.training_phases
   where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
     and name = 'CULMINACIÓN (REST P | RIR 0-1)'
);

update public.training_phases
   set started_on = '2026-11-16'::date, rpe_target = '9-10/10', rir_target = '0-1',
       method = 'Rest-pause · 5 semanas', is_active = true
 where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
   and name = 'CULMINACIÓN (REST P | RIR 0-1)';

-- ── 7) Verificación (aborta la transacción si algo no cuadra) ───────────────
do $$
declare n_ex int; n_rt int; n_cp int; n_min int; n_ph int; n_hu int; n_old int;
        n_days int; n_mode int;
begin
  select count(*) into n_ex from public.exercises   where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094';
  select count(*) into n_rt from public.routines    where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094';
  select count(*), sum(target_minutes) into n_cp, n_min
    from public.cardio_plan where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094';
  select count(*) into n_ph from public.training_phases
    where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094' and is_active;

  -- Piso, no número exacto: 57 en el catálogo antes de esta fase + 12 nuevos.
  -- Los creados a mano desde la app suman encima.
  if n_ex <  69 then raise exception 'Ejercicios: esperaba al menos 69, hay %', n_ex; end if;
  if n_rt <> 35 then raise exception 'Rutinas: esperaba 35, hay %', n_rt; end if;
  if n_cp <>  5 then raise exception 'Cardio: esperaba 5 días, hay %', n_cp; end if;
  if n_min <> 35 then raise exception 'Cardio: esperaba 35 min/semana, hay %', n_min; end if;
  if n_ph <>  1 then raise exception 'Fases activas: esperaba 1, hay %', n_ph; end if;

  -- Siete ejercicios por día, en los cinco días: un nombre que no cruzó en el
  -- join del paso 4 deja un día corto en vez de fallar.
  select count(*) into n_days from (
    select day_of_week from public.routines
     where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094'
     group by day_of_week having count(*) = 7 and max(sort_order) = 6
  ) d;
  if n_days <> 5 then raise exception 'Esperaba 5 días con 7 ejercicios (sort_order 0-6), hay %', n_days; end if;

  -- Un nombre mal escrito en el paso 3 entra al catálogo y queda sin rutina.
  select count(*) into n_hu
    from public.exercises e
   where e.user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
     and e.name in (
       'Sentadilla búlgara con mancuernas','Patada sprinter en polea media',
       'Elevaciones frontales en polea baja (acostado)','Press francés con mancuernas en colchoneta',
       'Plancha con elevación de brazo y pierna opuestos','Chin-up asistido en máquina',
       'Curl de bíceps en polea baja con cuerda','Crunch con balón suizo','Rueda abdominal',
       'Remo sentado en polea con agarre estrecho','Spider Curl con barra EZ',
       'Abdominales sentado en máquina',
       'Press militar con mancuernas en banco inclinado','Abducción de cadera en máquina sentado'
     )
     and not exists (select 1 from public.routines r where r.exercise_id = e.id);
  if n_hu <> 0 then raise exception '% ejercicio(s) de la fase sin fila de rutina', n_hu; end if;

  -- El modo de medición solo entra al insertar: si alguno de estos ya existía
  -- con otro modo, la app pediría lo que no es.
  select count(*) into n_mode
    from public.exercises
   where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
     and ((name in ('Plancha con elevación de brazo y pierna opuestos','Crunch con balón suizo','Rueda abdominal')
           and tracking_mode <> 'reps')
       or (name in ('Abdominales sentado en máquina','Chin-up asistido en máquina')
           and tracking_mode <> 'carga'));
  if n_mode <> 0 then raise exception '% ejercicio(s) con tracking_mode inesperado', n_mode; end if;

  -- Si un rename del paso 2 no corrió, el nombre viejo sigue ahí y el nuevo
  -- entró como fila aparte, sin historial: justo lo que el rename evita.
  select count(*) into n_old
    from public.exercises
   where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
     and name in ('Press militar (neutro) con mancuernas sentado',
                  'Abducción de cadera sentado en máquina');
  if n_old <> 0 then raise exception '% ejercicio(s) quedaron con el nombre viejo', n_old; end if;
end $$;

commit;
