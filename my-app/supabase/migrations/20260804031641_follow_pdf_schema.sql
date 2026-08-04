-- =============================================================================
--  Esquema para poder seguir el PDF del entrenador de punta a punta.
--  · RPE por serie          (la fase se define por RPE 7/10 · RIR 3)
--  · Ilustración por ejercicio
--  · Fase / mesociclo       (FASE – AJUSTE 1, y las que vengan)
--  · Cardio LISS            (~140 min/semana que hoy no existen en la app)
-- =============================================================================

-- ── RPE por serie ────────────────────────────────────────────────────────────
alter table public.workout_logs
  add column if not exists rpe numeric(3,1);

do $$ begin
  alter table public.workout_logs
    add constraint workout_logs_rpe_check check (rpe is null or (rpe >= 1 and rpe <= 10));
exception when duplicate_object then null; end $$;

-- ── Ilustración del ejercicio ────────────────────────────────────────────────
alter table public.exercises
  add column if not exists image_url text;

-- ── Fase / mesociclo ─────────────────────────────────────────────────────────
create table if not exists public.training_phases (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  started_on date not null,
  rpe_target text,
  rir_target text,
  method     text,
  warmup     text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_training_phases_user on public.training_phases(user_id);
create unique index if not exists idx_training_phases_one_active
  on public.training_phases(user_id) where is_active;

alter table public.training_phases enable row level security;
drop policy if exists "Users manage own training_phases" on public.training_phases;
create policy "Users manage own training_phases" on public.training_phases
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── Prescripción de cardio ───────────────────────────────────────────────────
create table if not exists public.cardio_plan (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  day_of_week    smallint not null check (day_of_week between 0 and 6),
  modality       text not null,
  target_minutes smallint not null check (target_minutes > 0),
  created_at     timestamptz not null default now(),
  unique (user_id, day_of_week)
);

create index if not exists idx_cardio_plan_user on public.cardio_plan(user_id);

alter table public.cardio_plan enable row level security;
drop policy if exists "Users manage own cardio_plan" on public.cardio_plan;
create policy "Users manage own cardio_plan" on public.cardio_plan
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── Registro de cardio ───────────────────────────────────────────────────────
create table if not exists public.cardio_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  workout_date date not null default current_date,
  minutes      smallint not null check (minutes > 0),
  modality     text,
  created_at   timestamptz not null default now(),
  unique (user_id, workout_date)
);

create index if not exists idx_cardio_logs_user_date on public.cardio_logs(user_id, workout_date desc);

alter table public.cardio_logs enable row level security;
drop policy if exists "Users manage own cardio_logs" on public.cardio_logs;
create policy "Users manage own cardio_logs" on public.cardio_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
