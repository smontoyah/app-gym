-- =============================================================================
--  Duración de la jornada
--  1) `updated_at` en los registros: cada input queda fechado, también al editar
--  2) `export_training_data` devuelve inicio, fin y duración de cada sesión
-- =============================================================================

-- ── 1) Marca de tiempo de cada input ─────────────────────────────────────────
--  `created_at` = primera vez que se guardó ese input.
--  `updated_at` = última vez que se tocó (corrección de reps, peso o RPE).
alter table public.workout_logs add column if not exists updated_at timestamptz;
alter table public.cardio_logs  add column if not exists updated_at timestamptz;

update public.workout_logs set updated_at = coalesce(created_at, now()) where updated_at is null;
update public.cardio_logs  set updated_at = coalesce(created_at, now()) where updated_at is null;

alter table public.workout_logs alter column updated_at set default now();
alter table public.workout_logs alter column updated_at set not null;
alter table public.cardio_logs  alter column updated_at set default now();
alter table public.cardio_logs  alter column updated_at set not null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists workout_logs_touch_updated_at on public.workout_logs;
create trigger workout_logs_touch_updated_at
  before insert or update on public.workout_logs
  for each row execute function public.touch_updated_at();

drop trigger if exists cardio_logs_touch_updated_at on public.cardio_logs;
create trigger cardio_logs_touch_updated_at
  before insert or update on public.cardio_logs
  for each row execute function public.touch_updated_at();

-- ── 2) Exportación con la duración de la jornada ─────────────────────────────
--  Cambia el tipo de `registrado_en` (timestamptz → texto en hora local),
--  así que hay que soltar la versión anterior antes de recrearla.
drop function if exists public.export_training_data(date, date);

create or replace function public.export_training_data(
  p_from date default '1900-01-01',
  p_to   date default '2999-12-31',
  p_tz   text default 'America/Bogota'
)
returns table (
  tipo                  text,
  fecha                 date,
  dia_semana            text,
  ejercicio             text,
  grupo_muscular        text,
  serie                 smallint,
  reps_objetivo         text,
  reps                  smallint,
  peso_kg               numeric,
  rpe                   numeric,
  e1rm_kg               numeric,
  volumen_kg            numeric,
  minutos               smallint,
  descanso_prescrito_s  integer,
  cadencia              text,
  super_serie           text,
  fase                  text,
  registrado_en         text,
  actualizado_en        text,
  inicio_sesion         text,
  fin_sesion            text,
  duracion_sesion_min   numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with dias as (
    select * from (values
      (0,'Domingo'),(1,'Lunes'),(2,'Martes'),(3,'Miércoles'),
      (4,'Jueves'),(5,'Viernes'),(6,'Sábado')
    ) as d(n, nombre)
  ),
  fase_activa as (
    select name from public.training_phases
     where user_id = (select auth.uid()) and is_active
     limit 1
  ),
  -- La jornada va del primer input al último, cardio incluido.
  -- Se usa `created_at` y no `updated_at` a propósito: corregir una serie
  -- días después no debe estirar la duración de aquella sesión.
  sesiones as (
    select t.dia, min(t.ts) as inicio, max(t.ts) as fin
      from (
        select w.workout_date as dia, w.created_at as ts
          from public.workout_logs w
         where w.user_id = (select auth.uid())
           and w.created_at is not null
           and w.workout_date between p_from and p_to
        union all
        select c.workout_date, c.created_at
          from public.cardio_logs c
         where c.user_id = (select auth.uid())
           and c.workout_date between p_from and p_to
      ) t
     group by t.dia
  )
  -- Series de fuerza
  select 'fuerza'::text,
         l.workout_date,
         d.nombre,
         e.name,
         e.muscle_group,
         l.set_number,
         r.target_reps,
         l.reps,
         l.weight,
         l.rpe,
         round(l.weight * (1 + l.reps::numeric / 30), 1),
         round(l.weight * l.reps, 1),
         null::smallint,
         r.rest_seconds,
         r.cadence,
         r.superset_group,
         (select name from fase_activa),
         to_char(l.created_at at time zone p_tz, 'YYYY-MM-DD HH24:MI:SS'),
         to_char(l.updated_at at time zone p_tz, 'YYYY-MM-DD HH24:MI:SS'),
         to_char(s.inicio     at time zone p_tz, 'YYYY-MM-DD HH24:MI:SS'),
         to_char(s.fin        at time zone p_tz, 'YYYY-MM-DD HH24:MI:SS'),
         round(extract(epoch from (s.fin - s.inicio)) / 60.0, 1)
    from public.workout_logs l
    join public.exercises e on e.id = l.exercise_id
    join dias d on d.n = extract(dow from l.workout_date)::int
    left join public.routines r
           on r.exercise_id = l.exercise_id
          and r.user_id     = l.user_id
          and r.day_of_week = extract(dow from l.workout_date)::int
    left join sesiones s on s.dia = l.workout_date
   where l.user_id = (select auth.uid())
     and l.workout_date between p_from and p_to

  union all

  -- Sesiones de cardio
  select 'cardio'::text,
         c.workout_date,
         d.nombre,
         coalesce(c.modality, 'Cardio LISS'),
         'Cardiovascular',
         null::smallint,
         cp.target_minutes::text,
         null::smallint,
         null::numeric,
         null::numeric,
         null::numeric,
         null::numeric,
         c.minutes,
         null::integer,
         null::text,
         null::text,
         (select name from fase_activa),
         to_char(c.created_at at time zone p_tz, 'YYYY-MM-DD HH24:MI:SS'),
         to_char(c.updated_at at time zone p_tz, 'YYYY-MM-DD HH24:MI:SS'),
         to_char(s.inicio     at time zone p_tz, 'YYYY-MM-DD HH24:MI:SS'),
         to_char(s.fin        at time zone p_tz, 'YYYY-MM-DD HH24:MI:SS'),
         round(extract(epoch from (s.fin - s.inicio)) / 60.0, 1)
    from public.cardio_logs c
    join dias d on d.n = extract(dow from c.workout_date)::int
    left join public.cardio_plan cp
           on cp.user_id     = c.user_id
          and cp.day_of_week = extract(dow from c.workout_date)::int
    left join sesiones s on s.dia = c.workout_date
   where c.user_id = (select auth.uid())
     and c.workout_date between p_from and p_to

  order by 2, 1, 4, 6;
$$;
