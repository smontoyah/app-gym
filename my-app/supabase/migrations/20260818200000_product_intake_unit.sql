-- =============================================================================
--  Unidad de captura por producto
--
--  Las macros siguen viviendo POR 100 G y el diario sigue guardando GRAMOS: es
--  la única base que deja sumar productos distintos entre sí. Lo que cambia acá
--  es la unidad con la que se ESCRIBE la cantidad. Nadie pesa dos huevos ni
--  cuatro saltinas: los cuenta. Si la equivalencia vive en la maestra del
--  producto, la app puede pedir "2 huevos" y persistir 100 g sin que el usuario
--  haga la cuenta.
--
--  · intake_unit   : con qué unidad se abre el campo de cantidad ('g'|'unidad')
--  · unit_weight_g : cuánto pesa UNA unidad — 1 huevo, 1 galleta, 1 arepa
--  · unit_label    : cómo se llama esa unidad, en singular ("huevo", "galleta").
--                    null se lee como "unidad"
--
--  unit_weight_g NO es serving_size_g: la porción de la etiqueta suele traer
--  varias unidades ("5 galletas (32,5 g)"), y de ahí no sale el peso de una sola
--  sin dividir por una cuenta que la etiqueta no siempre imprime.
-- =============================================================================

alter table public.food_products
  add column if not exists intake_unit   text not null default 'g',
  add column if not exists unit_weight_g numeric(8,2),
  add column if not exists unit_label    text;

do $$ begin
  alter table public.food_products
    add constraint food_products_intake_unit_valid
      check (intake_unit in ('g','unidad'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.food_products
    add constraint food_products_unit_weight_positive
      check (unit_weight_g is null or unit_weight_g > 0);
exception when duplicate_object then null; end $$;

-- Capturar en unidades sin saber cuánto pesa una es imposible de convertir a
-- gramos: la equivalencia es obligatoria justo cuando se la va a usar.
do $$ begin
  alter table public.food_products
    add constraint food_products_unit_needs_weight
      check (intake_unit <> 'unidad' or unit_weight_g is not null);
exception when duplicate_object then null; end $$;

-- ── El diario expone la unidad con la que se muestra cada renglón ────────────
-- La vista es lo que lee la pantalla del diario, así que la unidad de
-- presentación viaja con la fila ya resuelta: sin esto habría que tener todo el
-- catálogo en memoria para saber si "100 g" se muestra como "2 huevos".
-- Las recetas no tienen unidad propia, van en gramos: ahí los tres campos son
-- null (el left join los deja así solo).
drop view if exists public.nutrition_log_macros;
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
  p.intake_unit,
  p.unit_weight_g,
  p.unit_label,
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
left join public.food_products    p  on p.id        = l.product_id
left join public.recipe_nutrition rn on rn.recipe_id = l.recipe_id;

-- ── Los dos casos que ya están en el catálogo ───────────────────────────────
-- El huevo grande pesa 50 g (es el mismo valor que ya traía como porción) y la
-- saltina sale de su propia etiqueta: 5 galletas = 32,5 g → 6,5 g cada una.
-- El `and intake_unit = 'g'` hace la actualización idempotente y, sobre todo,
-- evita pisar una equivalencia que el usuario haya corregido a mano después.
update public.food_products
   set intake_unit = 'unidad', unit_weight_g = 50, unit_label = 'huevo'
 where lower(name) = 'huevo entero (crudo)'
   and intake_unit = 'g';

update public.food_products
   set intake_unit = 'unidad', unit_weight_g = 6.5, unit_label = 'galleta'
 where lower(name) = 'saltín noel tradicional'
   and intake_unit = 'g';
