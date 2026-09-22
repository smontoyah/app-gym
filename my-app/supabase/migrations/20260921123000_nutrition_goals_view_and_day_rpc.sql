-- =============================================================================
--  Se sueltan los gramos absolutos, y quien los necesite los pide a la vista
--
--  Valores originales antes del borrado, por si alguna vez hay que auditar el
--  backfill (usuario 345f2fa2, pesaje de 77,10 kg del 2026-09-21):
--
--      proteína 170 g → 2,20 g/kg → 169,6 g   (Δ 0,4)
--      carbos   160 g → 2,08 g/kg → 160,4 g   (Δ 0,4)
--      grasa     63 g → 0,82 g/kg →  63,2 g   (Δ 0,2)
--
--  Las tres diferencias son el redondeo a dos decimales del ratio. Verificado
--  antes de correr este borrado.
-- =============================================================================

alter table public.nutrition_goals
  drop column protein_g,
  drop column carbs_g,
  drop column fat_g;

-- ── La vista que mantiene vivas las consultas de las skills ──────────────────
--  `analisis-progreso/consultas.sql` y `reporte-nutricion` leen protein_g,
--  carbs_g y fat_g de la tabla. Borrar esas columnas las rompía a las dos: la
--  vista se las devuelve ya resueltas contra el último pesaje, con los mismos
--  nombres, así que el resto de esas consultas no cambia.
--
--  security_invoker: sin esto la vista correría con los permisos del dueño y
--  expondría los objetivos de cualquier usuario a cualquier otro.
create view public.nutrition_goals_current
with (security_invoker = true) as
select g.user_id,
       g.profile,
       w.weight_kg,
       g.energy_kcal,
       round(g.protein_g_kg * w.weight_kg, 1) as protein_g,
       round(g.carbs_g_kg   * w.weight_kg, 1) as carbs_g,
       round(g.fat_g_kg     * w.weight_kg, 1) as fat_g,
       g.fiber_g,
       g.updated_at
  from public.nutrition_goals g
  left join lateral (
    select b.weight_kg
      from public.body_weight_logs b
     where b.user_id = g.user_id
     order by b.measured_at desc
     limit 1
  ) w on true;

comment on view public.nutrition_goals_current is
  'Objetivos resueltos en gramos contra el último pesaje. La tabla guarda g/kg.';

-- ── El objetivo que le tocaba a cada día ─────────────────────────────────────
--  Va aparte y no dentro de `nutrition_summary` porque es aditivo: la pantalla
--  de estadísticas sigue funcionando aunque esta RPC falle.
create or replace function public.nutrition_day_goals(
  p_from date,
  p_to   date
)
returns table (
  day         date,
  profile     text,
  weight_kg   numeric,
  energy_kcal numeric,
  protein_g   numeric,
  carbs_g     numeric,
  fat_g       numeric,
  fiber_g     numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select d.day::date,
         coalesce(nd.goal_profile, 'normal') as profile,
         w.weight_kg,
         g.energy_kcal,
         round(g.protein_g_kg * w.weight_kg, 1),
         round(g.carbs_g_kg   * w.weight_kg, 1),
         round(g.fat_g_kg     * w.weight_kg, 1),
         g.fiber_g
    from generate_series(p_from, p_to, interval '1 day') as d(day)
    left join public.nutrition_days nd
           on nd.user_id = (select auth.uid()) and nd.logged_on = d.day::date
    left join public.nutrition_goals g
           on g.user_id = (select auth.uid())
          and g.profile = coalesce(nd.goal_profile, 'normal')
    -- El peso VIGENTE ese día, no el de hoy: un día de julio se compara contra
    -- el peso que había en julio, que es la única comparación que significa
    -- algo cuando el objetivo se define por kilo.
    left join lateral (
      select b.weight_kg
        from public.body_weight_logs b
       where b.user_id = (select auth.uid())
         and b.measured_at::date <= d.day::date
       order by b.measured_at desc
       limit 1
    ) w on true
   order by d.day;
$$;
