-- =============================================================================
--  Conversión crudo ↔ cocido
--
--  Un alimento cambia de peso al cocinarse —el arroz absorbe agua y pesa el
--  doble y medio, la pechuga la suelta y pierde un cuarto— pero sus macros no
--  viajan con el agua. Por eso una fila del catálogo vale para UNA sola forma:
--  100 g de arroz seco son 360 kcal y 100 g del mismo arroz cocido, 130.
--  Registrar 200 g de arroz cocido contra la fila cruda triplica las calorías
--  del día, en silencio.
--
--  Hasta ahora la forma vivía solo en el NOMBRE del producto ("Arroz blanco
--  (cocido)"), que la app no puede interpretar. Estas dos columnas la vuelven
--  dato:
--
--   · base_state       : en qué forma están las macros por 100 g. Es también la
--                        forma en la que se guarda `nutrition_logs.quantity_g`,
--                        así que las vistas y las recetas siguen igual.
--   · cooked_yield_pct : cuántos gramos cocidos salen de 100 g crudos. 250 en el
--                        arroz (gana), 75 en la pechuga (pierde).
--
--  Con las dos, el diario acepta el peso que de verdad tocó la balanza —esté
--  crudo o cocido— y convierte antes de guardar. `logged_state` recuerda en qué
--  forma se pesó: sin eso, quien anotó 200 g de arroz cocido vería 80 g en su
--  diario y no reconocería su propio renglón.
--
--  Nada de esto es obligatorio: un empacado que no se cocina deja las tres
--  columnas en null y se comporta exactamente como antes.
-- =============================================================================

alter table public.food_products
  add column if not exists base_state       text,
  add column if not exists cooked_yield_pct numeric(6,2);

do $$ begin
  alter table public.food_products
    add constraint food_products_base_state_valid
      check (base_state is null or base_state in ('crudo','cocido'));
exception when duplicate_object then null; end $$;

-- El techo son 1000 g por cada 100 g crudos: la legumbre que más absorbe no
-- llega ni a la mitad de eso. Un número mayor es un tecleo, no un rendimiento.
do $$ begin
  alter table public.food_products
    add constraint food_products_cooked_yield_sane
      check (cooked_yield_pct is null or (cooked_yield_pct > 0 and cooked_yield_pct <= 1000));
exception when duplicate_object then null; end $$;

-- Un rendimiento sin forma base no se puede aplicar: no se sabe desde dónde
-- convertir. Se exige el par, igual que 'unidad' exige unit_weight_g.
do $$ begin
  alter table public.food_products
    add constraint food_products_yield_needs_base_state
      check (cooked_yield_pct is null or base_state is not null);
exception when duplicate_object then null; end $$;

-- ── En qué forma se pesó cada renglón del diario ─────────────────────────────
-- `quantity_g` sigue siendo SIEMPRE la forma base del producto: la conversión
-- la hace la app antes de insertar, así que todo lo que ya escala macros
-- (vistas, recetas, estadísticas, exportación) sigue valiendo sin tocar nada.
-- Esta columna es memoria de lo que dijo la balanza, para poder mostrarlo.
alter table public.nutrition_logs
  add column if not exists logged_state text;

do $$ begin
  alter table public.nutrition_logs
    add constraint nutrition_logs_logged_state_valid
      check (logged_state is null or logged_state in ('crudo','cocido'));
exception when duplicate_object then null; end $$;

-- Las recetas van en gramos del preparado terminado (`recipes.yield_g` ya
-- resuelve su cocción): la forma solo tiene sentido en un producto.
do $$ begin
  alter table public.nutrition_logs
    add constraint nutrition_logs_state_needs_product
      check (logged_state is null or product_id is not null);
exception when duplicate_object then null; end $$;

-- ── Las dos vistas exponen la forma ──────────────────────────────────────────
-- El diario necesita `base_state` y `cooked_yield_pct` en la misma fila para
-- poder leer "200 g cocidos · 80 g crudos" sin tener el catálogo en memoria,
-- igual que ya viajaba la unidad de presentación.
drop view if exists public.nutrition_log_macros;
create view public.nutrition_log_macros
with (security_invoker = true) as
select
  l.id,
  l.user_id,
  l.logged_on,
  l.meal,
  l.quantity_g,
  l.logged_state,
  l.note,
  l.created_at,
  l.product_id,
  l.recipe_id,
  coalesce(p.name, rn.name)                        as source_name,
  case when l.product_id is not null then 'producto' else 'receta' end as source_type,
  p.intake_unit,
  p.unit_weight_g,
  p.unit_label,
  p.base_state,
  p.cooked_yield_pct,
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

-- ── Lo que ya está cargado ───────────────────────────────────────────────────
-- El catálogo trae la forma escrita en el nombre —así lo pide el plan de Ciro—,
-- que es de donde se puede deducir sin inventar nada. Solo se marca la forma:
-- el rendimiento no se adivina, lo escribe quien conoce el alimento.
--
-- `and base_state is null` mantiene la migración idempotente y no pisa nada
-- corregido a mano después.
update public.food_products
   set base_state = 'cocido'
 where base_state is null
   and (name ilike '%(cocid%' or name ilike '%(cocinad%' or name ilike '%(hervid%');

update public.food_products
   set base_state = 'crudo'
 where base_state is null
   and name ilike '%(crud%';
