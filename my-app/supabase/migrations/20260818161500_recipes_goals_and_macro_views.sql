-- =============================================================================
--  Recetas, objetivos diarios y resolución de macros
--
--  · recipes / recipe_items : un preparado hecho de productos del catálogo.
--  · nutrition_goals        : meta diaria de macros, una fila por usuario.
--  · nutrition_logs         : pasa a aceptar producto O receta (exactamente uno).
--  · recipe_nutrition       : macros totales de cada receta y su peso base.
--  · nutrition_log_macros   : cada renglón del diario ya resuelto a macros.
--
--  LA CLAVE DE LAS RECETAS ES recipes.yield_g: el peso del preparado terminado
--  en la balanza, que NO es la suma de los ingredientes. Al cocinar se evapora
--  agua (un guiso pesa menos) o se absorbe (el arroz pesa más). Escalar una
--  porción servida contra la suma de ingredientes en vez de contra el peso real
--  del preparado desvía todos los macros. Si yield_g es null, se cae a la suma
--  de ingredientes, que es lo correcto para preparados en frío (una ensalada,
--  un batido) donde no hay pérdida.
-- =============================================================================

-- ── Recetas ──────────────────────────────────────────────────────────────────
create table if not exists public.recipes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  notes      text,
  yield_g    numeric(9,2) check (yield_g is null or yield_g > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_name_not_blank check (length(trim(name)) > 0)
);

create index if not exists idx_recipes_user on public.recipes(user_id);

alter table public.recipes enable row level security;
drop policy if exists "Users manage own recipes" on public.recipes;
create policy "Users manage own recipes" on public.recipes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists recipes_touch_updated_at on public.recipes;
create trigger recipes_touch_updated_at
  before update on public.recipes
  for each row execute function public.touch_updated_at();

-- ── Ingredientes de cada receta ──────────────────────────────────────────────
create table if not exists public.recipe_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  recipe_id  uuid not null references public.recipes(id) on delete cascade,
  product_id uuid not null references public.food_products(id) on delete restrict,
  quantity_g numeric(8,2) not null check (quantity_g > 0 and quantity_g <= 20000),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (recipe_id, product_id)
);

create index if not exists idx_recipe_items_user   on public.recipe_items(user_id);
create index if not exists idx_recipe_items_recipe on public.recipe_items(recipe_id);

alter table public.recipe_items enable row level security;
drop policy if exists "Users manage own recipe_items" on public.recipe_items;
create policy "Users manage own recipe_items" on public.recipe_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── Objetivo diario de macros ────────────────────────────────────────────────
create table if not exists public.nutrition_goals (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  energy_kcal numeric(7,2) check (energy_kcal is null or energy_kcal > 0),
  protein_g   numeric(7,2) check (protein_g   is null or protein_g   >= 0),
  carbs_g     numeric(7,2) check (carbs_g     is null or carbs_g     >= 0),
  fat_g       numeric(7,2) check (fat_g       is null or fat_g       >= 0),
  fiber_g     numeric(7,2) check (fiber_g     is null or fiber_g     >= 0),
  updated_at  timestamptz not null default now()
);

alter table public.nutrition_goals enable row level security;
drop policy if exists "Users manage own nutrition_goals" on public.nutrition_goals;
create policy "Users manage own nutrition_goals" on public.nutrition_goals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists nutrition_goals_touch_updated_at on public.nutrition_goals;
create trigger nutrition_goals_touch_updated_at
  before update on public.nutrition_goals
  for each row execute function public.touch_updated_at();

-- ── El diario ahora acepta producto O receta ─────────────────────────────────
alter table public.nutrition_logs
  alter column product_id drop not null;

alter table public.nutrition_logs
  add column if not exists recipe_id uuid references public.recipes(id) on delete restrict;

do $$ begin
  alter table public.nutrition_logs
    add constraint nutrition_logs_one_source
      check (num_nonnulls(product_id, recipe_id) = 1);
exception when duplicate_object then null; end $$;

create index if not exists idx_nutrition_logs_recipe on public.nutrition_logs(recipe_id);

-- ── Macros de cada receta ────────────────────────────────────────────────────
-- security_invoker: la vista se evalúa con los permisos de quien consulta, así
-- que la RLS de recipes / food_products sigue aplicando y nadie ve lo ajeno.
drop view if exists public.nutrition_log_macros;
drop view if exists public.recipe_nutrition;
create view public.recipe_nutrition
with (security_invoker = true) as
select
  r.id      as recipe_id,
  r.user_id,
  r.name,
  r.yield_g,
  round(sum(ri.quantity_g)::numeric, 2)                    as ingredients_g,
  -- Base contra la que se escala una porción servida.
  round(coalesce(r.yield_g, sum(ri.quantity_g))::numeric, 2) as total_g,
  round(sum(p.energy_kcal * ri.quantity_g / 100.0)::numeric, 2) as energy_kcal,
  round(sum(p.protein_g * ri.quantity_g / 100.0)::numeric, 2) as protein_g,
  round(sum(p.carbs_g * ri.quantity_g / 100.0)::numeric, 2) as carbs_g,
  round(sum(p.sugars_g * ri.quantity_g / 100.0)::numeric, 2) as sugars_g,
  round(sum(p.added_sugars_g * ri.quantity_g / 100.0)::numeric, 2) as added_sugars_g,
  round(sum(p.fiber_g * ri.quantity_g / 100.0)::numeric, 2) as fiber_g,
  round(sum(p.fat_g * ri.quantity_g / 100.0)::numeric, 2) as fat_g,
  round(sum(p.saturated_fat_g * ri.quantity_g / 100.0)::numeric, 2) as saturated_fat_g,
  round(sum(p.trans_fat_mg * ri.quantity_g / 100.0)::numeric, 2) as trans_fat_mg,
  round(sum(p.sodium_mg * ri.quantity_g / 100.0)::numeric, 2) as sodium_mg
from public.recipes r
join public.recipe_items ri on ri.recipe_id = r.id
join public.food_products p on p.id = ri.product_id
group by r.id, r.user_id, r.name, r.yield_g;

-- ── Cada renglón del diario, ya resuelto a macros ────────────────────────────
create view public.nutrition_log_macros
with (security_invoker = true) as
select
  l.id,
  l.user_id,
  l.logged_on,
  l.meal,
  l.quantity_g,
  l.note,
  l.created_at,
  l.product_id,
  l.recipe_id,
  coalesce(p.name, rn.name)                        as source_name,
  case when l.product_id is not null then 'producto' else 'receta' end as source_type,
  round(case
    when l.product_id is not null then p.energy_kcal * l.quantity_g / 100.0
    else rn.energy_kcal * l.quantity_g / nullif(rn.total_g, 0)
  end::numeric, 2) as energy_kcal,
  round(case
    when l.product_id is not null then p.protein_g * l.quantity_g / 100.0
    else rn.protein_g * l.quantity_g / nullif(rn.total_g, 0)
  end::numeric, 2) as protein_g,
  round(case
    when l.product_id is not null then p.carbs_g * l.quantity_g / 100.0
    else rn.carbs_g * l.quantity_g / nullif(rn.total_g, 0)
  end::numeric, 2) as carbs_g,
  round(case
    when l.product_id is not null then p.sugars_g * l.quantity_g / 100.0
    else rn.sugars_g * l.quantity_g / nullif(rn.total_g, 0)
  end::numeric, 2) as sugars_g,
  round(case
    when l.product_id is not null then p.added_sugars_g * l.quantity_g / 100.0
    else rn.added_sugars_g * l.quantity_g / nullif(rn.total_g, 0)
  end::numeric, 2) as added_sugars_g,
  round(case
    when l.product_id is not null then p.fiber_g * l.quantity_g / 100.0
    else rn.fiber_g * l.quantity_g / nullif(rn.total_g, 0)
  end::numeric, 2) as fiber_g,
  round(case
    when l.product_id is not null then p.fat_g * l.quantity_g / 100.0
    else rn.fat_g * l.quantity_g / nullif(rn.total_g, 0)
  end::numeric, 2) as fat_g,
  round(case
    when l.product_id is not null then p.saturated_fat_g * l.quantity_g / 100.0
    else rn.saturated_fat_g * l.quantity_g / nullif(rn.total_g, 0)
  end::numeric, 2) as saturated_fat_g,
  round(case
    when l.product_id is not null then p.trans_fat_mg * l.quantity_g / 100.0
    else rn.trans_fat_mg * l.quantity_g / nullif(rn.total_g, 0)
  end::numeric, 2) as trans_fat_mg,
  round(case
    when l.product_id is not null then p.sodium_mg * l.quantity_g / 100.0
    else rn.sodium_mg * l.quantity_g / nullif(rn.total_g, 0)
  end::numeric, 2) as sodium_mg
from public.nutrition_logs l
left join public.food_products   p  on p.id  = l.product_id
left join public.recipe_nutrition rn on rn.recipe_id = l.recipe_id;
