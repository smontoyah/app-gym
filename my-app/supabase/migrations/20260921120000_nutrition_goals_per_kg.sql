-- =============================================================================
--  Objetivos en g/kg, con un perfil para los días de ciclado de carbos
--
--  Los gramos absolutos envejecen con el peso: 170 g de proteína son 2,2 g/kg a
--  77 kg y 2,4 a 71. Lo que prescribe el entrenador es el ratio, así que es el
--  ratio lo que se guarda y el gramaje se deriva del pesaje vigente.
--
--  `energy_kcal` y `fiber_g` se quedan absolutos: la meta de calorías es un
--  número puesto a mano con regla de déficit, no algo que se mueva con el peso,
--  y la fibra se prescribe en g/día.
--
--  Esta migración NO borra las columnas viejas. El borrado va aparte, después
--  de verificar el backfill contra lo que había: una vez borradas no hay vuelta
--  atrás, y el dato de origen son cuatro números que no están en ningún lado
--  más.
-- =============================================================================

alter table public.nutrition_goals
  add column profile text not null default 'normal';

alter table public.nutrition_goals
  add constraint nutrition_goals_profile_check check (profile in ('normal', 'ciclado'));

-- La fila que ya existía queda como 'normal' por el default de arriba.
alter table public.nutrition_goals drop constraint nutrition_goals_pkey;
alter table public.nutrition_goals add primary key (user_id, profile);

alter table public.nutrition_goals
  add column protein_g_kg numeric,
  add column carbs_g_kg   numeric,
  add column fat_g_kg     numeric;

alter table public.nutrition_goals
  add constraint nutrition_goals_protein_kg_check
    check (protein_g_kg is null or protein_g_kg >= 0),
  add constraint nutrition_goals_carbs_kg_check
    check (carbs_g_kg is null or carbs_g_kg >= 0),
  add constraint nutrition_goals_fat_kg_check
    check (fat_g_kg is null or fat_g_kg >= 0);

comment on column public.nutrition_goals.protein_g_kg is
  'Gramos por kilo de peso corporal. El gramaje del día sale de multiplicar por el último pesaje.';

-- Backfill con el último pesaje de cada usuario. Dos decimales: la diferencia
-- contra el gramaje viejo queda en décimas (170 → 169,6 g de proteína) y es el
-- precio de que el número se pueda leer y teclear. El perfil 'ciclado' no se
-- crea acá a propósito: esos valores los pone el usuario, no una cuenta.
update public.nutrition_goals g
   set protein_g_kg = round(g.protein_g / w.weight_kg, 2),
       carbs_g_kg   = round(g.carbs_g   / w.weight_kg, 2),
       fat_g_kg     = round(g.fat_g     / w.weight_kg, 2)
  from (
    select distinct on (b.user_id) b.user_id, b.weight_kg
      from public.body_weight_logs b
     order by b.user_id, b.measured_at desc
  ) w
 where w.user_id = g.user_id and w.weight_kg > 0;

-- ── Qué día fue de ciclado ───────────────────────────────────────────────────
-- Solo hay fila en los días marcados: la ausencia es «día normal», que es la
-- mayoría, y así los 401 registros que ya existen no necesitan backfill.
create table public.nutrition_days (
  user_id      uuid not null references auth.users(id) on delete cascade,
  logged_on    date not null,
  goal_profile text not null check (goal_profile in ('normal', 'ciclado')),
  created_at   timestamptz not null default now(),
  primary key (user_id, logged_on)
);

comment on table public.nutrition_days is
  'Días que se salieron del perfil habitual. Sin fila = día normal.';

alter table public.nutrition_days enable row level security;

create policy "Users manage own nutrition_days" on public.nutrition_days
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
