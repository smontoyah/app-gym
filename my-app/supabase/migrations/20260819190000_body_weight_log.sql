-- =============================================================================
--  Registro de peso corporal
--
--  Un renglón por pesaje. `measured_at` es timestamptz y no una fecha como en el
--  resto de la app a propósito: el peso de la mañana en ayunas y el de la noche
--  se separan por más de un kilo, así que la hora es parte del dato y no un
--  detalle de auditoría. Quien mira la gráfica quiere una serie en el tiempo,
--  no un total por jornada.
--
--  Se guarda en kilogramos, igual que `workout_logs.weight`. La tabla se llama
--  body_weight_logs y no weight_logs justamente para no confundirse con esa: una
--  es lo que pesa el usuario, la otra lo que levantó.
-- =============================================================================

create table if not exists public.body_weight_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,

  weight_kg   numeric(5,2) not null,
  measured_at timestamptz not null default now(),
  note        text,

  created_at  timestamptz not null default now(),

  -- Cordura, no juicio clínico: descarta el dedo pegado en el teclado (7 kg,
  -- 743 kg) sin opinar sobre el peso de nadie. El rango fino lo valida la app,
  -- que puede explicar el rechazo; acá solo se cierra la puerta a lo imposible.
  constraint body_weight_logs_kg_sane check (weight_kg > 0 and weight_kg < 500)
);

-- La única consulta es «mis pesajes, del más nuevo al más viejo».
create index if not exists idx_body_weight_logs_user_at
  on public.body_weight_logs(user_id, measured_at desc);

alter table public.body_weight_logs enable row level security;
drop policy if exists "Users manage own body_weight_logs" on public.body_weight_logs;
create policy "Users manage own body_weight_logs" on public.body_weight_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- El rol anónimo no necesita nada de acá. La RLS ya bloquea las filas (la
-- política es `to authenticated`), pero Supabase concede todo a `anon` por
-- privilegios por defecto y esto además saca la tabla del esquema expuesto,
-- igual que se hizo con exercises/routines/workout_logs.
revoke all on table public.body_weight_logs from anon;
