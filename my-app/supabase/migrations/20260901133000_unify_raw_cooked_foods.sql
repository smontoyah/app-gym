-- =============================================================================
--  Unificación de los alimentos cargados dos veces, en crudo y en cocido
--
--  Antes de `product_cooking_state`, la única forma de poder pesar un alimento
--  en las dos formas era cargarlo dos veces: una fila con las macros crudas y
--  otra con las cocidas. En el catálogo eso pasó con dos alimentos —papa y
--  batata—, que quedaron duplicados a propósito. Con el rendimiento en la
--  maestra ya no hace falta: una sola fila acepta las dos formas y convierte.
--
--  EL RENDIMIENTO NO SE INVENTA, SE DEDUCE DE LAS DOS FILAS. Al cocinar se
--  mueve agua, no energía: los mismos 100 g crudos siguen teniendo las mismas
--  kcal después de cocidos, solo repartidas en otro peso. De ahí sale
--
--      gramos_cocidos / gramos_crudos = kcal_por_100g_crudo / kcal_por_100g_cocido
--
--  · Papa   : 77 / 86  = 89,53 %  → 100 g crudos quedan en 89,53 g cocidos
--  · Batata : 86 / 76  = 113,16 % → 100 g crudos rinden 113,16 g cocidos
--
--  Deducirlo así tiene una propiedad que importa: los registros que se
--  reapuntan conservan EXACTAS sus calorías. Los 150 g de papa cruda del 22 de
--  agosto (150 × 0,77 = 115,5 kcal) pasan a 134,30 g contra la fila cocida
--  (134,30 × 0,86 = 115,5 kcal). El historial no se mueve.
--
--  QUÉ FILA SOBREVIVE, Y POR QUÉ
--  · Papa   → se queda la COCIDA. Cinco de los seis registros del diario se
--             pesaron cocidos: es la forma que toca la balanza en esta cocina,
--             y sus macros son las del tubérculo pelado, que es lo que se come.
--  · Batata → se queda la CRUDA. No tiene registros, así que no hay costumbre
--             que respetar, y el plan de Ciro la pesa en crudo.
--
--  LA SALVEDAD DE LA PAPA: las dos filas no son el mismo trozo de comida. La
--  cruda es «con piel» y la cocida «sin piel», y la cáscara lleva fibra y algo
--  de proteína. Contra el rendimiento por energía, la fila cruda declara 34 %
--  más proteína y 30 % más fibra que la cocida — en una papa de 200 g, alrededor
--  de 1 g de cada una. Las calorías, los carbohidratos y la grasa coinciden. Al
--  quedarse la fila cocida, lo que se pesa crudo con piel queda subestimado en
--  ese gramo de proteína y de fibra; es el precio de tener una sola fila, y se
--  paga del lado donde menos se usa.
--
--  Las filas que se borran, por si hay que devolverlas (macros por 100 g):
--   Papa (cruda, con piel)     77 kcal · P 2,05 · C 17,49 · G 0,09 · F 2,10 · azúcar 0,82 · Na 6
--   Batata (cocida, sin piel)  76 kcal · P 1,37 · C 17,72 · G 0,14 · F 2,50 · azúcar 5,74 · Na 27
-- =============================================================================

-- ── El rendimiento va en la fila que se queda ────────────────────────────────
-- `cooked_yield_pct is null` mantiene la migración idempotente y no pisa un
-- rendimiento corregido a mano después de aplicarla.
update public.food_products
   set base_state = 'cocido', cooked_yield_pct = 89.53
 where id = '7b34c9fc-6ed0-4a2e-8dbb-1315b71461c8'   -- Papa (cocida, sin piel)
   and cooked_yield_pct is null;

update public.food_products
   set base_state = 'crudo', cooked_yield_pct = 113.16
 where id = 'd12d4850-84c9-47f3-90f1-1f5b164e2750'   -- Batata (cruda)
   and cooked_yield_pct is null;

-- ── El historial se muda a la fila que se queda ──────────────────────────────
-- El peso se convierte a la forma de la fila destino, que es en la que se
-- guarda, y `logged_state` deja anotado en qué forma se había pesado: sin eso,
-- quien registró 150 g de papa cruda abriría el diario y encontraría 134,30 g,
-- que no es lo que puso en la balanza. Con la forma anotada lee
-- «150 g crudos · 134,3 g cocidos».
--
-- La división usa el rendimiento recién guardado y no un número suelto, así que
-- el peso convertido y el que la app muestra de vuelta son el mismo.
update public.nutrition_logs l
   set product_id   = '7b34c9fc-6ed0-4a2e-8dbb-1315b71461c8',
       quantity_g   = round(l.quantity_g * p.cooked_yield_pct / 100.0, 2),
       logged_state = 'crudo'
  from public.food_products p
 where l.product_id = '00ff1546-54ed-4f15-9602-285fbabcdf42'  -- Papa (cruda, con piel)
   and p.id = '7b34c9fc-6ed0-4a2e-8dbb-1315b71461c8';

-- Los registros que ya estaban en la fila que sobrevive no cambian de peso,
-- pero sí ganan la forma en la que se pesaron: hasta ahora era implícita.
update public.nutrition_logs
   set logged_state = 'cocido'
 where product_id = '7b34c9fc-6ed0-4a2e-8dbb-1315b71461c8'
   and logged_state is null;

-- La batata no tiene registros ni ingredientes, pero el update va igual: si
-- aparece uno entre que esto se escribe y se aplica, se muda con su conversión
-- en vez de bloquear el borrado de abajo.
update public.nutrition_logs l
   set product_id   = 'd12d4850-84c9-47f3-90f1-1f5b164e2750',
       quantity_g   = round(l.quantity_g * 100.0 / p.cooked_yield_pct, 2),
       logged_state = 'cocido'
  from public.food_products p
 where l.product_id = '051582d1-04f0-44bb-b9e5-ed885360b545'  -- Batata (cocida, sin piel)
   and p.id = 'd12d4850-84c9-47f3-90f1-1f5b164e2750';

update public.nutrition_logs
   set logged_state = 'crudo'
 where product_id = 'd12d4850-84c9-47f3-90f1-1f5b164e2750'
   and logged_state is null;

-- Las recetas también apuntarían a la fila vieja. Hoy ninguna las usa, pero el
-- update deja la migración correcta si eso cambia. `recipe_items` es único por
-- (recipe_id, product_id): si la receta ya tenía la otra forma del alimento, la
-- mudanza chocaría, y ahí es mejor que falle a que borre en silencio.
update public.recipe_items ri
   set product_id = '7b34c9fc-6ed0-4a2e-8dbb-1315b71461c8',
       quantity_g = round(ri.quantity_g * p.cooked_yield_pct / 100.0, 2)
  from public.food_products p
 where ri.product_id = '00ff1546-54ed-4f15-9602-285fbabcdf42'
   and p.id = '7b34c9fc-6ed0-4a2e-8dbb-1315b71461c8';

update public.recipe_items ri
   set product_id = 'd12d4850-84c9-47f3-90f1-1f5b164e2750',
       quantity_g = round(ri.quantity_g * 100.0 / p.cooked_yield_pct, 2)
  from public.food_products p
 where ri.product_id = '051582d1-04f0-44bb-b9e5-ed885360b545'
   and p.id = 'd12d4850-84c9-47f3-90f1-1f5b164e2750';

-- ── Recién ahora se va la fila duplicada ─────────────────────────────────────
-- El `not exists` no es adorno: las FK son ON DELETE RESTRICT y el catálogo es
-- compartido, así que un registro de otro usuario —que la mudanza de arriba
-- también movió, porque esto corre con service_role— o uno creado mientras
-- tanto haría fallar el borrado. Con el guardia, la migración deja la fila en
-- pie y el resto aplicado, en vez de cortar a la mitad.
delete from public.food_products p
 where p.id in (
        '00ff1546-54ed-4f15-9602-285fbabcdf42',   -- Papa (cruda, con piel)
        '051582d1-04f0-44bb-b9e5-ed885360b545'    -- Batata (cocida, sin piel)
      )
   and not exists (select 1 from public.nutrition_logs l where l.product_id = p.id)
   and not exists (select 1 from public.recipe_items ri where ri.product_id = p.id);

do $$
declare
  quedan int;
begin
  select count(*) into quedan
    from public.food_products
   where id in ('00ff1546-54ed-4f15-9602-285fbabcdf42','051582d1-04f0-44bb-b9e5-ed885360b545');
  if quedan > 0 then
    raise warning 'Quedaron % fila(s) duplicada(s) sin borrar: algo las sigue referenciando.', quedan;
  end if;
end $$;
