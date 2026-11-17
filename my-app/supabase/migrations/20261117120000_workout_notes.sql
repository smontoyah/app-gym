-- =============================================================================
--  Observaciones por ejercicio y por día
--
--  Lo que los números de `workout_logs` no explican: «hice hack squat porque la
--  prensa estaba ocupada», «serie 3 con menos peso, molestia en el hombro». Al
--  llenar el Sheet del entrenador cada nota se pasa como nota de celda en la
--  fila de ese ejercicio y la semana de esa fecha.
--
--  Tabla aparte y no columna de `workout_logs`: esa tabla tiene un renglón por
--  serie, así que la nota quedaría repetida en cada una, y una observación tiene
--  que poder existir aunque no se haya guardado ninguna serie («no lo hice»).
--
--  Una nota por ejercicio y fecha. Editarla pisa el renglón; vaciarla lo borra
--  (la app hace delete, nunca guarda texto en blanco).
-- =============================================================================

create table if not exists public.workout_notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  exercise_id  uuid not null references public.exercises(id) on delete restrict,
  workout_date date not null,
  note         text not null,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- La fecha va antes que el ejercicio: las dos lecturas son «las notas de este
  -- día» (pantalla de Ejercicio) y «las notas de esta fase» (Sheet), y ambas
  -- filtran por usuario y fecha. El orden no afecta al upsert, que infiere el
  -- índice por el conjunto de columnas.
  constraint workout_notes_unique unique (user_id, workout_date, exercise_id),
  -- Mismo tope que `NOTE_MAX_LENGTH` en lib/workout-notes.ts.
  constraint workout_notes_note_len check (length(btrim(note)) between 1 and 500)
);

-- La FK a `exercises` no queda cubierta por el índice único (no es la columna
-- líder) y el `on delete restrict` la consulta en cada intento de borrado.
create index if not exists idx_workout_notes_exercise
  on public.workout_notes(exercise_id);

-- Sin `drop ... if exists` delante (ni acá ni en la política): la tabla es nueva,
-- y cualquier DROP hace que el MCP de Supabase pida una confirmación que la
-- extensión de VSCode cancela sola.
create trigger workout_notes_touch_updated_at
  before insert or update on public.workout_notes
  for each row execute function public.touch_updated_at();

alter table public.workout_notes enable row level security;
create policy "Users manage own workout_notes" on public.workout_notes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Igual que body_weight_logs: `anon` no necesita nada de acá.
revoke all on table public.workout_notes from anon;

comment on table public.workout_notes is 'Observaciones por ejercicio y día: lo que los números no explican (cambio de máquina, molestias). Se pasan como nota de celda al Sheet del entrenador.';
