-- =============================================================================
--  TEAM KÝROS — FASE «IMPACTO (S.ASCEN | RIR 1)» · 5 semanas
--  Fuente : IMPACTO S.ASCEN  RIR 1 — Sebastian Montoya — Octubre 12 del 2026
--  Usuario: smontoyah99@gmail.com = 345f2fa2-eedc-481d-ba93-4f186fab0094
--  Días   : Lun(1) PIERNA #1 · Mar(2) TORSO EMPUJES · Mié(3) TORSO JALONES
--           Jue(4) descanso · Vie(5) PIERNA #2 · Sáb(6) TORSO COMPLETO
--           Dom(0) descanso
--
--  Qué cambia frente a CARGA (DS | RIR 2), además de los ejercicios:
--  · El método deja el drop set y pasa a **series ascendentes**: la carga sube
--    serie a serie y las repeticiones bajan (14-14-12-10, 14-12-10). Por eso
--    ya no queda ninguna nota de «Última serie en drop set».
--  · Las repeticiones suben de 11 a 14 (24 en pantorrilla y abdomen) y el RIR
--    baja de 2 a 1: más volumen y más cerca del fallo.
--  · Los descansos cortos pasan de 2 min a 1m 40s.
--  · Entra trabajo de abdomen todos los días y sale la extensión de columna.
--  · La caminadora sube de 59 a 65 min/semana (10-15 min al final de cada día).
--
--  Es idempotente y NO destructivo: se puede volver a correr sin perder nada.
--  Lo único que se reemplaza son `routines` y `cardio_plan`. El catálogo de
--  ejercicios se hace por upsert y el historial de `workout_logs` no se toca.
-- =============================================================================

begin;

-- ── 1) Sale la prescripción anterior ────────────────────────────────────────
delete from public.routines   where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094';
delete from public.cardio_plan where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094';

-- ── 2) Los ejercicios que solo cambiaron de nombre ──────────────────────────
-- Se renombra la fila existente para que el historial (y con él la carga
-- sugerida y el récord) siga colgando del mismo id. Todos se confirmaron
-- comparando la miniatura del PDF con la ilustración ya vinculada: es la misma
-- máquina o el mismo dibujo, no solo un nombre parecido.
--
-- · Press militar: es el mismo de AJUSTE 1/CARGA (0404, mancuernas en agarre
--   neutro, sentado con respaldo). En CARGA se hizo en máquina desde el 14-sep;
--   «Press militar en máquina» queda en el catálogo con su historial.
-- · «Rear delt en cabina» (AJUSTE 1) es la misma máquina de reverse fly (0601).
-- · «Vuelos laterales» vuelve al nombre de AJUSTE 1: CARGA lo había rebautizado
--   «Elevaciones laterales» y ahora Ciro vuelve a escribir «Vuelos».
--
-- Va antes del upsert del catálogo: al revés, la fila nueva ya existiría y el
-- rename chocaría contra el unique. El `not exists` lo hace idempotente.
update public.exercises e set name = v.nuevo
  from (values
    ('Press militar con mancuernas en banco inclinado', 'Press militar (neutro) con mancuernas sentado'),
    ('Rear delt en cabina',                             'Rear Delt Fly en máquina'),
    ('Curl de bíceps con barra (supinación)',           'Curl de bíceps con barra de pie (supinación)'),
    ('Curl de muñeca sentado con barra EZ',             'Curl de muñeca con barra EZ sentado'),
    ('Press inclinado con mancuernas',                  'Press de banca inclinado con mancuernas'),
    ('Elevaciones laterales con mancuernas',            'Vuelos laterales con mancuernas')
  ) as v(viejo, nuevo)
 where e.user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
   and lower(e.name) = lower(v.viejo)
   and not exists (
     select 1 from public.exercises x
      where x.user_id = e.user_id and lower(x.name) = lower(v.nuevo)
   );

-- ── 3) Catálogo: los 34 ejercicios de esta fase ─────────────────────────────
-- Nombres del PDF con las tildes corregidas («maquina», «talon», «biceps»,
-- «deficit»). Donde el PDF solo cambia mayúsculas contra un ejercicio que ya
-- existe («pec deck», «Leg Curl en máquina sentado») se deja el nombre de la
-- base: el unique y el join del paso 4 ignoran la caja.
--
-- `tracking_mode` solo se fija al insertar (el `on conflict` no lo pisa).
-- 'reps' únicamente donde no cabe carga externa: flexiones, rueda y plancha.
-- Los abdominales en banco declinado quedan en 'carga' para poder sumar un
-- disco; sin disco se anota 0 kg, como se venía haciendo.
--
-- `dataset_id`, `instructions` e `image_url` los pone
-- `scripts/vincular-ejercicios.mjs`, no este seed.
insert into public.exercises (user_id, name, muscle_group, tracking_mode)
select '345f2fa2-eedc-481d-ba93-4f186fab0094'::uuid, v.name, v.muscle_group, v.tracking_mode
from (values
  -- Pierna
  ('Sentadilla hacka en máquina',                               'Cuádriceps',         'carga'),
  ('Extensión de rodilla sentado en máquina',                   'Cuádriceps',         'carga'),
  ('Prensa de piernas inclinada',                               'Cuádriceps',         'carga'),
  ('Estocada en smith con déficit',                             'Glúteo',             'carga'),
  ('Hip Thrust con barra',                                      'Glúteo',             'carga'),
  ('Peso muerto sumo con kettlebell',                           'Glúteo',             'carga'),
  ('Abducción de cadera con polea',                             'Glúteo medio',       'carga'),
  ('Aducción de cadera sentado en máquina',                     'Aductores',          'carga'),
  ('Leg curl en máquina acostado',                              'Isquiotibiales',     'carga'),
  ('Leg curl en máquina sentado',                               'Isquiotibiales',     'carga'),
  ('Elevación de talón sentado en máquina',                     'Pantorrilla',        'carga'),
  -- Pecho
  ('Press de pecho en máquina',                                 'Pecho',              'carga'),
  ('Pec Deck',                                                  'Pecho',              'carga'),
  ('Push up',                                                   'Pecho',              'reps'),
  ('Press de banca inclinado con mancuernas',                   'Pecho',              'carga'),
  -- Hombro
  ('Press militar (neutro) con mancuernas sentado',             'Hombro',             'carga'),
  ('Vuelos laterales con mancuernas',                           'Hombro',             'carga'),
  ('Rear Delt Fly en máquina',                                  'Deltoide posterior', 'carga'),
  ('Rear delt con mancuernas en banco inclinado',               'Deltoide posterior', 'carga'),
  -- Espalda
  ('Remo Inclinado con Barra (pronación)',                      'Espalda',            'carga'),
  ('Lat Pulldown con agarre supino cerrado',                    'Espalda',            'carga'),
  ('Pull-over con cuerda en polea',                             'Espalda',            'carga'),
  -- Brazo
  ('Fondos en máquina',                                         'Tríceps',            'carga'),
  ('Extensión de tríceps en polea alta (overhead) con cuerda',  'Tríceps',            'carga'),
  ('Extensión de codo en polea alta con barra',                 'Tríceps',            'carga'),
  ('Curl de bíceps con mancuernas en banco inclinado',          'Bíceps',             'carga'),
  ('Curl de bíceps con barra de pie (supinación)',              'Bíceps',             'carga'),
  ('Curl de bíceps con mancuernas (neutro)',                    'Bíceps',             'carga'),
  ('Curl de muñeca con barra EZ sentado',                       'Antebrazo',          'carga'),
  -- Abdomen
  ('Crunch de polea arrodillado',                               'Core',               'carga'),
  ('Abdominales en banco declinado',                            'Core',               'carga'),
  ('Press Pallof en media rodilla con polea',                   'Core',               'carga'),
  ('Ab Rollout con apoyo de pared',                             'Core',               'reps'),
  ('Plancha lateral con elevación de brazo',                    'Oblicuos',           'reps')
) as v(name, muscle_group, tracking_mode)
on conflict (user_id, lower(name)) do update
  set muscle_group = excluded.muscle_group;

-- ── 4) Rutina semanal (35 filas) ────────────────────────────────────────────
-- Series ascendentes: cuando el PDF baja las repeticiones serie a serie,
-- `target_reps` lleva el esquema completo ('14-14-12-10'). La app lo parte
-- (`lib/target-reps.ts`): cada serie muestra su número y la sugerencia de carga
-- compara cada serie contra el suyo.
--
-- Unilaterales: '14/lado', y la pausa entre lados va en `notes`; el descanso
-- de la columna DESC. es el de entre series.
--
-- Descansos del PDF: 2m 30s = 150 · 1m 40s = 100 · 1m 20s = 80 · 1m 15s = 75
--                    1m = 60 · 50s = 50 · 40s = 40 · 30s = 30
insert into public.routines
  (user_id, day_of_week, exercise_id, sets, sort_order,
   target_reps, rest_seconds, cadence, superset_group, notes)
select '345f2fa2-eedc-481d-ba93-4f186fab0094'::uuid,
       v.day_of_week, e.id, v.sets, v.sort_order,
       v.target_reps, v.rest_seconds, v.cadence, null::text, v.notes
from (values
  -- ── LUNES · PIERNA COMPLETA # 1 ──
  (1, 0, 'Sentadilla hacka en máquina',                              4, '14-14-12-10', 150, '2-0-1', null::text),
  (1, 1, 'Extensión de rodilla sentado en máquina',                  3, '14-12-10',    100, '1-0-3', null),
  (1, 2, 'Abducción de cadera con polea',                            3, '14/lado',      50, '1-0-3', 'Unilateral · 50 s entre lados'),
  (1, 3, 'Hip Thrust con barra',                                     3, '14-12-10',    150, '1-2-1', null),
  (1, 4, 'Leg curl en máquina acostado',                             4, '14',          100, '1-0-3', null),
  (1, 5, 'Elevación de talón sentado en máquina',                    3, '24',          100, '1-1-4', null),
  (1, 6, 'Crunch de polea arrodillado',                              3, '24',           60, '2-2-4', null),
  -- ── MARTES · TORSO EMPUJES ──
  (2, 0, 'Press de pecho en máquina',                                4, '14-14-12-10', 150, null,    null),
  (2, 1, 'Pec Deck',                                                 3, '14',          150, '1-1-2', null),
  (2, 2, 'Push up',                                                  3, 'fm',          150, null,    'Todas las series al fallo muscular (fm)'),
  (2, 3, 'Press militar (neutro) con mancuernas sentado',            4, '14',          150, null,    null),
  (2, 4, 'Fondos en máquina',                                        3, '14-12-10',    100, null,    null),
  (2, 5, 'Extensión de tríceps en polea alta (overhead) con cuerda', 3, '14',          100, null,    null),
  (2, 6, 'Abdominales en banco declinado',                           3, '24',           60, null,    null),
  -- ── MIÉRCOLES · TORSO JALONES ──
  (3, 0, 'Rear Delt Fly en máquina',                                 3, '14',          100, '1-1-2', null),
  (3, 1, 'Remo Inclinado con Barra (pronación)',                     3, '14-12-10',    150, null,    null),
  (3, 2, 'Lat Pulldown con agarre supino cerrado',                   3, '14-12-10',    150, null,    null),
  (3, 3, 'Curl de bíceps con mancuernas en banco inclinado',         3, '14',          100, null,    null),
  (3, 4, 'Curl de bíceps con barra de pie (supinación)',             3, '14-12-10',    100, null,    null),
  (3, 5, 'Curl de muñeca con barra EZ sentado',                      3, '14',           80, '2-2-4', null),
  (3, 6, 'Press Pallof en media rodilla con polea',                  3, '14/lado',      30, '1-3-1', 'Unilateral · 30 s entre lados'),
  -- ── VIERNES · PIERNA COMPLETA # 2 ──
  (5, 0, 'Estocada en smith con déficit',                            4, '14/lado',      75, null,    'Unilateral · 75 s entre lados'),
  (5, 1, 'Prensa de piernas inclinada',                              3, '14-12-10',    150, '2-0-1', null),
  (5, 2, 'Aducción de cadera sentado en máquina',                    3, '14',          100, '1-1-2', null),
  (5, 3, 'Leg curl en máquina sentado',                              4, '14-14-12-10', 100, '1-0-2', null),
  (5, 4, 'Peso muerto sumo con kettlebell',                          3, '14',          100, '3-0-1', null),
  (5, 5, 'Elevación de talón sentado en máquina',                    3, '24',          100, '1-1-3', null),
  (5, 6, 'Ab Rollout con apoyo de pared',                            3, '14',           60, null,    null),
  -- ── SÁBADO · TORSO COMPLETO ──
  (6, 0, 'Press de banca inclinado con mancuernas',                  4, '14-14-12-10', 150, null,    null),
  (6, 1, 'Vuelos laterales con mancuernas',                          3, '14',          100, null,    null),
  (6, 2, 'Rear delt con mancuernas en banco inclinado',              4, '14-14-12-10', 100, '1-2-2', null),
  (6, 3, 'Pull-over con cuerda en polea',                            4, '14',          150, '1-0-4', null),
  (6, 4, 'Curl de bíceps con mancuernas (neutro)',                   4, '14',          100, null,    null),
  (6, 5, 'Extensión de codo en polea alta con barra',                4, '14',          100, null,    null),
  (6, 6, 'Plancha lateral con elevación de brazo',                   3, '30/lado',      40, null,    'Unilateral · 20 s entre lados')
) as v(day_of_week, sort_order, exercise_name, sets,
       target_reps, rest_seconds, cadence, notes)
join public.exercises e
  on e.user_id     = '345f2fa2-eedc-481d-ba93-4f186fab0094'
 and lower(e.name) = lower(v.exercise_name);

-- ── 5) Cardio: la caminata que cierra cada sesión ───────────────────────────
-- Duración de la columna DURACIÓN del PDF: 65 min/semana (CARGA eran 59).
insert into public.cardio_plan (user_id, day_of_week, modality, target_minutes)
values
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 1, 'Caminata en caminadora', 10),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 2, 'Caminata en caminadora', 15),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 3, 'Caminata en caminadora', 15),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 5, 'Caminata en caminadora', 10),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 6, 'Caminata en caminadora', 15)
on conflict (user_id, day_of_week) do update
  set modality = excluded.modality, target_minutes = excluded.target_minutes;

-- ── 6) La fase vigente ──────────────────────────────────────────────────────
update public.training_phases
   set is_active = false
 where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
   and is_active
   and name <> 'IMPACTO (S.ASCEN | RIR 1)';

-- RPE 9/10 no está escrito en el PDF: sale del RIR 1 (RIR 1 ≈ RPE 9), mismo
-- criterio que CARGA. Es el número contra el que `buildSuggestion` decide si
-- toca subir carga.
--
-- «S.ASCEN» se lee como series ascendentes: es lo que dibujan las tablas
-- (repeticiones que bajan serie a serie). Se deja también la sigla del PDF en
-- `method` por si la lectura no fuera esa.
--
-- El calentamiento se hereda de AJUSTE 1: el PDF tampoco trae esa sección.
insert into public.training_phases
  (user_id, name, started_on, rpe_target, rir_target, method, warmup, is_active)
select '345f2fa2-eedc-481d-ba93-4f186fab0094'::uuid,
       'IMPACTO (S.ASCEN | RIR 1)', '2026-10-12'::date, '9/10', '1',
       'Series ascendentes (S.ASCEN) · 5 semanas',
       'Cycling/caminadora 5 min · Movilidad articular 5 min · Series de aproximación',
       true
where not exists (
  select 1 from public.training_phases
   where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
     and name = 'IMPACTO (S.ASCEN | RIR 1)'
);

update public.training_phases
   set started_on = '2026-10-12'::date, rpe_target = '9/10', rir_target = '1',
       method = 'Series ascendentes (S.ASCEN) · 5 semanas', is_active = true
 where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
   and name = 'IMPACTO (S.ASCEN | RIR 1)';

-- ── 7) Verificación (aborta la transacción si algo no cuadra) ───────────────
do $$
declare n_ex int; n_rt int; n_cp int; n_min int; n_ph int; n_hu int; n_old int;
begin
  select count(*) into n_ex from public.exercises   where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094';
  select count(*) into n_rt from public.routines    where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094';
  select count(*), sum(target_minutes) into n_cp, n_min
    from public.cardio_plan where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094';
  select count(*) into n_ph from public.training_phases
    where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094' and is_active;

  -- Piso, no número exacto: 41 sembrados hasta CARGA + 14 nuevos de esta fase.
  -- Los creados a mano desde la app suman encima.
  if n_ex <  55 then raise exception 'Ejercicios: esperaba al menos 55, hay %', n_ex; end if;
  if n_rt <> 35 then raise exception 'Rutinas: esperaba 35, hay %', n_rt; end if;
  if n_cp <>  5 then raise exception 'Cardio: esperaba 5 días, hay %', n_cp; end if;
  if n_min <> 65 then raise exception 'Cardio: esperaba 65 min/semana, hay %', n_min; end if;
  if n_ph <>  1 then raise exception 'Fases activas: esperaba 1, hay %', n_ph; end if;

  -- Un nombre mal escrito en el paso 3 entra al catálogo y queda sin rutina.
  select count(*) into n_hu
    from public.exercises e
   where e.user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
     and e.name in (
       'Abducción de cadera con polea','Crunch de polea arrodillado','Push up',
       'Fondos en máquina','Abdominales en banco declinado',
       'Remo Inclinado con Barra (pronación)','Lat Pulldown con agarre supino cerrado',
       'Curl de bíceps con mancuernas en banco inclinado',
       'Press Pallof en media rodilla con polea','Estocada en smith con déficit',
       'Peso muerto sumo con kettlebell','Ab Rollout con apoyo de pared',
       'Curl de bíceps con mancuernas (neutro)','Plancha lateral con elevación de brazo',
       'Press militar (neutro) con mancuernas sentado','Rear Delt Fly en máquina',
       'Curl de bíceps con barra de pie (supinación)','Curl de muñeca con barra EZ sentado',
       'Press de banca inclinado con mancuernas','Vuelos laterales con mancuernas'
     )
     and not exists (select 1 from public.routines r where r.exercise_id = e.id);
  if n_hu <> 0 then raise exception '% ejercicio(s) de la fase sin fila de rutina', n_hu; end if;

  -- Si un rename del paso 2 no corrió, el nombre viejo sigue ahí y el nuevo
  -- entró como fila aparte, sin historial: justo lo que el rename evita.
  select count(*) into n_old
    from public.exercises
   where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
     and name in ('Press militar con mancuernas en banco inclinado','Rear delt en cabina',
                  'Curl de bíceps con barra (supinación)','Curl de muñeca sentado con barra EZ',
                  'Press inclinado con mancuernas','Elevaciones laterales con mancuernas');
  if n_old <> 0 then raise exception '% ejercicio(s) quedaron con el nombre viejo', n_old; end if;
end $$;

commit;
