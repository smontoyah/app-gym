-- =============================================================================
--  Cardio como ejercicio de la rutina
--
--  Hasta acá el cardio era una tarjeta aparte (`cardio_plan` / `cardio_logs`):
--  UN bloque de minutos por fecha, sin nombre propio y fuera de la rutina. Eso
--  se queda como está — es el LISS que prescribe el entrenador y tiene su
--  objetivo por día de la semana.
--
--  Lo que se abre acá es poder crear ejercicios de cardio con nombre
--  («caminadora inclinada»), meterlos en el plan de un día y registrarlos serie
--  por serie como cualquier otro. No entraban porque `reps` y `weight` eran
--  not null, y una serie de 45 minutos no tiene ni repeticiones ni kilos.
-- =============================================================================

-- La CATEGORÍA no necesita columna: `muscle_group` ya es texto libre sin
-- constraint, así que 'Cardio' entra como un valor más. Lo que sí hace falta es
-- cómo se MIDE el ejercicio, y va acá y no en `routines` porque una caminadora
-- se mide en minutos el lunes y el miércoles también: es una propiedad del
-- movimiento, no de la prescripción.
--
-- Es ortogonal a la categoría a propósito: una plancha es Core y es de tiempo.
alter table public.exercises
  add column tracking_mode text not null default 'carga';

alter table public.exercises
  add constraint exercises_tracking_mode_check
  check (tracking_mode in ('carga', 'reps', 'tiempo'));

comment on column public.exercises.tracking_mode is
  'Cómo se mide: carga (reps × peso), reps (solo repeticiones) o tiempo (segundos).';

-- Tope de 10 h. No es un límite de entrenamiento sino un filtro de tecleo,
-- mismo criterio que MAX_REPS y MAX_WEIGHT_KG en el cliente: atrapa el dígito
-- de más antes de que ensucie los promedios.
alter table public.workout_logs
  add column duration_seconds integer;

alter table public.workout_logs
  add constraint workout_logs_duration_check
  check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 36000));

comment on column public.workout_logs.duration_seconds is
  'Duración de la serie, en segundos. Solo en ejercicios con tracking_mode = tiempo.';

-- Nullable y NO cero: 0 kg ya es un valor real en el historial (los ejercicios
-- a peso corporal se registran así), de modo que un cero de «no aplica» sería
-- indistinguible de uno de «sin carga externa» y contaminaría cualquier
-- promedio. Las 502 filas existentes conservan su valor: soltar un not null no
-- toca los datos.
alter table public.workout_logs alter column reps   drop not null;
alter table public.workout_logs alter column weight drop not null;
