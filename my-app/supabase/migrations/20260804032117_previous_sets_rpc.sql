-- Series de la última sesión previa de cada ejercicio.
-- Reemplaza el `.limit(50)` del cliente, que truncaba cuando varios ejercicios
-- tenían fechas distintas y dejaba tarjetas sin referencia "anterior:".
create or replace function public.previous_sets(p_before date, p_exercise_ids uuid[])
returns table (
  exercise_id  uuid,
  workout_date date,
  set_number   smallint,
  reps         smallint,
  weight       numeric,
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
  select l.exercise_id, l.workout_date, l.set_number, l.reps, l.weight, l.rpe
    from public.workout_logs l
    join last_dates d
      on d.exercise_id = l.exercise_id
     and d.d           = l.workout_date
   where l.user_id = (select auth.uid())
   order by l.exercise_id, l.set_number;
$$;
