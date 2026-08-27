-- =============================================================================
--  TEAM KÝROS — FASE «AJUSTE 1» (RPE 7/10 · RIR 3 · Método: super series)
--  Fuente : PROTOCOLO DE ENTRENAMIENTO (AJUSTE1-S.S) — AGOSTO 3 DEL 2026
--  Usuario: smontoyah99@gmail.com = 345f2fa2-eedc-481d-ba93-4f186fab0094
--  Días   : D1→Lun(1) D2→Mar(2) D3→Mié(3,descanso) D4→Jue(4) D5→Vie(5)
--           D6→Sáb(6,desc. activo) D7→Dom(0,desc. activo)
--
--  Es idempotente y NO destructivo: se puede volver a correr sin perder nada.
--  Lo único que reemplaza es `routines`, la rutina de la semana. El catálogo de
--  ejercicios se hace por upsert y el historial de `workout_logs` no se toca.
--  Este archivo es la plantilla de la próxima fase: ver «Cuando llegue una fase
--  nueva» en supabase/README.md.
-- =============================================================================

begin;

-- 1) Se reemplaza la rutina de la semana. El catálogo y el historial NO.
--    `routines` es la prescripción de ESTA fase: entra una nueva, sale la
--    anterior. `exercises` y `workout_logs` sobreviven a todas las fases, así
--    que lo levantado en AJUSTE 1 se sigue pudiendo comparar contra AJUSTE 2.
--    Ya no es una convención: desde `exercises_never_deleted` las FK son ON
--    DELETE RESTRICT y Postgres rechaza el borrado aunque el seed lo intente.
delete from public.routines where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094';

-- 2) Catálogo de ejercicios (los 23 de esta fase)
--    Upsert, no delete-and-reinsert: los ejercicios de fases anteriores y los
--    que el usuario creó a mano desde la app siguen ahí, con su historial y su
--    id intactos. Si una fase repite un ejercicio, se le refresca el grupo
--    muscular y se reusa la MISMA fila, que es lo que mantiene enganchados los
--    workout_logs viejos.
insert into public.exercises (user_id, name, muscle_group)
select '345f2fa2-eedc-481d-ba93-4f186fab0094'::uuid, v.name, v.muscle_group
from (values
  ('Flexión de rodilla sentado en máquina',                     'Isquiotibiales'),
  ('Flexión de rodilla acostado en máquina',                    'Isquiotibiales'),
  ('Sentadilla hack',                                           'Cuádriceps'),
  ('Extensión de rodilla sentado en máquina',                   'Cuádriceps'),
  ('Sentadilla sumo con mancuerna',                             'Cuádriceps'),
  ('Estocadas con mancuernas (paso hacia atrás)',               'Glúteo'),
  ('Hip thrust con barra/máquina',                              'Glúteo'),
  ('Abducción de cadera sentado en máquina',                    'Glúteo medio'),
  ('Aducción de cadera sentado en máquina',                     'Aductores'),
  ('Plantiflexión en máquina (rodilla ligeramente flexionada)', 'Pantorrilla'),
  ('Plantiflexión sentado',                                     'Pantorrilla'),
  ('Press inclinado con mancuernas',                            'Pecho'),
  ('Pec deck en cabina',                                        'Pecho'),
  ('Press militar (neutro) con mancuernas en banco a 70°',      'Hombro'),
  ('Vuelos laterales con mancuernas',                           'Hombro'),
  ('Extensión de codo en polea alta con barra',                 'Tríceps'),
  ('Abdominales a 30° en colchoneta',                           'Core'),
  ('Pull down (neutro) en polea',                               'Espalda'),
  ('Remo (neutro) en máquina',                                  'Espalda'),
  ('Rear delt en cabina',                                       'Deltoide posterior'),
  ('Rear delt con mancuernas en banco inclinado',               'Deltoide posterior'),
  ('Curl de bíceps con barra (supinación)',                     'Bíceps'),
  ('Extensión de columna a 15° en banco',                       'Lumbares')
) as v(name, muscle_group)
on conflict (user_id, lower(name)) do update
  set muscle_group = excluded.muscle_group;

-- 3) Rutina semanal (24 filas)
insert into public.routines
  (user_id, day_of_week, exercise_id, sets, sort_order,
   target_reps, rest_seconds, cadence, superset_group, notes)
select '345f2fa2-eedc-481d-ba93-4f186fab0094'::uuid,
       v.day_of_week, e.id, v.sets, v.sort_order,
       v.target_reps, v.rest_seconds, v.cadence, v.superset_group, v.notes
from (values
  -- DÍA 1 · LUNES · PIERNA COMPLETA #1
  (1, 0, 'Flexión de rodilla sentado en máquina',                     4, '13',      90, '1-0-2', null::text, null::text),
  (1, 1, 'Sentadilla hack',                                           3, '13',     120, null,    null, null),
  (1, 2, 'Extensión de rodilla sentado en máquina',                   3, '13',      90, '1-1-2', null, null),
  (1, 3, 'Flexión de rodilla acostado en máquina',                    3, '13',      90, null,    null, null),
  (1, 4, 'Abducción de cadera sentado en máquina',                    3, '13',       0, '1-2-2', 'A',  'Super serie: encadena con plantiflexión, sin descanso'),
  (1, 5, 'Plantiflexión en máquina (rodilla ligeramente flexionada)', 3, '18',      70, '1-1-3', 'A',  null),
  -- DÍA 2 · MARTES · TORSO EMPUJES
  (2, 0, 'Press inclinado con mancuernas',                            3, '13',     120, null,    null, null),
  (2, 1, 'Pec deck en cabina',                                        3, '13',     120, '1-1-2', null, null),
  (2, 2, 'Press militar (neutro) con mancuernas en banco a 70°',      3, '13',     120, null,    null, null),
  (2, 3, 'Vuelos laterales con mancuernas',                           3, '13',      90, null,    null, null),
  (2, 4, 'Extensión de codo en polea alta con barra',                 4, '13',      90, null,    null, null),
  (2, 5, 'Abdominales a 30° en colchoneta',                           4, '26',      60, null,    null, null),
  -- DÍA 3 · MIÉRCOLES · DESCANSO (sin ejercicios)
  -- DÍA 4 · JUEVES · TORSO JALONES
  (4, 0, 'Pull down (neutro) en polea',                               3, '13',     120, null,    null, null),
  (4, 1, 'Rear delt en cabina',                                       4, '13',      90, '1-1-2', null, null),
  (4, 2, 'Remo (neutro) en máquina',                                  3, '13',     120, '1-1-2', null, null),
  (4, 3, 'Rear delt con mancuernas en banco inclinado',               3, '13',      90, '1-1-2', null, null),
  (4, 4, 'Curl de bíceps con barra (supinación)',                     4, '13',       0, null,    'B',  'Super serie: encadena con extensión de columna, sin descanso'),
  (4, 5, 'Extensión de columna a 15° en banco',                       4, '13',      60, '2-4-2', 'B',  null),
  -- DÍA 5 · VIERNES · PIERNA COMPLETA #2
  (5, 0, 'Hip thrust con barra/máquina',                              4, '13',     120, '1-2-1', null, null),
  (5, 1, 'Estocadas con mancuernas (paso hacia atrás)',               3, '13 c/u', 120, null,    null, null),
  (5, 2, 'Sentadilla sumo con mancuerna',                             3, '13',     120, '2-0-1', null, null),
  (5, 3, 'Aducción de cadera sentado en máquina',                     3, '13',      90, '1-1-2', null, null),
  (5, 4, 'Flexión de rodilla sentado en máquina',                     4, '13',      90, '1-0-2', null, null),
  (5, 5, 'Plantiflexión sentado',                                     3, '26',      70, '1-0-3', null, null)
) as v(day_of_week, sort_order, exercise_name, sets,
       target_reps, rest_seconds, cadence, superset_group, notes)
join public.exercises e
  on e.user_id     = '345f2fa2-eedc-481d-ba93-4f186fab0094'
 -- Case-insensitive igual que el unique del catálogo: el upsert conserva el
 -- nombre que ya estaba guardado, así que si esta fase lo escribe con otra caja
 -- un `=` exacto no encontraría la fila y la línea de rutina se perdería sin
 -- ruido (el bloque de verificación la cazaría, pero mejor no llegar ahí).
 and lower(e.name) = lower(v.exercise_name);

-- 4) Verificación (aborta la transacción si algo no cuadra)
do $$
declare n_ex int; n_rt int;
begin
  select count(*) into n_ex from public.exercises where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094';
  select count(*) into n_rt from public.routines  where user_id='345f2fa2-eedc-481d-ba93-4f186fab0094';
  -- El catálogo es acumulativo: 23 es el piso, no el número exacto. Exigir
  -- igualdad haría fallar el seed en cuanto el usuario cree un ejercicio suyo.
  if n_ex <  23 then raise exception 'Ejercicios: esperaba al menos 23, hay %', n_ex; end if;
  -- La rutina sí se reemplaza entera, así que acá el número es exacto.
  if n_rt <> 24 then raise exception 'Rutinas: esperaba 24, hay %', n_rt; end if;
end $$;

commit;
