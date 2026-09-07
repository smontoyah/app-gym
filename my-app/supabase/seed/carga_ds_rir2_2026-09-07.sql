-- =============================================================================
--  TEAM KÝROS — FASE «CARGA (DS | RIR 2)» · 5 semanas
--  Fuente : CARGA DS  RIR 2 — Sebastian Montoya — SEPTIEMBRE 7 DEL 2026
--  Usuario: smontoyah99@gmail.com = 345f2fa2-eedc-481d-ba93-4f186fab0094
--  Días   : Lun(1) PIERNA #1 · Mar(2) TORSO EMPUJES · Mié(3) TORSO JALONES
--           Jue(4) descanso · Vie(5) PIERNA #2 · Sáb(6) TORSO COMPLETO
--           Dom(0) descanso
--
--  Qué cambia frente a AJUSTE 1, además de los ejercicios:
--  · El método deja de ser super series y pasa a **drop set en la última
--    serie**. Por eso no queda ni un `superset_group` en esta fase y todos los
--    descansos son reales (ya no hay ceros encadenando ejercicios).
--  · Las repeticiones bajan de 13 a 11 y el RIR de 3 a 2: menos reps, más
--    cerca del fallo.
--  · Se entrena 5 días (antes 4 con miércoles de descanso). El descanso pasa a
--    jueves y domingo.
--  · La caminadora deja de ser un bloque aparte de fin de semana y se hace al
--    final de cada sesión: 10-15 min según el día, 59 min/semana en total.
--
--  Es idempotente y NO destructivo: se puede volver a correr sin perder nada.
--  Lo único que se reemplaza son `routines` y `cardio_plan`. El catálogo de
--  ejercicios se hace por upsert y el historial de `workout_logs` no se toca.
-- =============================================================================

begin;

-- ── 1) Sale la prescripción anterior ────────────────────────────────────────
-- `routines` y `cardio_plan` son la prescripción de ESTA fase: entra una nueva,
-- sale la anterior. `exercises` y `workout_logs` sobreviven a todas las fases.
delete from public.routines   where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094';
delete from public.cardio_plan where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094';

-- ── 2) Los ejercicios que solo cambiaron de nombre ──────────────────────────
-- Ciro rebautizó varios movimientos que ya se venían haciendo: «Flexión de
-- rodilla» ahora es «Leg curl», «Plantiflexión sentado» es «Elevación de talón
-- sentado en máquina», «Vuelos laterales» son «Elevaciones laterales».
--
-- Se **renombra la fila que ya existe** en vez de insertar una nueva. No es
-- cosmético: de ese id cuelgan los `workout_logs` de agosto, y son los que
-- alimentan la carga sugerida (`previous_sets`) y el récord por ejercicio. Si
-- el nombre nuevo entrara como fila aparte, el mismo movimiento arrancaría con
-- historial vacío y la app dejaría de sugerir carga justo cuando más sirve.
--
-- Va antes del upsert del catálogo a propósito: si corriera después, el upsert
-- ya habría creado la fila nueva y el rename chocaría contra el unique.
--
-- Idempotente por partida doble: el `where` no encuentra nada en la segunda
-- corrida, y el `not exists` evita el choque si alguien ya renombró a mano.
update public.exercises e set name = v.nuevo
  from (values
    ('Sentadilla hack',                                     'Sentadilla hacka en máquina'),
    ('Flexión de rodilla sentado en máquina',               'Leg curl en máquina sentado'),
    ('Flexión de rodilla acostado en máquina',              'Leg curl en máquina acostado'),
    ('Plantiflexión sentado',                               'Elevación de talón sentado en máquina'),
    ('Extensión de columna a 15° en banco',                 'Extensión de columna en banco a 45°'),
    ('Pec deck en cabina',                                  'Pec Deck'),
    ('Press militar (neutro) con mancuernas en banco a 70°','Press militar con mancuernas en banco inclinado'),
    ('Vuelos laterales con mancuernas',                     'Elevaciones laterales con mancuernas'),
    ('Hip thrust con barra/máquina',                        'Hip Thrust con barra')
  ) as v(viejo, nuevo)
 where e.user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
   and lower(e.name) = lower(v.viejo)
   and not exists (
     select 1 from public.exercises x
      where x.user_id = e.user_id and lower(x.name) = lower(v.nuevo)
   );

-- ── 3) Catálogo: los 33 ejercicios de esta fase ─────────────────────────────
-- Upsert, no delete-and-reinsert: los de fases anteriores y los que el usuario
-- creó a mano siguen ahí, con su historial y su id intactos.
--
-- `dataset_id`, `instructions` e `image_url` NO se tocan acá: los pone
-- `scripts/vincular-ejercicios.mjs` a partir de `scripts/ejercicios-dataset.mjs`,
-- que es el único lugar donde vive el emparejamiento con el dataset.
insert into public.exercises (user_id, name, muscle_group)
select '345f2fa2-eedc-481d-ba93-4f186fab0094'::uuid, v.name, v.muscle_group
from (values
  -- Pierna
  ('Sentadilla hacka en máquina',                             'Cuádriceps'),
  ('Zancadas con mancuernas en movimiento',                   'Glúteo'),
  ('Extensión de rodilla sentado en máquina',                 'Cuádriceps'),
  ('Prensa de piernas inclinada',                             'Cuádriceps'),
  ('Abducción de cadera sentado en máquina',                  'Glúteo medio'),
  ('Aducción de cadera sentado en máquina',                   'Aductores'),
  ('Hip Thrust con barra',                                    'Glúteo'),
  ('Leg curl en máquina sentado',                             'Isquiotibiales'),
  ('Leg curl en máquina acostado',                            'Isquiotibiales'),
  ('Leg curl unilateral de pie en máquina',                   'Isquiotibiales'),
  ('Elevación de talón sentado en máquina',                   'Pantorrilla'),
  ('Extensión de columna en banco a 45°',                     'Lumbares'),
  -- Pecho
  ('Pec Deck',                                                'Pecho'),
  ('Press de banca plana con barra',                          'Pecho'),
  ('Fondos en paralelas',                                     'Pecho'),
  ('Aperturas de pecho con polea alta de pie',                'Pecho'),
  ('Press de pecho en máquina',                               'Pecho'),
  -- Hombro
  ('Press militar con mancuernas en banco inclinado',         'Hombro'),
  ('Elevaciones laterales con mancuernas',                    'Hombro'),
  ('Elevaciones frontales con cuerda en polea baja (de pie)', 'Hombro'),
  ('Rear delt unilateral en polea',                           'Deltoide posterior'),
  ('Face Pull',                                               'Deltoide posterior'),
  -- Espalda
  ('Pull down (neutro) en polea',                             'Espalda'),
  ('Lat Pulldown',                                            'Espalda'),
  ('Remo (neutro) en máquina',                                'Espalda'),
  ('Pull-over con cuerda en polea',                           'Espalda'),
  -- Brazo
  ('Extensión de codo en polea alta con barra',               'Tríceps'),
  ('Tríceps katana en polea (neutro)',                        'Tríceps'),
  ('Extensión de tríceps en polea alta (overhead) con cuerda','Tríceps'),
  ('Curl de bíceps predicador en máquina',                    'Bíceps'),
  ('Curl de bíceps con polea (barra)',                        'Bíceps'),
  ('Curl bayesian en polea',                                  'Bíceps'),
  ('Curl de muñeca sentado con barra EZ',                     'Antebrazo')
) as v(name, muscle_group)
on conflict (user_id, lower(name)) do update
  set muscle_group = excluded.muscle_group;

-- ── 4) Rutina semanal (35 filas) ────────────────────────────────────────────
-- El «Drop» que el PDF marca en la última fila de la tabla de series va en
-- `notes` y no en una columna nueva: `routines` prescribe el ejercicio, no cada
-- serie por separado, y la app ya pinta `notes` debajo de los chips. Meter una
-- columna `set_type` obligaría a modelar la serie como fila para un dato que
-- hoy siempre dice lo mismo —la última— y que se lee de un vistazo.
--
-- `target_reps` es texto justamente para esto: '11', '22', 'fm' (fallo
-- muscular) y '11/lado' conviven. `parseTargetReps` en la app saca el primer
-- número, así que 'fm' deja la sugerencia de carga en null, que es lo correcto:
-- en una serie al fallo no hay repetición objetivo que cumplir.
--
-- Descansos del PDF: 2m 30s = 150 · 2m = 120 · 1m 30s = 90 · 1m 20s = 80 · 1m = 60
insert into public.routines
  (user_id, day_of_week, exercise_id, sets, sort_order,
   target_reps, rest_seconds, cadence, superset_group, notes)
select '345f2fa2-eedc-481d-ba93-4f186fab0094'::uuid,
       v.day_of_week, e.id, v.sets, v.sort_order,
       v.target_reps, v.rest_seconds, v.cadence, null::text, v.notes
from (values
  -- ── LUNES · PIERNA COMPLETA # 1 ──
  (1, 0, 'Sentadilla hacka en máquina',                             4, '11',      150, '2-0-1', null::text),
  (1, 1, 'Zancadas con mancuernas en movimiento',                   3, '22',      150, null,    '22 pasos en total (11 por pierna)'),
  (1, 2, 'Extensión de rodilla sentado en máquina',                 3, '11',      120, null,    'Última serie en drop set'),
  (1, 3, 'Abducción de cadera sentado en máquina',                  3, '13',      120, '1-2-3', 'Última serie en drop set'),
  (1, 4, 'Leg curl en máquina sentado',                             4, '11',      120, '1-1-2', 'Última serie en drop set'),
  (1, 5, 'Elevación de talón sentado en máquina',                   4, '22',       80, '1-1-3', 'Última serie en drop set'),
  (1, 6, 'Extensión de columna en banco a 45°',                     2, '11',       60, '2-4-2', null),
  -- ── MARTES · TORSO EMPUJES ──
  (2, 0, 'Pec Deck',                                                3, '11',      150, '1-1-2', 'Última serie en drop set'),
  (2, 1, 'Press de banca plana con barra',                          3, '11',      150, null,    null),
  (2, 2, 'Fondos en paralelas',                                     3, 'fm',      150, '3-0-1', 'Todas las series al fallo muscular (fm)'),
  (2, 3, 'Press militar con mancuernas en banco inclinado',         3, '11',      150, null,    'Última serie en drop set'),
  (2, 4, 'Elevaciones laterales con mancuernas',                    3, '11',      120, null,    'Última serie en drop set'),
  (2, 5, 'Extensión de codo en polea alta con barra',               4, '11',      120, null,    'Última serie en drop set'),
  (2, 6, 'Tríceps katana en polea (neutro)',                        3, '11/lado',  90, null,    'Unilateral · 30 s entre lados'),
  -- ── MIÉRCOLES · TORSO JALONES ──
  (3, 0, 'Pull down (neutro) en polea',                             3, '11',      150, '1-0-2', null),
  (3, 1, 'Remo (neutro) en máquina',                                3, '11',      150, '1-1-2', 'Última serie en drop set'),
  (3, 2, 'Rear delt unilateral en polea',                           3, '11/lado',  90, '1-1-2', 'Unilateral · 30 s entre lados'),
  (3, 3, 'Pull-over con cuerda en polea',                           3, '11',      120, '1-1-3', 'Última serie en drop set'),
  (3, 4, 'Curl de bíceps predicador en máquina',                    3, '11',      120, '1-0-3', 'Última serie en drop set'),
  (3, 5, 'Curl de bíceps con polea (barra)',                        3, '11',      120, null,    null),
  (3, 6, 'Curl de muñeca sentado con barra EZ',                     2, '13',       60, '2-2-4', null),
  -- ── VIERNES · PIERNA COMPLETA # 2 ──
  (5, 0, 'Hip Thrust con barra',                                    3, '11',      150, '1-1-2', null),
  (5, 1, 'Prensa de piernas inclinada',                             3, '11',      150, '3-0-1', 'Última serie en drop set'),
  (5, 2, 'Extensión de rodilla sentado en máquina',                 3, '11',      120, '1-0-2', null),
  (5, 3, 'Aducción de cadera sentado en máquina',                   3, '11',      120, '1-1-3', 'Última serie en drop set'),
  (5, 4, 'Leg curl en máquina acostado',                            4, '11',      120, '1-0-3', 'Última serie en drop set'),
  (5, 5, 'Leg curl unilateral de pie en máquina',                   3, '11/lado',  90, '1-1-2', 'Unilateral · 30 s entre lados'),
  (5, 6, 'Elevación de talón sentado en máquina',                   3, '22',       80, '1-1-3', 'Última serie en drop set'),
  -- ── SÁBADO · TORSO COMPLETO ──
  (6, 0, 'Aperturas de pecho con polea alta de pie',                3, '11',      150, '1-1-2', 'Alternativa: Pec Deck'),
  (6, 1, 'Press de pecho en máquina',                               3, '11',      150, null,    'Última serie en drop set'),
  (6, 2, 'Elevaciones frontales con cuerda en polea baja (de pie)', 3, '11',      120, '1-1-2', null),
  (6, 3, 'Lat Pulldown',                                            4, '11',      150, '1-1-2', 'Última serie en drop set'),
  (6, 4, 'Face Pull',                                               3, '11',      120, '1-2-2', null),
  (6, 5, 'Curl bayesian en polea',                                  4, '11/lado',  90, null,    'Unilateral · 30 s entre lados'),
  (6, 6, 'Extensión de tríceps en polea alta (overhead) con cuerda', 4, '11',     120, null,    null)
) as v(day_of_week, sort_order, exercise_name, sets,
       target_reps, rest_seconds, cadence, notes)
join public.exercises e
  on e.user_id     = '345f2fa2-eedc-481d-ba93-4f186fab0094'
 -- Case-insensitive igual que el unique del catálogo: si esta fase escribe un
 -- nombre con otra caja, un `=` exacto no encontraría la fila y la línea de
 -- rutina se perdería sin ruido. El bloque de verificación la cazaría, pero
 -- mejor no llegar ahí.
 and lower(e.name) = lower(v.exercise_name);

-- ── 5) Cardio: la caminata que cierra cada sesión ───────────────────────────
-- Ya no es un bloque aparte de fin de semana (AJUSTE 1 pedía 45 min sábado y
-- domingo): esta fase la pone al final de cada día de entrenamiento, con la
-- duración que trae la tabla «DURACIÓN» del PDF. Son 59 min/semana contra los
-- ~140 de la fase anterior.
--
-- Va a `cardio_plan` y no a `routines` como un ejercicio más porque la app ya
-- tiene la tarjeta de cardio, que se registra en minutos y no en series/reps.
insert into public.cardio_plan (user_id, day_of_week, modality, target_minutes)
values
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 1, 'Caminata en caminadora', 10),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 2, 'Caminata en caminadora', 12),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 3, 'Caminata en caminadora', 12),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 5, 'Caminata en caminadora', 10),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 6, 'Caminata en caminadora', 15)
on conflict (user_id, day_of_week) do update
  set modality = excluded.modality, target_minutes = excluded.target_minutes;

-- ── 6) La fase vigente ──────────────────────────────────────────────────────
-- El unique parcial `idx_training_phases_one_active` deja una sola fase activa
-- por usuario, así que hay que bajar la anterior antes de subir esta.
update public.training_phases
   set is_active = false
 where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
   and is_active
   and name <> 'CARGA (DS | RIR 2)';

-- RPE 8/10 no está escrito en el PDF: sale del RIR 2 que sí está (RIR 2 ≈ RPE
-- 8). Se guarda porque es lo que la app usa para decidir si toca subir carga
-- (`buildSuggestion` compara el RPE anotado contra este número); el formato
-- `8/10` es el mismo de AJUSTE 1, que la pantalla parte por el `/`.
--
-- El calentamiento se hereda de AJUSTE 1: el PDF de esta fase no trae sección
-- de calentamiento y es el mismo entrenador en el mismo gimnasio.
insert into public.training_phases
  (user_id, name, started_on, rpe_target, rir_target, method, warmup, is_active)
select '345f2fa2-eedc-481d-ba93-4f186fab0094'::uuid,
       'CARGA (DS | RIR 2)', '2026-09-07'::date, '8/10', '2',
       'Drop set · 5 semanas',
       'Cycling/caminadora 5 min · Movilidad articular 5 min · Series de aproximación',
       true
where not exists (
  select 1 from public.training_phases
   where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
     and name = 'CARGA (DS | RIR 2)'
);

update public.training_phases
   set started_on = '2026-09-07'::date, rpe_target = '8/10', rir_target = '2',
       method = 'Drop set · 5 semanas', is_active = true
 where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
   and name = 'CARGA (DS | RIR 2)';

-- ── 7) Verificación (aborta la transacción si algo no cuadra) ───────────────
do $$
declare n_ex int; n_rt int; n_cp int; n_ph int; n_hu int;
begin
  select count(*) into n_ex from public.exercises   where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094';
  select count(*) into n_rt from public.routines    where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094';
  select count(*) into n_cp from public.cardio_plan where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094';
  select count(*) into n_ph from public.training_phases
    where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094' and is_active;

  -- El catálogo es acumulativo: 41 es el piso (23 de AJUSTE 1 + 18 nuevos), no
  -- el número exacto. Exigir igualdad haría fallar el seed en cuanto el usuario
  -- cree un ejercicio suyo desde la app.
  if n_ex <  41 then raise exception 'Ejercicios: esperaba al menos 41, hay %', n_ex; end if;
  -- Estas tres sí se reemplazan enteras, así que acá los números son exactos.
  if n_rt <> 35 then raise exception 'Rutinas: esperaba 35, hay %', n_rt; end if;
  if n_cp <>  5 then raise exception 'Cardio: esperaba 5 días, hay %', n_cp; end if;
  if n_ph <>  1 then raise exception 'Fases activas: esperaba 1, hay %', n_ph; end if;

  -- La trampa que el `join` del paso 4 puede esconder: si un nombre de la
  -- rutina no existe en el catálogo, esa fila simplemente no entra y el conteo
  -- de arriba ya la caza. Esto atrapa lo contrario y más silencioso: que un
  -- ejercicio de esta fase quedara huérfano de rutina por un nombre mal escrito
  -- en el paso 3 (entró al catálogo, pero nadie lo usa).
  select count(*) into n_hu
    from public.exercises e
   where e.user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094'
     and e.name in (
       'Sentadilla hacka en máquina','Zancadas con mancuernas en movimiento',
       'Prensa de piernas inclinada','Leg curl unilateral de pie en máquina',
       'Press de banca plana con barra','Fondos en paralelas',
       'Aperturas de pecho con polea alta de pie','Press de pecho en máquina',
       'Elevaciones frontales con cuerda en polea baja (de pie)',
       'Rear delt unilateral en polea','Face Pull','Lat Pulldown',
       'Pull-over con cuerda en polea','Tríceps katana en polea (neutro)',
       'Extensión de tríceps en polea alta (overhead) con cuerda',
       'Curl de bíceps predicador en máquina','Curl de bíceps con polea (barra)',
       'Curl bayesian en polea','Curl de muñeca sentado con barra EZ'
     )
     and not exists (select 1 from public.routines r where r.exercise_id = e.id);
  if n_hu <> 0 then raise exception '% ejercicio(s) nuevos sin fila de rutina', n_hu; end if;
end $$;

commit;
