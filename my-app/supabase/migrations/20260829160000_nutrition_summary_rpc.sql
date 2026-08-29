-- =============================================================================
--  Resumen de nutrición por rango de fechas
--
--  Mismo reparto que `training_summary`: la agregación vive en Postgres y la
--  pantalla recibe una fila. Traerse los registros y agrupar en el cliente se
--  descarta por la misma razón que allá — con 10 alimentos al día, cualquier
--  tope de filas trunca la historia a los pocos meses sin avisar.
--
--  La fuente es la vista `nutrition_log_macros`, no `food_products`: la vista ya
--  resuelve las macros absolutas de cada registro y, sobre todo, cubre las
--  recetas. Sumando desde `food_products` los registros de receta quedarían
--  fuera del total y nadie se enteraría.
--
--  security invoker  ⇒ la RLS del usuario sigue aplicando.
--  search_path = ''  ⇒ todo va calificado por esquema.
-- =============================================================================

create or replace function public.nutrition_summary(
  p_from        date    default '1900-01-01',
  p_to          date    default '2999-12-31',
  -- Un día con tres alimentos o menos casi nunca es un día de ayuno: es un
  -- registro que se abandonó. Entra al gráfico marcado, pero no al promedio,
  -- porque un 484 kcal suelto arrastra la media varios cientos de kcal.
  p_partial_max integer default 3,
  p_foods       integer default 8
)
returns table (
  -- Días con algún registro dentro del rango
  days_logged      bigint,
  days_complete    bigint,
  days_partial     bigint,
  total_logs       bigint,
  -- Extremos reales del período con dato, para que el cliente arme el eje sin
  -- tener que adivinar dónde empieza la serie cuando el rango es «todo».
  first_day        date,
  last_day         date,
  -- Promedios sobre los días completos
  avg_kcal         numeric,
  avg_protein      numeric,
  avg_carbs        numeric,
  avg_fat          numeric,
  avg_fiber        numeric,
  min_kcal         numeric,
  max_kcal         numeric,
  sd_kcal          numeric,
  -- Período anterior de igual longitud
  prev_days        bigint,
  prev_avg_kcal    numeric,
  prev_avg_protein numeric,
  by_day           jsonb,
  by_meal          jsonb,
  top_foods        jsonb,
  -- Productos usados en el rango a los que les falta alguna macro: sus
  -- calorías se pierden en la suma en silencio y el promedio queda por debajo.
  incomplete       jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with span as (
    select (p_to - p_from + 1) as days
  ),
  logs as (
    select m.logged_on,
           m.product_id,
           m.quantity_g,
           m.meal,
           m.source_name,
           coalesce(m.energy_kcal, 0) as energy_kcal,
           coalesce(m.protein_g, 0)   as protein_g,
           coalesce(m.carbs_g, 0)     as carbs_g,
           coalesce(m.fat_g, 0)       as fat_g,
           coalesce(m.fiber_g, 0)     as fiber_g
      from public.nutrition_log_macros m
     where m.user_id = (select auth.uid())
  ),
  ranged as (
    select * from logs where logged_on between p_from and p_to
  ),
  daily as (
    select r.logged_on,
           count(*)                    as items,
           round(sum(r.energy_kcal))   as kcal,
           round(sum(r.protein_g))     as protein,
           round(sum(r.carbs_g))       as carbs,
           round(sum(r.fat_g))         as fat,
           round(sum(r.fiber_g))       as fiber
      from ranged r
     group by r.logged_on
  ),
  flagged as (
    select d.*, (d.items <= p_partial_max) as partial from daily d
  ),
  full_days as (
    select * from flagged where not partial
  ),
  totals as (
    select (select count(*) from flagged)                as days_logged,
           (select count(*) from full_days)              as days_complete,
           (select count(*) from flagged where partial)  as days_partial,
           (select count(*) from ranged)                 as total_logs,
           (select min(logged_on) from flagged)          as first_day,
           (select max(logged_on) from flagged)          as last_day,
           (select round(avg(kcal))       from full_days) as avg_kcal,
           (select round(avg(protein))    from full_days) as avg_protein,
           (select round(avg(carbs))      from full_days) as avg_carbs,
           (select round(avg(fat))        from full_days) as avg_fat,
           (select round(avg(fiber))      from full_days) as avg_fiber,
           (select min(kcal)              from full_days) as min_kcal,
           (select max(kcal)              from full_days) as max_kcal,
           -- null con un solo día completo: no hay dispersión que medir.
           (select round(stddev_samp(kcal)) from full_days) as sd_kcal
  ),
  -- El período anterior de igual longitud, con el mismo criterio de día
  -- incompleto: comparar un promedio limpio contra uno sucio no compara nada.
  prev_daily as (
    select l.logged_on, count(*) as items,
           round(sum(l.energy_kcal)) as kcal,
           round(sum(l.protein_g))   as protein
      from logs l
     where l.logged_on between p_from - (select days from span) and p_from - 1
     group by l.logged_on
  ),
  prev_full as (
    select * from prev_daily where items > p_partial_max
  ),
  prev as (
    select (select count(*) from prev_full)            as prev_days,
           (select round(avg(kcal))    from prev_full) as prev_avg_kcal,
           (select round(avg(protein)) from prev_full) as prev_avg_protein
  ),
  by_day as (
    select jsonb_agg(jsonb_build_object(
             'date',    f.logged_on,
             'kcal',    f.kcal,
             'protein', f.protein,
             'carbs',   f.carbs,
             'fat',     f.fat,
             'fiber',   f.fiber,
             'items',   f.items,
             'partial', f.partial
           ) order by f.logged_on) as js
      from flagged f
  ),
  -- Promedio POR DÍA EN QUE SE REGISTRÓ esa comida, no por día del rango: si la
  -- cena se anotó 8 de 10 días, dividir entre 10 la haría parecer más liviana
  -- de lo que es. El divisor viaja en `days` para que la pantalla lo pueda decir.
  by_meal as (
    select jsonb_agg(x.js order by x.kcal_per_day desc) as js
      from (
        select r.meal,
               count(distinct r.logged_on) as days,
               round(sum(r.energy_kcal) / count(distinct r.logged_on)) as kcal_per_day,
               jsonb_build_object(
                 'meal',           r.meal,
                 'days',           count(distinct r.logged_on),
                 'kcalPerDay',     round(sum(r.energy_kcal) / count(distinct r.logged_on)),
                 'proteinPerDay',  round(sum(r.protein_g)   / count(distinct r.logged_on))
               ) as js
          from ranged r
         group by r.meal
      ) x
  ),
  top_foods as (
    select jsonb_agg(x.js order by x.kcal desc) as js
      from (
        select round(sum(r.energy_kcal)) as kcal,
               jsonb_build_object(
                 'name',   r.source_name,
                 'brand',  max(p.brand),
                 'kcal',   round(sum(r.energy_kcal)),
                 'grams',  round(sum(r.quantity_g)),
                 'days',   count(distinct r.logged_on)
               ) as js
          from ranged r
          left join public.food_products p on p.id = r.product_id
         group by r.source_name
         order by sum(r.energy_kcal) desc
         limit p_foods
      ) x
  ),
  incomplete as (
    select jsonb_agg(distinct p.name) as js
      from ranged r
      join public.food_products p on p.id = r.product_id
     where p.energy_kcal is null
        or p.protein_g   is null
        or p.carbs_g     is null
        or p.fat_g       is null
  )
  select t.days_logged, t.days_complete, t.days_partial, t.total_logs,
         t.first_day, t.last_day,
         t.avg_kcal, t.avg_protein, t.avg_carbs, t.avg_fat, t.avg_fiber,
         t.min_kcal, t.max_kcal, t.sd_kcal,
         v.prev_days, v.prev_avg_kcal, v.prev_avg_protein,
         coalesce(bd.js, '[]'::jsonb),
         coalesce(bm.js, '[]'::jsonb),
         coalesce(tf.js, '[]'::jsonb),
         coalesce(ic.js, '[]'::jsonb)
    from totals t, prev v, by_day bd, by_meal bm, top_foods tf, incomplete ic;
$$;

comment on function public.nutrition_summary(date, date, integer, integer) is
  'Resumen del diario de nutrición para un rango. Los promedios excluyen los días con p_partial_max ítems o menos (registros abandonados).';
