-- =============================================================================
--  Estadísticas por rango de fechas
--  1) `exercise_stats` acepta un rango: lo del período se separa del PR de siempre
--  2) `training_summary`: un resumen del período + el anterior para comparar,
--     serie por día, balance por grupo muscular, récords y qué quedó sin tocar
--  security invoker  ⇒ la RLS del usuario sigue aplicando.
--  search_path = ''  ⇒ todo va calificado por esquema.
-- =============================================================================

-- ── 1) Estadísticas por ejercicio, acotadas a un rango ───────────────────────
--  La firma cambia (antes `exercise_stats(p_sessions integer)`): hay que soltar
--  la anterior porque `create or replace` no puede cambiar la lista de args.
drop function if exists public.exercise_stats(integer);

create or replace function public.exercise_stats(
  p_from     date    default '1900-01-01',
  p_to       date    default '2999-12-31',
  p_sessions integer default 12
)
returns table (
  exercise_id  uuid,
  name         text,
  muscle_group text,
  -- Del rango pedido
  sessions     bigint,
  sets         bigint,
  volume       numeric,
  avg_rpe      numeric,
  last_date    date,
  last_weight  numeric,
  last_reps    smallint,
  last_e1rm    numeric,
  -- De siempre: un récord no deja de serlo por mirar sólo la última semana
  max_weight   numeric,
  best_e1rm    numeric,
  pr_date      date,
  recent       jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with logs as (
    select l.exercise_id, l.workout_date, l.reps, l.weight, l.rpe
      from public.workout_logs l
     where l.user_id = (select auth.uid())
  ),
  -- Una sesión = un ejercicio en un día. e1RM por Epley: peso × (1 + reps/30).
  per_session as (
    select g.exercise_id,
           g.workout_date,
           max(g.weight)                                              as top_weight,
           round(max(g.weight * (1 + g.reps::numeric / 30)), 1)        as top_e1rm,
           sum(g.weight * g.reps)                                     as volume,
           round(avg(g.rpe), 1)                                       as avg_rpe,
           count(*)                                                   as sets,
           (array_agg(g.reps order by g.weight desc, g.reps desc))[1] as top_reps
      from logs g
     group by g.exercise_id, g.workout_date
  ),
  all_time as (
    select p.exercise_id,
           max(p.top_weight) as max_weight,
           max(p.top_e1rm)   as best_e1rm,
           (array_agg(p.workout_date order by p.top_e1rm desc, p.workout_date desc))[1] as pr_date
      from per_session p
     group by p.exercise_id
  ),
  ranked as (
    select p.*,
           row_number() over (partition by p.exercise_id order by p.workout_date desc) as rn
      from per_session p
     where p.workout_date between p_from and p_to
  )
  select e.id,
         e.name,
         e.muscle_group,
         agg.sessions,
         agg.sets,
         agg.volume,
         -- Promedio sobre las series del rango, no sobre los promedios diarios.
         (select round(avg(x.rpe), 1) from logs x
           where x.exercise_id = e.id and x.workout_date between p_from and p_to),
         agg.last_date,
         agg.last_weight,
         agg.last_reps,
         agg.last_e1rm,
         pr.max_weight,
         pr.best_e1rm,
         pr.pr_date,
         coalesce(rec.recent, '[]'::jsonb)
    from public.exercises e
    join lateral (
      select count(*)                                                  as sessions,
             sum(r.sets)::bigint                                       as sets,
             sum(r.volume)                                             as volume,
             max(r.workout_date)                                       as last_date,
             (array_agg(r.top_weight order by r.workout_date desc))[1] as last_weight,
             (array_agg(r.top_reps   order by r.workout_date desc))[1] as last_reps,
             (array_agg(r.top_e1rm   order by r.workout_date desc))[1] as last_e1rm
        from ranked r
       where r.exercise_id = e.id
    ) agg on agg.sessions > 0
    left join all_time pr on pr.exercise_id = e.id
    left join lateral (
      select jsonb_agg(jsonb_build_object(
               'date',   r.workout_date,
               'weight', r.top_weight,
               'reps',   r.top_reps,
               'e1rm',   r.top_e1rm,
               'volume', r.volume,
               'rpe',    r.avg_rpe,
               'sets',   r.sets
             ) order by r.workout_date desc) as recent
        from ranked r
       where r.exercise_id = e.id and r.rn <= p_sessions
    ) rec on true
   where e.user_id = (select auth.uid())
   order by agg.last_date desc, e.name;
$$;

-- ── 2) Resumen del período ───────────────────────────────────────────────────
--  Un número solo no dice nada: cada total viene con el del período anterior
--  de igual longitud, que es lo que lo vuelve interpretable.
--  Los días se cuentan acá pero los «hace N días» se calculan en el cliente:
--  el servidor está en UTC y el `current_date` de la noche colombiana ya cambió.
create or replace function public.training_summary(
  p_from date default '1900-01-01',
  p_to   date default '2999-12-31'
)
returns table (
  sessions         bigint,
  sets             bigint,
  volume           numeric,
  avg_rpe          numeric,
  exercises        bigint,
  avg_duration_min numeric,
  cardio_sessions  bigint,
  cardio_minutes   bigint,
  prev_sessions    bigint,
  prev_sets        bigint,
  prev_volume      numeric,
  prev_avg_rpe     numeric,
  by_day           jsonb,
  by_muscle        jsonb,
  records          jsonb,
  stale            jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with win as (
    select p_from as from_date, p_to as to_date, (p_to - p_from + 1) as len
  ),
  prev_win as (
    select (p_from - w.len)::date as from_date, (p_from - 1)::date as to_date from win w
  ),
  logs as (
    select l.exercise_id, l.workout_date, l.reps, l.weight, l.rpe, l.created_at
      from public.workout_logs l
     where l.user_id = (select auth.uid())
  ),
  cardio as (
    select c.workout_date, c.minutes, c.created_at
      from public.cardio_logs c
     where c.user_id = (select auth.uid())
  ),
  -- La jornada va del primer input al último, cardio incluido. Se mira
  -- `created_at`: corregir una serie días después no estira aquella sesión.
  -- Misma regla que `export_training_data`, para que app y CSV coincidan.
  day_window as (
    select t.day, min(t.ts) as started, max(t.ts) as ended
      from (
        select l.workout_date as day, l.created_at as ts from logs l where l.created_at is not null
        union all
        select c.workout_date, c.created_at from cardio c
      ) t
     group by t.day
  ),
  day_strength as (
    select l.workout_date                        as day,
           count(*)::bigint                      as sets,
           sum(l.weight * l.reps)                as volume,
           round(avg(l.rpe), 1)                  as avg_rpe,
           count(distinct l.exercise_id)::bigint as exercises
      from logs l
     group by l.workout_date
  ),
  days as (
    select coalesce(ds.day, c.workout_date)  as day,
           coalesce(ds.sets, 0)              as sets,
           coalesce(ds.volume, 0)            as volume,
           ds.avg_rpe,
           coalesce(ds.exercises, 0)         as exercises,
           coalesce(c.minutes, 0)            as minutes,
           round(extract(epoch from (dw.ended - dw.started)) / 60.0, 0) as duration_min
      from day_strength ds
      full join cardio c on c.workout_date = ds.day
      left join day_window dw on dw.day = coalesce(ds.day, c.workout_date)
  ),
  range_totals as (
    select count(*)::bigint                      as sets,
           coalesce(sum(l.weight * l.reps), 0)   as volume,
           round(avg(l.rpe), 1)                  as avg_rpe,
           count(distinct l.exercise_id)::bigint as exercises
      from logs l, win w
     where l.workout_date between w.from_date and w.to_date
  ),
  prev_totals as (
    select count(*)::bigint                    as sets,
           coalesce(sum(l.weight * l.reps), 0) as volume,
           round(avg(l.rpe), 1)                as avg_rpe
      from logs l, prev_win p
     where l.workout_date between p.from_date and p.to_date
  ),
  range_days as (
    -- Un día de una sola serie da duración 0: no arrastra el promedio.
    select count(*)::bigint                          as sessions,
           round(avg(nullif(d.duration_min, 0)), 0)  as avg_duration_min
      from days d, win w
     where d.day between w.from_date and w.to_date
  ),
  prev_days as (
    select count(*)::bigint as sessions
      from days d, prev_win p
     where d.day between p.from_date and p.to_date
  ),
  range_cardio as (
    select count(*)::bigint                    as sessions,
           coalesce(sum(c.minutes), 0)::bigint as minutes
      from cardio c, win w
     where c.workout_date between w.from_date and w.to_date
  ),
  by_day as (
    select jsonb_agg(jsonb_build_object(
             'date',      d.day,
             'sets',      d.sets,
             'volume',    d.volume,
             'rpe',       d.avg_rpe,
             'exercises', d.exercises,
             'minutes',   d.minutes,
             'duration',  d.duration_min
           ) order by d.day) as js
      from days d, win w
     where d.day between w.from_date and w.to_date
  ),
  muscle as (
    select e.muscle_group                        as grp,
           count(*)::bigint                      as sets,
           sum(l.weight * l.reps)                as volume,
           count(distinct l.workout_date)::bigint as sessions
      from logs l
      join public.exercises e on e.id = l.exercise_id, win w
     where l.workout_date between w.from_date and w.to_date
     group by e.muscle_group
  ),
  by_muscle as (
    select jsonb_agg(jsonb_build_object(
             'group',    m.grp,
             'sets',     m.sets,
             'volume',   m.volume,
             'sessions', m.sessions
           ) order by m.sets desc, m.grp) as js
      from muscle m
  ),
  -- Un récord es una sesión que supera a TODAS las anteriores de ese ejercicio.
  -- La primera de todas no cuenta: sin nada que batir no hay récord.
  pr_events as (
    select p.exercise_id, p.workout_date, p.top_e1rm, p.prev_best
      from (
        select ps.exercise_id, ps.workout_date, ps.top_e1rm,
               max(ps.top_e1rm) over (
                 partition by ps.exercise_id order by ps.workout_date
                 rows between unbounded preceding and 1 preceding
               ) as prev_best
          from (
            select l.exercise_id, l.workout_date,
                   round(max(l.weight * (1 + l.reps::numeric / 30)), 1) as top_e1rm
              from logs l
             group by l.exercise_id, l.workout_date
          ) ps
      ) p
     where p.prev_best is not null and p.top_e1rm > p.prev_best
  ),
  records as (
    select jsonb_agg(jsonb_build_object(
             'exerciseId',  e.id,
             'name',        e.name,
             'muscleGroup', e.muscle_group,
             'date',        pe.workout_date,
             'e1rm',        pe.top_e1rm,
             'prevBest',    pe.prev_best
           ) order by pe.workout_date desc, pe.top_e1rm desc) as js
      from pr_events pe
      join public.exercises e on e.id = pe.exercise_id, win w
     where pe.workout_date between w.from_date and w.to_date
  ),
  -- Sólo ejercicios que siguen en la rutina: no tiene sentido avisar de uno
  -- que el entrenador ya sacó del plan.
  stale as (
    select jsonb_agg(jsonb_build_object(
             'exerciseId',  e.id,
             'name',        e.name,
             'muscleGroup', e.muscle_group,
             'lastDate',    lg.last_date
           ) order by lg.last_date asc nulls first, e.name) as js
      from (select distinct r.exercise_id
              from public.routines r
             where r.user_id = (select auth.uid())) rt
      join public.exercises e on e.id = rt.exercise_id
      left join lateral (
        select max(l.workout_date) as last_date from logs l where l.exercise_id = e.id
      ) lg on true
  )
  select rd.sessions,
         rt.sets,
         rt.volume,
         rt.avg_rpe,
         rt.exercises,
         rd.avg_duration_min,
         rc.sessions,
         rc.minutes,
         pd.sessions,
         pt.sets,
         pt.volume,
         pt.avg_rpe,
         coalesce(bd.js, '[]'::jsonb),
         coalesce(bm.js, '[]'::jsonb),
         coalesce(rec.js, '[]'::jsonb),
         coalesce(st.js, '[]'::jsonb)
    from range_days rd, range_totals rt, range_cardio rc,
         prev_days pd, prev_totals pt,
         by_day bd, by_muscle bm, records rec, stale st;
$$;
