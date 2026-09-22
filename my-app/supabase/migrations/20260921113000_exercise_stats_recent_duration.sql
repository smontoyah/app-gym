-- =============================================================================
--  `recent` lleva también los minutos de cada sesión
--
--  La mini-gráfica y la tendencia de la tarjeta se calculan sobre `recent`. Sin
--  la duración ahí, un ejercicio de tiempo graficaría sus repeticiones —que son
--  null, o sea cero— y se vería como una línea plana en el piso: peor que no
--  mostrar nada, porque parece un dato.
--
--  `per_session.duration_secs` ya existe desde la migración anterior; lo único
--  que falta es sacarlo por el jsonb. La firma no cambia (`recent` sigue siendo
--  una columna jsonb), así que no hace falta soltar la función.
-- =============================================================================

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
  recent       jsonb,
  -- Para que la tarjeta sepa si decir kilos o minutos.
  tracking_mode text,
  duration_min numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with logs as (
    select l.exercise_id, l.workout_date, l.reps, l.weight, l.rpe, l.duration_seconds
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
           sum(g.duration_seconds)                                    as duration_secs,
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
         coalesce(rec.recent, '[]'::jsonb),
         e.tracking_mode,
         round(agg.duration_secs / 60.0, 1)
    from public.exercises e
    join lateral (
      select count(*)                                                  as sessions,
             sum(r.sets)::bigint                                       as sets,
             sum(r.volume)                                             as volume,
             sum(r.duration_secs)                                      as duration_secs,
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
               'sets',   r.sets,
               'duration', round(r.duration_secs / 60.0, 1)
             ) order by r.workout_date desc) as recent
        from ranked r
       where r.exercise_id = e.id and r.rn <= p_sessions
    ) rec on true
   where e.user_id = (select auth.uid())
   order by agg.last_date desc, e.name;
$$;
