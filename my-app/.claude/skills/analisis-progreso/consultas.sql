-- ===========================================================================
--  Consultas de análisis — app_gym
--  Todas probadas contra la base real. Sustituye :desde y :hasta por fechas
--  ISO ('2026-08-18'). El user_id va fijo: el MCP entra con service role y
--  la RLS no aplica — sin el filtro se mezclan 4 usuarios.
--
--  Nutrición: SIEMPRE contra la vista nutrition_log_macros (resuelve productos
--  Y recetas). Un join manual a food_products descarta recetas en silencio.
-- ===========================================================================

-- \set uid '345f2fa2-eedc-481d-ba93-4f186fab0094'


-- ---------------------------------------------------------------------------
-- A. COBERTURA — siempre primero: cuánto data hay y qué tan sólida es
-- ---------------------------------------------------------------------------

-- A1. Rango y volumen de cada fuente
select
  (select min(logged_on)   from nutrition_logs  where user_id = :'uid') as nutri_desde,
  (select max(logged_on)   from nutrition_logs  where user_id = :'uid') as nutri_hasta,
  (select count(distinct logged_on) from nutrition_logs where user_id = :'uid') as nutri_dias,
  (select min(workout_date) from workout_logs   where user_id = :'uid') as gym_desde,
  (select max(workout_date) from workout_logs   where user_id = :'uid') as gym_hasta,
  (select count(distinct workout_date) from workout_logs where user_id = :'uid') as gym_sesiones,
  (select count(*)          from body_weight_logs where user_id = :'uid') as pesajes,
  (select count(*)          from cardio_logs     where user_id = :'uid') as cardio_registros;

-- A2. Qué tiempos de comida tiene cada día del rango (detecta los huecos).
--     Un día al que le falta un tiempo NO es un día de poca comida.
with dias as (
  select generate_series(:'desde'::date, :'hasta'::date, '1 day')::date as d
)
select dias.d, to_char(dias.d, 'Dy') as dow,
       bool_or(m.meal = 'desayuno') as des,
       bool_or(m.meal = 'almuerzo') as alm,
       bool_or(m.meal = 'cena')     as cena,
       bool_or(m.meal = 'snack')    as snk,
       count(m.id)                  as items,
       count(distinct m.meal)       as tiempos
from dias
left join nutrition_log_macros m
       on m.logged_on = dias.d and m.user_id = :'uid'
group by dias.d
order by dias.d;

-- A3. Sanidad del catálogo: productos usados con macros en null.
--     Sus calorías se pierden de la suma SIN AVISAR. Si devuelve filas,
--     dilo antes de cualquier conclusión.
select distinct p.name, p.brand,
       p.energy_kcal, p.protein_g, p.carbs_g, p.fat_g
from nutrition_logs l
join food_products p on p.id = l.product_id
where l.user_id = :'uid'
  and l.logged_on between :'desde' and :'hasta'
  and (p.energy_kcal is null or p.protein_g is null
       or p.carbs_g is null or p.fat_g is null);


-- ---------------------------------------------------------------------------
-- B. NUTRICIÓN
-- ---------------------------------------------------------------------------

-- B1. Serie diaria con marca de completo. Base de casi todo lo demás.
select m.logged_on,
       to_char(m.logged_on, 'Dy')        as dow,
       count(*)                          as items,
       count(distinct m.meal)            as tiempos,
       (count(distinct m.meal) = 4)      as completo,
       round(sum(m.energy_kcal))         as kcal,
       round(sum(m.protein_g))           as prot,
       round(sum(m.carbs_g))             as carb,
       round(sum(m.fat_g))               as gras,
       round(sum(m.fiber_g))             as fibra,
       round(sum(m.sodium_mg))           as sodio_mg
from nutrition_log_macros m
where m.user_id = :'uid' and m.logged_on between :'desde' and :'hasta'
group by m.logged_on
order by m.logged_on;

-- B2. Promedios SOLO de días completos, contra la meta vigente.
--     Excluye el día de hoy (está a medias por definición).
with d as (
  select m.logged_on, count(distinct m.meal) as tiempos,
         sum(m.energy_kcal) kcal, sum(m.protein_g) prot,
         sum(m.carbs_g) carb, sum(m.fat_g) gras, sum(m.fiber_g) fib
  from nutrition_log_macros m
  where m.user_id = :'uid'
    and m.logged_on between :'desde' and :'hasta'
    and m.logged_on < current_date
  group by m.logged_on
), g as (select * from nutrition_goals where user_id = :'uid')
select count(*) filter (where tiempos = 4) as dias_completos,
       count(*) filter (where tiempos < 4) as dias_con_hueco,
       round(avg(kcal) filter (where tiempos = 4)) as kcal,
       round(avg(prot) filter (where tiempos = 4)) as prot,
       round(avg(carb) filter (where tiempos = 4)) as carb,
       round(avg(gras) filter (where tiempos = 4)) as gras,
       round(avg(fib)  filter (where tiempos = 4)) as fibra,
       round(100 * avg(kcal) filter (where tiempos = 4) / g.energy_kcal) as pct_kcal,
       round(100 * avg(prot) filter (where tiempos = 4) / g.protein_g)   as pct_prot,
       round(avg(kcal))                                as kcal_todos_los_dias
from d, g group by g.energy_kcal, g.protein_g;
-- Recordatorio: nutrition_goals es una meta puesta a mano, NO el gasto medido.

-- B3. Aporte por tiempo de comida (promedio por día en que ese tiempo existe)
select m.meal,
       count(distinct m.logged_on) as dias,
       round(sum(m.energy_kcal) / count(distinct m.logged_on)) as kcal_por_dia,
       round(sum(m.protein_g)   / count(distinct m.logged_on)) as prot_por_dia
from nutrition_log_macros m
where m.user_id = :'uid' and m.logged_on between :'desde' and :'hasta'
group by m.meal order by kcal_por_dia desc;

-- B4. Alimentos que más aportan
select m.source_name, m.source_type,
       count(*)                      as veces,
       count(distinct m.logged_on)   as dias,
       round(sum(m.quantity_g))      as gramos,
       round(sum(m.energy_kcal))     as kcal_total,
       round(avg(m.energy_kcal))     as kcal_porcion,
       round(sum(m.protein_g))       as prot_total
from nutrition_log_macros m
where m.user_id = :'uid' and m.logged_on between :'desde' and :'hasta'
group by m.source_name, m.source_type
order by kcal_total desc nulls last limit 25;

-- B5. Qué categorías faltan (huella del subregistro).
--     Cero días con grasa de cocción es la señal más común y más grande.
with u as (
  select m.source_name as name, count(distinct m.logged_on) as dias
  from nutrition_log_macros m
  where m.user_id = :'uid' and m.logged_on between :'desde' and :'hasta'
  group by 1
)
select (select count(*) from u) as productos_distintos,
       coalesce((select sum(dias) from u where name ~* 'aceite|mantequilla|manteca|margarina'), 0) as dias_grasa_coccion,
       coalesce((select sum(dias) from u where name ~* 'zanahoria|coliflor|brocoli|brócoli|tomate|cebolla|lechuga|espinaca|pepino|ahuyama|habichuela|pimentón|repollo|ensalada'), 0) as dias_verdura,
       coalesce((select sum(dias) from u where name ~* 'salsa|mayonesa|hogao|aderezo|aliño'), 0) as dias_salsa;

-- B6. ¿Se pesa o se teclea? Señal DÉBIL — no acusar solo con esto.
select count(*) as total,
       round(100.0 * count(*) filter (where quantity_g = round(quantity_g/10)*10) / count(*)) as pct_multiplo_10,
       round(100.0 * count(*) filter (where quantity_g = round(quantity_g/50)*50) / count(*)) as pct_multiplo_50
from nutrition_logs
where user_id = :'uid' and logged_on between :'desde' and :'hasta';

-- B7. Uso del selector crudo/cocido (existe desde 2026-09-01).
--     logged_state null en registros viejos = se asumió la forma base.
select p.name, p.base_state, p.cooked_yield_pct, l.logged_state,
       count(*) as veces,
       round(min(l.quantity_g)) as min_g,
       round(avg(l.quantity_g)) as prom_g,
       round(max(l.quantity_g)) as max_g
from nutrition_logs l
join food_products p on p.id = l.product_id
where l.user_id = :'uid' and p.base_state is not null
group by 1,2,3,4 order by 1,4;

-- B8. Control de Atwater del catálogo.
--     delta ≈ -(4 × fibra) es NORMAL (la etiqueta cuenta fibra como carbo
--     pero no como energía). Lo que no se explique así, sí es sospechoso.
select p.name, p.brand, p.energy_kcal, p.protein_g, p.carbs_g, p.fat_g, p.fiber_g,
       round((4*p.protein_g + 4*coalesce(p.carbs_g,0) + 9*p.fat_g)::numeric, 0) as atwater,
       round((p.energy_kcal - (4*p.protein_g + 4*coalesce(p.carbs_g,0) + 9*p.fat_g))::numeric, 0) as delta,
       round((-4 * coalesce(p.fiber_g,0))::numeric, 0) as delta_esperado_por_fibra,
       p.base_state, p.cooked_yield_pct, p.ocr_model
from food_products p
where p.id in (select distinct product_id from nutrition_logs
               where user_id = :'uid' and product_id is not null)
  and p.energy_kcal is not null
order by abs(p.energy_kcal - (4*p.protein_g + 4*coalesce(p.carbs_g,0) + 9*p.fat_g)) desc;


-- ---------------------------------------------------------------------------
-- C. PESO CORPORAL — el árbitro
-- ---------------------------------------------------------------------------

-- C1. La serie
select (measured_at at time zone 'America/Bogota')::date as d,
       to_char(measured_at at time zone 'America/Bogota', 'Dy') as dow,
       (measured_at at time zone 'America/Bogota')::time(0) as hora,
       weight_kg, note
from body_weight_logs where user_id = :'uid'
order by measured_at;

-- C2. *** TENDENCIA CON INTERVALO DE CONFIANZA — OBLIGATORIA ***
--     Traduce el IC 95 % a kcal/día. NUNCA afirmes un hueco calórico
--     mayor del que este intervalo permite.
with w as (
  select (measured_at at time zone 'America/Bogota')::date as d, weight_kg::numeric as kg
  from body_weight_logs
  where user_id = :'uid'
    and (measured_at at time zone 'America/Bogota')::date between :'desde' and :'hasta'
), x as (select (d - min(d) over ())::numeric as t, kg from w),
r as (
  select count(*) n, regr_slope(kg,t) b, regr_intercept(kg,t) a,
         regr_sxx(kg,t) sxx, regr_r2(kg,t) r2, stddev(kg) sd_kg from x
), e as (
  select r.*, sqrt(sum(power(x.kg - (r.a + r.b*x.t),2)) / nullif(r.n-2,0)) as s_resid
  from x, r group by r.n, r.b, r.a, r.sxx, r.r2, r.sd_kg
)
select n as mediciones,
       round(sd_kg, 3)                                  as ruido_diario_sd,
       round(r2::numeric, 3)                            as r2,
       round((b*7)::numeric, 3)                         as kg_semana,
       round((s_resid/sqrt(sxx)*7)::numeric, 3)         as error_estandar_semana,
       round(((b - 2.145*s_resid/sqrt(sxx))*7)::numeric, 3) as ic95_inferior_kg_sem,
       round(((b + 2.145*s_resid/sqrt(sxx))*7)::numeric, 3) as ic95_superior_kg_sem,
       round(((b - 2.145*s_resid/sqrt(sxx))*7700)::numeric) as deficit_max_compatible_kcal_dia,
       round(((b + 2.145*s_resid/sqrt(sxx))*7700)::numeric) as superavit_max_compatible_kcal_dia
from e;
-- Nota: 2.145 es t(0.975) para ~14 gl. Con n muy distinto, ajusta el valor.

-- C3. Refutar (o no) la hipótesis del glucógeno con la FORMA de la curva.
--     Una carga de glucógeno es front-loaded: sube en la 1ª mitad y el déficit
--     asoma como caída en la 2ª. Si la 2ª mitad no cae, la hipótesis muere.
with w as (
  select (measured_at at time zone 'America/Bogota')::date as d, weight_kg::numeric as kg,
         ntile(2) over (order by measured_at) as mitad,
         row_number() over (order by measured_at) as i
  from body_weight_logs where user_id = :'uid'
    and (measured_at at time zone 'America/Bogota')::date between :'desde' and :'hasta'
)
select mitad, count(*) n, min(d) desde, max(d) hasta,
       round(avg(kg), 3) media, round(min(kg),2) minimo, round(max(kg),2) maximo,
       round(regr_slope(kg, i)::numeric, 4) pendiente_por_medicion
from w group by mitad order by mitad;

-- C4. ¿Vienen subiendo los carbohidratos? (el motor que haría falta para
--     cargar glucógeno: se necesitan 5-7 g/kg; por debajo de 3 g/kg no hay).
with d as (
  select m.logged_on, count(distinct m.meal) tiempos,
         sum(m.carbs_g) carbs, sum(m.energy_kcal) kcal
  from nutrition_log_macros m
  where m.user_id = :'uid' and m.logged_on between :'desde' and :'hasta'
  group by 1
), mm as (select *, ntile(2) over (order by logged_on) mitad from d where tiempos = 4)
select mitad, count(*) dias, min(logged_on) desde, max(logged_on) hasta,
       round(avg(carbs)) carbs_prom, round(avg(kcal)) kcal_prom
from mm group by mitad order by mitad;


-- ---------------------------------------------------------------------------
-- D. EL CRUCE — de aquí han salido los mejores hallazgos
-- ---------------------------------------------------------------------------

-- D1. Calorías del día D contra el cambio de peso a la mañana D+1.
--     Interpretación: si la correlación es ~0 con TODOS los días pero
--     positiva restringida a días completos, entonces los días completos
--     están bien medidos y los días con hueco son ruido que envenena
--     los promedios. Ese contraste es el hallazgo, no la correlación sola.
with k as (
  select m.logged_on d, sum(m.energy_kcal) kcal, count(distinct m.meal) tiempos
  from nutrition_log_macros m
  where m.user_id = :'uid' and m.logged_on between :'desde' and :'hasta'
  group by 1
), w as (
  select (measured_at at time zone 'America/Bogota')::date d, weight_kg::numeric kg
  from body_weight_logs where user_id = :'uid'
), j as (
  select k.d, k.kcal, k.tiempos, (w1.kg - w0.kg) delta
  from k join w w0 on w0.d = k.d join w w1 on w1.d = k.d + 1
)
select count(*) pares,
       round(corr(kcal, delta)::numeric, 3) corr_todos,
       round((select corr(kcal, delta) from j where tiempos = 4)::numeric, 3) corr_dias_completos,
       round(avg(kcal) filter (where tiempos = 4)) kcal_completos,
       round(avg(kcal) filter (where tiempos < 4)) kcal_con_hueco,
       round(avg(delta) filter (where tiempos = 4)::numeric, 3) delta_completos,
       round(avg(delta) filter (where tiempos < 4)::numeric, 3) delta_con_hueco
from j;

-- D2. El detalle día a día del mismo cruce (para encontrar el día delator:
--     pocas kcal registradas + salto de peso al día siguiente = comida
--     grande sin registrar).
with k as (
  select m.logged_on d, sum(m.energy_kcal) kcal, count(distinct m.meal) tiempos
  from nutrition_log_macros m
  where m.user_id = :'uid' and m.logged_on between :'desde' and :'hasta' group by 1
), w as (
  select (measured_at at time zone 'America/Bogota')::date d, weight_kg::numeric kg
  from body_weight_logs where user_id = :'uid'
)
select k.d, to_char(k.d,'Dy') dow, round(k.kcal) kcal, k.tiempos,
       w0.kg kg_hoy, w1.kg kg_manana, round(w1.kg - w0.kg, 2) delta
from k left join w w0 on w0.d = k.d left join w w1 on w1.d = k.d + 1
order by k.d;


-- ---------------------------------------------------------------------------
-- E. ENTRENAMIENTO
--    RECORDATORIO: routines y cardio_plan son PLANTILLA, no compromiso.
--    Nunca calcules adherencia contra ellas. Sebastián entrena 4 veces por
--    semana por decisión propia; el denominador son las sesiones registradas.
-- ---------------------------------------------------------------------------

-- E1. Sesiones reales y frecuencia semanal efectiva
select date_trunc('week', workout_date)::date as semana,
       count(distinct workout_date)           as sesiones,
       count(*)                               as series,
       round(sum(reps * weight))              as tonelaje,
       round(avg(rpe), 1)                     as rpe_prom
from workout_logs
where user_id = :'uid' and workout_date between :'desde' and :'hasta'
group by 1 order by 1;

-- E2. Resumen por sesión
select w.workout_date, to_char(w.workout_date, 'Dy') dow,
       count(*) series, count(distinct w.exercise_id) ejercicios,
       sum(w.reps) reps, round(sum(w.reps * w.weight)) tonelaje,
       round(avg(w.rpe), 1) rpe_prom,
       count(*) filter (where w.rpe is not null) series_con_rpe,
       string_agg(distinct e.muscle_group, ', ') grupos
from workout_logs w join exercises e on e.id = w.exercise_id
where w.user_id = :'uid' and w.workout_date between :'desde' and :'hasta'
group by 1 order by 1;

-- E3. *** PROGRESIÓN POR e1RM (Epley) — la métrica correcta ***
--     El tonelaje confunde progreso con hacer más reps; el peso solo ignora
--     cuántas se hicieron. Exige >=3 sesiones para concluir algo.
with s as (
  select e.name, e.muscle_group, w.workout_date,
         max(w.weight * (1 + w.reps / 30.0)) as e1rm,
         max(w.weight) as peso_max,
         round(avg(w.rpe), 1) as rpe
  from workout_logs w join exercises e on e.id = w.exercise_id
  where w.user_id = :'uid' and w.weight > 0
  group by e.name, e.muscle_group, w.workout_date
)
select name, muscle_group, count(*) sesiones,
       min(workout_date) desde, max(workout_date) hasta,
       round((array_agg(e1rm order by workout_date))[1], 1)      as e1rm_primera,
       round((array_agg(e1rm order by workout_date desc))[1], 1) as e1rm_ultima,
       round(100 * ((array_agg(e1rm order by workout_date desc))[1]
                  / nullif((array_agg(e1rm order by workout_date))[1], 0) - 1), 1) as pct_cambio,
       round((array_agg(rpe order by workout_date desc))[1], 1)  as rpe_ultima,
       round(max(e1rm), 1) as mejor_e1rm,
       (array_agg(round(e1rm,1) order by workout_date))::text as serie_e1rm
from s group by name, muscle_group
having count(*) >= 3
order by pct_cambio desc nulls last;
-- Peso abajo + RPE alto = fatiga real.
-- Peso abajo + RPE bajo = casi siempre cambio de máquina o reseteo técnico.

-- E4. Volumen semanal por grupo muscular (rango productivo: 10-20 series duras)
select e.muscle_group,
       count(*) series,
       round(count(*)::numeric
             / nullif(count(distinct date_trunc('week', w.workout_date)), 0), 1) as series_por_semana,
       round(avg(w.rpe), 1) rpe_prom
from workout_logs w join exercises e on e.id = w.exercise_id
where w.user_id = :'uid' and w.workout_date between :'desde' and :'hasta'
group by 1 order by series_por_semana desc;

-- E5. Cardio efectivamente registrado. Pocas filas = pocas filas.
--     Si el cardio pesa en la cuenta energética, PREGUNTAR, no inferir.
select workout_date, minutes, modality
from cardio_logs
where user_id = :'uid' and workout_date between :'desde' and :'hasta'
order by workout_date;

-- E6. La prescripción vigente (para saber QUÉ tocaba, no para juzgar)
select r.day_of_week, to_char(date '2026-08-16' + r.day_of_week, 'Dy') dia,
       e.name, e.muscle_group, r.sets, r.target_reps, r.rest_seconds,
       r.cadence, r.superset_group, r.notes
from routines r join exercises e on e.id = r.exercise_id
where r.user_id = :'uid'
order by r.day_of_week, r.sort_order;


-- ---------------------------------------------------------------------------
-- F. REVISIÓN SEMANAL DE COACH  (§7 de la skill)
--    Entregable recurrente. Cierra siempre con UNA decisión:
--    ajustar, esperar, o "los datos aún no dan".
-- ---------------------------------------------------------------------------

-- F1. Tablero de la semana. Un solo resultado con todo lo que se revisa.
--     Para la tendencia de peso con IC, correr ADEMÁS C2 sobre el mismo rango.
with dia as (
  select m.logged_on,
         count(distinct m.meal) as tiempos,
         sum(m.energy_kcal) as kcal,
         sum(m.protein_g)   as prot,
         sum(m.fiber_g)     as fib,
         -- termómetro del proceso: ¿se está anotando la grasa de cocción?
         bool_or(m.source_name ~* 'aceite|mantequilla|manteca|margarina') as con_grasa,
         -- ¿se están anotando las comidas de calle?
         bool_or(m.note ~* 'estimado') as con_estimado
  from nutrition_log_macros m
  where m.user_id = :'uid'
    and m.logged_on between :'desde' and :'hasta'
    and m.logged_on < current_date
  group by m.logged_on
),
g as (select * from nutrition_goals where user_id = :'uid'),
pes as (
  select count(*) n, round(min(weight_kg),2) minimo,
         round(max(weight_kg),2) maximo, round(avg(weight_kg),2) media
  from body_weight_logs
  where user_id = :'uid'
    and (measured_at at time zone 'America/Bogota')::date between :'desde' and :'hasta'
)
select
  (select count(*) from dia)                            as dias_con_registro,
  (select count(*) from dia where tiempos = 4)          as dias_completos,
  (select count(*) from dia where tiempos < 4)          as dias_con_hueco,
  round((select avg(kcal) from dia where tiempos = 4))  as kcal_prom,
  g.energy_kcal                                         as kcal_meta,
  round((select avg(kcal) from dia where tiempos = 4) - g.energy_kcal) as kcal_vs_meta,
  round((select avg(prot) from dia where tiempos = 4))  as prot_prom,
  g.protein_g                                           as prot_meta,
  round((select avg(prot) from dia where tiempos = 4) / 78.09, 2) as prot_g_por_kg,
  round((select avg(fib) from dia where tiempos = 4))   as fibra_prom,
  g.fiber_g                                             as fibra_meta,
  -- métricas de PROCESO de la fase de calibración
  (select count(*) from dia where con_grasa)            as dias_con_grasa_anotada,
  (select count(*) from dia where con_estimado)         as dias_con_comida_estimada,
  p.n as pesajes, p.minimo as peso_min, p.maximo as peso_max, p.media as peso_medio,
  -- cardio: desde 2026-09-05 la ausencia es dato (ver §2). Neto ~8 kcal/min a 78 kg.
  (select count(*) from cardio_logs c
    where c.user_id = :'uid' and c.workout_date between :'desde' and :'hasta') as cardio_sesiones,
  (select coalesce(sum(c.minutes),0) from cardio_logs c
    where c.user_id = :'uid' and c.workout_date between :'desde' and :'hasta') as cardio_minutos,
  (select round(coalesce(sum(c.minutes),0) * 8.0) from cardio_logs c
    where c.user_id = :'uid' and c.workout_date between :'desde' and :'hasta') as cardio_kcal_aprox
from g, pes p;

-- F2. Ejercicios estancados o en retroceso, con la lectura ya hecha.
--     Dos criterios distintos y no intercambiables:
--       · `cambio`  = primera vs ultima sesion (tendencia larga)
--       · `plano_3` = las ultimas 3 sesiones con el MISMO e1RM (estancamiento
--                     reciente) — atrapa al que subio y luego se plancho, que
--                     la tendencia larga sigue mostrando como "progresando".
--     RPE bajo en un estancamiento = SUBCARGA (hay margen), no meseta.
--     Ojo: rpe puede ser null; las comparaciones con null dan null, por eso
--     las ramas de retroceso van ANTES y hay una rama final sin condicion de rpe.
with s as (
  select e.name, w.workout_date,
         max(w.weight * (1 + w.reps / 30.0)) as e1rm,
         round(avg(w.rpe), 1) as rpe
  from workout_logs w join exercises e on e.id = w.exercise_id
  where w.user_id = :'uid' and w.weight > 0
  group by e.name, w.workout_date
), u as (
  select name, count(*) as sesiones,
         (array_agg(round(e1rm,1) order by workout_date desc))[1:3] as u3,
         (array_agg(rpe order by workout_date desc))[1] as rpe_ultima,
         (array_agg(e1rm order by workout_date desc))[1]
           / nullif((array_agg(e1rm order by workout_date))[1],0) - 1 as cambio
  from s group by name having count(*) >= 3
), v as (
  select *, (u3[1] = u3[2] and u3[2] = u3[3]) as plano_3 from u
)
select name, sesiones, u3 as ultimos_3_e1rm, rpe_ultima,
       round(100*cambio, 1) as pct_total,
  case
    when cambio < -0.02 and rpe_ultima >= 9 then 'RETROCESO con RPE alto: fatiga real'
    when cambio < -0.02                     then 'BAJA con RPE bajo/ausente: revisar maquina o tecnica'
    when plano_3 and rpe_ultima < 8         then 'ESTANCADO y SUBCARGADO: hay margen, subir peso'
    when plano_3 and rpe_ultima >= 9        then 'MESETA con esfuerzo alto: considerar descarga'
    when plano_3                            then 'ESTANCADO 3 sesiones: forzar progresion'
    else 'progresando'
  end as lectura
from v order by cambio;
