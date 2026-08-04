-- =============================================================================
--  1) Exportación completa por rango de fechas (para análisis posterior)
--  2) Seed del cardio y de la fase, desde el PDF
-- =============================================================================

-- ── Exportación: una fila por serie + una fila por sesión de cardio ──────────
--  Incluye lo prescrito junto a lo ejecutado, para poder comparar
--  objetivo vs real (reps, RPE, descanso, cadencia).
create or replace function public.export_training_data(
  p_from date default '1900-01-01',
  p_to   date default '2999-12-31'
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
  registrado_en         timestamptz
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
         l.created_at
    from public.workout_logs l
    join public.exercises e on e.id = l.exercise_id
    join dias d on d.n = extract(dow from l.workout_date)::int
    left join public.routines r
           on r.exercise_id = l.exercise_id
          and r.user_id     = l.user_id
          and r.day_of_week = extract(dow from l.workout_date)::int
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
         c.created_at
    from public.cardio_logs c
    join dias d on d.n = extract(dow from c.workout_date)::int
    left join public.cardio_plan cp
           on cp.user_id     = c.user_id
          and cp.day_of_week = extract(dow from c.workout_date)::int
   where c.user_id = (select auth.uid())
     and c.workout_date between p_from and p_to

  order by 2, 1, 4, 6;
$$;

-- ── Seed: cardio LISS del PDF ────────────────────────────────────────────────
--  Distribución semanal: Día1-5 → 10 min · Día6-7 → 45 min
delete from public.cardio_plan where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094';

insert into public.cardio_plan (user_id, day_of_week, modality, target_minutes)
values
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 1, 'Cinta con inclinación — caminar rápido (sin trotar)', 10),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 2, 'Cinta con inclinación — caminar rápido (sin trotar)', 10),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 3, 'Cinta con inclinación — caminar rápido (sin trotar)', 10),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 4, 'Cinta con inclinación — caminar rápido (sin trotar)', 10),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 5, 'Cinta con inclinación — caminar rápido (sin trotar)', 10),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 6, 'Cinta con inclinación — caminar rápido (sin trotar)', 45),
  ('345f2fa2-eedc-481d-ba93-4f186fab0094', 0, 'Cinta con inclinación — caminar rápido (sin trotar)', 45);

-- ── Seed: fase activa del PDF ────────────────────────────────────────────────
delete from public.training_phases where user_id = '345f2fa2-eedc-481d-ba93-4f186fab0094';

insert into public.training_phases
  (user_id, name, started_on, rpe_target, rir_target, method, warmup, is_active)
values (
  '345f2fa2-eedc-481d-ba93-4f186fab0094',
  'FASE – AJUSTE 1',
  '2026-08-03',
  '7/10',
  '3',
  'Super series',
  'Cycling/caminadora 5 min · Movilidad articular 5 min · Series de aproximación',
  true
);
