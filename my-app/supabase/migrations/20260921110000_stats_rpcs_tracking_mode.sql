-- =============================================================================
--  Las estadísticas, con cardio dentro de workout_logs
--
--  `reps` y `weight` ahora pueden ser null. `sum(weight * reps)` ignora los
--  nulls, así que el volumen sobrevive solo; lo que NO sobrevive es `count(*)`,
--  que contaría una serie de caminadora como una serie de fuerza, ni el balance
--  por grupo, que pintaría «Cardio» como si fuera un músculo con récord de 0 kg.
--
--  El corte va por CATEGORÍA y no por modo, y los dos filtros usan el mismo
--  criterio a propósito: una plancha es Core en modo tiempo, es una serie de
--  trabajo real, y tiene que contar tanto en el total de series como en el
--  balance de Core. Si se cortara por `tracking_mode`, la plancha sumaría en un
--  lado y no en el otro, y los dos números dejarían de cuadrar en la misma
--  pantalla.
--
--  `pr_events` no lleva filtro: max(weight * (1 + reps/30)) sobre filas nulas da
--  null, y `top_e1rm > prev_best` con null no es true, así que el cardio queda
--  fuera de los récords por su cuenta. Está verificado, no supuesto.
--
--  security invoker  ⇒ la RLS del usuario sigue aplicando.
--  search_path = ''  ⇒ todo va calificado por esquema.
-- =============================================================================

-- Las dos que cambian de firma hay que soltarlas: `create or replace` no puede
-- cambiar la lista de columnas que devuelve.
drop function if exists public.exercise_stats(date, date, integer);
drop function if exists public.previous_sets(date, uuid[]);

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
               'sets',   r.sets
             ) order by r.workout_date desc) as recent
        from ranked r
       where r.exercise_id = e.id and r.rn <= p_sessions
    ) rec on true
   where e.user_id = (select auth.uid())
   order by agg.last_date desc, e.name;
$$;

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
  -- El join a `exercises` es nuevo: hace falta la categoría para poder dejar
  -- el cardio fuera de los conteos de fuerza y del balance por grupo.
  logs as (
    select l.exercise_id, l.workout_date, l.reps, l.weight, l.rpe, l.created_at,
           l.duration_seconds, e.muscle_group
      from public.workout_logs l
      join public.exercises e on e.id = l.exercise_id
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
           count(*) filter (where l.muscle_group <> 'Cardio')::bigint as sets,
           sum(l.weight * l.reps)                as volume,
           round(avg(l.rpe), 1)                  as avg_rpe,
           count(distinct l.exercise_id) filter (where l.muscle_group <> 'Cardio')::bigint
                                                 as exercises
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
    select count(*) filter (where l.muscle_group <> 'Cardio')::bigint as sets,
           coalesce(sum(l.weight * l.reps), 0)   as volume,
           round(avg(l.rpe), 1)                  as avg_rpe,
           count(distinct l.exercise_id) filter (where l.muscle_group <> 'Cardio')::bigint
                                                 as exercises
      from logs l, win w
     where l.workout_date between w.from_date and w.to_date
  ),
  prev_totals as (
    select count(*) filter (where l.muscle_group <> 'Cardio')::bigint as sets,
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
  -- El cardio ahora vive en dos lados: la tarjeta LISS (`cardio_logs`) y los
  -- ejercicios de tiempo de la rutina. Los minutos del período son la suma de
  -- ambos; los días se cuentan distintos para no contar dos veces una jornada
  -- que tuvo los dos.
  cardio_days as (
    select c.workout_date as day from cardio c, win w
     where c.workout_date between w.from_date and w.to_date
    union
    select l.workout_date from logs l, win w
     where l.workout_date between w.from_date and w.to_date
       and l.duration_seconds is not null
  ),
  range_cardio as (
    select (select count(*) from cardio_days)::bigint as sessions,
           ((select coalesce(sum(c.minutes), 0) from cardio c, win w
              where c.workout_date between w.from_date and w.to_date)
            + (select coalesce(round(sum(l.duration_seconds) / 60.0), 0) from logs l, win w
                where l.workout_date between w.from_date and w.to_date))::bigint as minutes
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
    select l.muscle_group                         as grp,
           count(*)::bigint                       as sets,
           sum(l.weight * l.reps)                 as volume,
           count(distinct l.workout_date)::bigint as sessions
      from logs l, win w
     where l.workout_date between w.from_date and w.to_date
       -- El cardio no es un músculo: sin esto la caminadora se abría su
       -- propia barra en «Balance por grupo».
       and l.muscle_group <> 'Cardio'
     group by l.muscle_group
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

create or replace function public.previous_sets(p_before date, p_exercise_ids uuid[])
returns table (
  exercise_id  uuid,
  workout_date date,
  set_number   smallint,
  reps         smallint,
  weight       numeric,
  duration_seconds integer,
  rpe          numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with last_dates as (
    select l.exercise_id, max(l.workout_date) as d
      from public.workout_logs l
     where l.user_id      = (select auth.uid())
       and l.exercise_id  = any(p_exercise_ids)
       and l.workout_date < p_before
     group by l.exercise_id
  )
  select l.exercise_id, l.workout_date, l.set_number, l.reps, l.weight,
         l.duration_seconds, l.rpe
    from public.workout_logs l
    join last_dates d
      on d.exercise_id = l.exercise_id
     and d.d           = l.workout_date
   where l.user_id = (select auth.uid())
   order by l.exercise_id, l.set_number;
$$;

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
  -- Series de fuerza, y las de los ejercicios de cardio que ahora viven acá
  select case when e.tracking_mode = 'tiempo' then 'cardio' else 'fuerza' end::text,
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
         (l.duration_seconds / 60)::smallint,
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
