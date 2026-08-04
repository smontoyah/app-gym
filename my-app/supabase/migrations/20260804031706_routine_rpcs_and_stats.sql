-- =============================================================================
--  RPCs: escrituras atómicas de rutina + estadísticas agregadas en el servidor.
--  security invoker  ⇒ la RLS del usuario sigue aplicando.
--  search_path = ''  ⇒ todo va calificado por esquema.
-- =============================================================================

-- ── Reordenar dos ejercicios de un día, atómico ──────────────────────────────
create or replace function public.swap_routine_order(p_a uuid, p_b uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_a smallint; v_b smallint;
begin
  select sort_order into v_a from public.routines where id = p_a;
  select sort_order into v_b from public.routines where id = p_b;
  if v_a is null or v_b is null then
    raise exception 'Rutina no encontrada';
  end if;
  update public.routines set sort_order = v_b where id = p_a;
  update public.routines set sort_order = v_a where id = p_b;
end;
$$;

-- ── Mover la rutina de un día a otro, atómico ────────────────────────────────
create or replace function public.move_routine_to_day(p_source smallint, p_target smallint)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_next  smallint;
  v_moved integer := 0;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if p_source = p_target then raise exception 'El día origen y destino son el mismo'; end if;

  select count(*) into v_next
    from public.routines where user_id = v_uid and day_of_week = p_target;

  -- Los que ya existen en el destino se descartan del origen (sin duplicar).
  delete from public.routines src
   where src.user_id = v_uid
     and src.day_of_week = p_source
     and exists (
       select 1 from public.routines tgt
        where tgt.user_id     = v_uid
          and tgt.day_of_week = p_target
          and tgt.exercise_id = src.exercise_id);

  -- El resto se reasigna preservando el orden relativo.
  with ordered as (
    select id, (row_number() over (order by sort_order) - 1 + v_next)::smallint as new_order
      from public.routines
     where user_id = v_uid and day_of_week = p_source
  )
  update public.routines r
     set day_of_week = p_target, sort_order = o.new_order
    from ordered o
   where r.id = o.id;

  get diagnostics v_moved = row_count;
  return v_moved;
end;
$$;

-- ── Intercambiar dos días completos, atómico (una sola sentencia) ────────────
create or replace function public.swap_routine_days(p_a smallint, p_b smallint)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_n   integer := 0;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if p_a = p_b then raise exception 'Los dos días son el mismo'; end if;

  update public.routines
     set day_of_week = case when day_of_week = p_a then p_b else p_a end
   where user_id = v_uid and day_of_week in (p_a, p_b);

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ── Estadísticas agregadas del lado del servidor ─────────────────────────────
--  Reemplaza el `.limit(500)` del cliente, que con este plan (80 series/semana)
--  truncaba la historia en silencio a las ~6 semanas.
--  e1RM por Epley: peso × (1 + reps/30).
create or replace function public.exercise_stats(p_sessions integer default 10)
returns table (
  exercise_id    uuid,
  name           text,
  muscle_group   text,
  total_sessions bigint,
  last_date      date,
  last_weight    numeric,
  max_weight     numeric,
  last_e1rm      numeric,
  best_e1rm      numeric,
  recent         jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with per_session as (
    select l.exercise_id,
           l.workout_date,
           max(l.weight)                                          as top_weight,
           round(max(l.weight * (1 + l.reps::numeric / 30)), 1)    as top_e1rm,
           sum(l.weight * l.reps)                                  as volume,
           round(avg(l.rpe), 1)                                    as avg_rpe,
           count(*)                                                as sets,
           (array_agg(l.reps order by l.weight desc, l.reps desc))[1] as top_reps
      from public.workout_logs l
     where l.user_id = (select auth.uid())
     group by l.exercise_id, l.workout_date
  ),
  ranked as (
    select s.*, row_number() over (partition by s.exercise_id
                                       order by s.workout_date desc) as rn
      from per_session s
  )
  select e.id,
         e.name,
         e.muscle_group,
         agg.total_sessions,
         agg.last_date,
         agg.last_weight,
         agg.max_weight,
         agg.last_e1rm,
         agg.best_e1rm,
         coalesce(rec.recent, '[]'::jsonb)
    from public.exercises e
    join lateral (
      select count(*)                                                     as total_sessions,
             max(s.workout_date)                                          as last_date,
             max(s.top_weight)                                            as max_weight,
             max(s.top_e1rm)                                              as best_e1rm,
             (array_agg(s.top_weight order by s.workout_date desc))[1]    as last_weight,
             (array_agg(s.top_e1rm   order by s.workout_date desc))[1]    as last_e1rm
        from per_session s
       where s.exercise_id = e.id
    ) agg on agg.total_sessions > 0
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
   order by e.name;
$$;
