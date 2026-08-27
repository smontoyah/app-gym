-- =============================================================================
--  El catálogo de ejercicios es acumulativo
--
--  Hasta acá, cada fase del entrenador entraba con un seed que hacía
--  `delete from exercises` y volvía a sembrar. El catálogo no era un catálogo:
--  era la foto de la fase vigente. Y como las FK eran ON DELETE CASCADE, ese
--  delete se llevaba puesto en silencio todo `workout_logs`: cada AJUSTE nuevo
--  arrancaba de cero y las series levantadas en la fase anterior dejaban de
--  existir. Comparar una fase con la anterior —lo único que dice si el plan
--  funcionó— era justo lo que se perdía.
--
--  Desde acá un ejercicio se crea una vez y queda para siempre. Lo que cambia
--  entre fases es la RUTINA (qué toca el lunes, cuántas series), no el hecho de
--  que «Sentadilla hack» exista y de que alguien la haya levantado en agosto.
--
--  Tres cierres, porque el seed corre con `service_role` y saltea la RLS:
--    1. RESTRICT en las FK  → Postgres rechaza el delete. Es el que frena al seed.
--    2. Sin política DELETE → el cliente no puede ni intentarlo.
--    3. Unique por nombre   → el seed puede hacer upsert en vez de borrar y
--                             resembrar, que era la razón por la que borraba.
-- =============================================================================

-- ── 1) Borrar un ejercicio no puede vaciar el historial ──────────────────────
-- CASCADE era la elección equivocada para las dos: `routines` es la
-- prescripción vigente y `workout_logs` es el historial, y ninguna de las dos
-- debería desaparecer por lo bajo porque alguien tocó el catálogo. Con RESTRICT
-- el delete falla ruidosamente, que es lo que uno quiere de un dato irrepetible.
-- Ojo: RESTRICT es sobre el lado referenciado. Quitar un ejercicio de un día
-- (`delete from routines`) sigue funcionando igual que siempre.
alter table public.routines
  drop constraint routines_exercise_id_fkey,
  add  constraint routines_exercise_id_fkey
       foreign key (exercise_id) references public.exercises(id) on delete restrict;

alter table public.workout_logs
  drop constraint workout_logs_exercise_id_fkey,
  add  constraint workout_logs_exercise_id_fkey
       foreign key (exercise_id) references public.exercises(id) on delete restrict;

-- ── 2) El cliente no borra ejercicios ────────────────────────────────────────
-- La política única `for all` incluía DELETE. Nadie la usaba desde la app, pero
-- una tabla que no se borra nunca no tiene por qué conceder el permiso: se
-- separa en las tres sentencias que sí corresponden y DELETE queda sin política.
drop policy if exists "Users manage own exercises" on public.exercises;
drop policy if exists "Users read own exercises"   on public.exercises;
drop policy if exists "Users insert own exercises" on public.exercises;
drop policy if exists "Users update own exercises" on public.exercises;

create policy "Users read own exercises" on public.exercises
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own exercises" on public.exercises
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Se puede corregir un nombre o reasignar el grupo muscular: eso no pierde
-- historial, lo reetiqueta. El `with check` impide regalarle la fila a otro.
create policy "Users update own exercises" on public.exercises
  for update to authenticated
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sin RLS de DELETE ya no se puede, pero el revoke deja la intención escrita en
-- los privilegios: si alguien vuelve a crear una política `for all` de apuro,
-- esto sigue frenando el borrado.
revoke delete on public.exercises from authenticated, anon;

-- ── 3) Un ejercicio, una fila ────────────────────────────────────────────────
-- Si nada se borra, un duplicado por tipeo es permanente. `lower(name)` para
-- que «Sentadilla hack» y «sentadilla hack» sean el mismo ejercicio y no dos
-- historiales partidos al medio. Es además la clave que le permite al seed de
-- cada fase hacer `on conflict do update` en vez de borrar y resembrar.
create unique index if not exists exercises_user_name_unique
  on public.exercises (user_id, lower(name));

comment on table public.exercises is
  'Catálogo acumulativo: un ejercicio se crea una vez y no se borra nunca. Las FK desde routines y workout_logs son ON DELETE RESTRICT y no hay política de DELETE. Los seeds de fase hacen upsert por (user_id, lower(name)).';
