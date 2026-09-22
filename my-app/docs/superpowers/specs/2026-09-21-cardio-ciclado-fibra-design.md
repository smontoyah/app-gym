# Cardio como ejercicio, objetivos en g/kg con ciclado, y fibra en la UI

Fecha: 2026-09-21 · Rama: `feats-plan-ciro`

Tres cambios que llegaron juntos pero se tocan poco entre sí. Van en un solo
documento porque los tres mueven el esquema y conviene ver el total de
migraciones de una vez; se pueden implementar y verificar por separado.

---

## 1 · Cardio en gym

### El problema

Hoy la app tiene dos cosas que se llaman cardio y no son la misma:

- `cardio_plan` / `cardio_logs`: **un** bloque de minutos por fecha, con un
  objetivo por día de la semana. Es el LISS que prescribe el entrenador y lo
  pinta `CardioCard` al pie de la pantalla del día.
- Lo que falta: poder crear *ejercicios* de cardio con nombre propio
  («caminadora inclinada»), meterlos en la rutina de un día y registrarlos
  serie por serie como cualquier otro.

Lo segundo no entra en el modelo actual porque `workout_logs.reps` y
`workout_logs.weight` son `not null`: una serie de 45 minutos no tiene ni reps
ni kilos que poner.

### La decisión

El cardio nuevo es **un ejercicio más de la rutina**. Reusa `routines`,
`workout_logs`, el orden del día, las super series, el progreso y el descanso.
La `CardioCard` del LISS **no se toca** y sigue viviendo en sus tablas.

La categoría no necesita columna: `exercises.muscle_group` ya es texto libre sin
constraint. `'Cardio'` entra como un valor más.

Lo que sí es columna nueva es **cómo se mide** el ejercicio. Va en `exercises`,
no en `routines`, porque una caminadora se mide en minutos el lunes y el
miércoles también: es una propiedad del movimiento, no de la prescripción.

Y va **ortogonal a la categoría**, no exclusiva de Cardio: una plancha es Core y
se mide en tiempo. El formulario ofrece los tres modos siempre y solo cambia el
que viene preseleccionado.

### Esquema

```sql
alter table public.exercises
  add column tracking_mode text not null default 'carga'
  check (tracking_mode in ('carga', 'reps', 'tiempo'));

alter table public.workout_logs
  add column duration_seconds integer
  check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 36000));

alter table public.workout_logs alter column reps   drop not null;
alter table public.workout_logs alter column weight drop not null;
```

Los tres modos y lo que guarda cada uno:

| modo | reps | weight | duration_seconds | ejemplo |
|---|---|---|---|---|
| `carga` | sí | sí | — | press banca 10 × 60 kg |
| `reps` | sí | — | — | burpees × 30 |
| `tiempo` | — | — | sí | caminadora inclinada 45 min |

`reps` y `weight` pasan a nullable en vez de guardar ceros porque **0 kg ya es un
valor real**: los ejercicios a peso corporal se registran así hoy. Un cero de
«no aplica» sería indistinguible de un cero de «sin carga externa» y
contaminaría cualquier promedio futuro.

Tope de 36 000 s = 10 h: mismo criterio que `MAX_REPS` y `MAX_WEIGHT_KG` en
[app/gym/ejercicio/_lib/actions.ts](../../../app/gym/ejercicio/_lib/actions.ts),
que no son límites de entrenamiento sino filtros de tecleo.

**No se agrega columna a `routines`.** `target_reps` es `text` y ya sirve de
objetivo prescrito; en modo `tiempo` su «45» se lee como 45 min. La UI cambia la
etiqueta según el modo.

### Migración de las RPCs

Este es el riesgo real del lote. Cuatro funciones tocan `workout_logs` y todas
suponen que `reps` y `weight` tienen valor. Qué le pasa a cada una:

**`exercise_stats`** — `sum(weight * reps)` ignora nulls, así que el volumen
sigue correcto. Lo que rompe es la presentación: un ejercicio de tiempo saldría
con `last_weight`, `last_e1rm` y `max_weight` en null y la tarjeta mostraría
«0 kg». Se agregan dos columnas al `returns table` —`tracking_mode text` y
`duration_min numeric`— para que la pantalla lo pinte como minutos. Cambia la
firma ⇒ hace falta `drop function` antes del `create or replace`.

**`training_summary`** — tres arreglos:

- `day_strength.sets` y `range_totals.sets` usan `count(*)`, que contaría las
  series de cardio como series de fuerza. Pasan a
  `count(*) filter (where e.muscle_group <> 'Cardio')`, con el join a
  `exercises` que hoy no está en esos CTEs.
- El CTE `muscle` agrupa por `e.muscle_group` sin filtrar: la caminadora
  aparecería como un músculo en «Balance por grupo». Se excluye con
  `where e.muscle_group <> 'Cardio'`.

El corte es por **categoría, no por modo**, y los dos filtros usan el mismo
criterio a propósito. Una plancha es Core en modo `tiempo`: es una serie de
trabajo real y tiene que contar tanto en el total de series como en el balance
de Core. Si se cortara por `tracking_mode = 'carga'`, la plancha sumaría en el
balance pero no en el total y los dos números dejarían de cuadrar. Su volumen
igual queda en null y no ensucia los kilos.
- `cardio_minutes` hoy solo suma `cardio_logs`. Pasa a sumar también
  `duration_seconds / 60` de los `workout_logs` en modo `tiempo`, que es donde
  ahora vive la mayor parte del cardio.

`pr_events` no necesita filtro: `max(weight * (1 + reps/30))` sobre filas todas
nulas da null, y `top_e1rm > prev_best` con null no es true. Los ejercicios de
cardio quedan fuera de los récords solos. **Verificar, no asumir.**

**`previous_sets`** — se agrega `duration_seconds` al `returns table` para que la
referencia «anterior: 45 min» funcione igual que «anterior: 60 kg × 10». Cambia
la firma ⇒ `drop function` primero.

**`export_training_data`** — **no cambia de firma**. Las filas en modo `tiempo`
llenan la columna `minutos` que ya existe y dejan `peso_kg`, `reps`, `e1rm_kg` y
`volumen_kg` en null; `tipo` pasa a `'cardio'` cuando `tracking_mode = 'tiempo'`.
Así el CSV y `app/ajustes/_lib/export.ts` quedan intactos.

### Cambios en la app

| Archivo | Qué cambia |
|---|---|
| `lib/muscle-groups.ts` | Se parte en dos listas: `MUSCLE_GROUPS` (lo que puntúa en Balance) y `EXERCISE_CATEGORIES = [...MUSCLE_GROUPS, CARDIO_GROUP]` (lo que ofrece el desplegable) |
| `lib/tracking-mode.ts` *(nuevo)* | Los tres modos, sus etiquetas, y el parseo/formateo de minutos ↔ segundos. Un solo lugar para que la pantalla del día y las estadísticas digan «45 min» igual |
| `types/database.ts` | `Exercise.tracking_mode`, `WorkoutLog.duration_seconds`, `PreviousSetRow.duration_seconds`, `ExerciseStatsRow.tracking_mode` y `.duration_min` |
| `app/gym/configuracion/_components/exercise-form.tsx` | Desplegable pasa a `EXERCISE_CATEGORIES`; selector de modo de tres botones (mismo patrón que los chips de comida del diario). Al elegir `Cardio`, arranca en `tiempo` |
| `app/gym/configuracion/_lib/actions.ts` | `createExercise` recibe y guarda el modo |
| `app/gym/ejercicio/_lib/types.ts` | `SetLog` gana `duration` (string, lo que se ve en el input) |
| `app/gym/ejercicio/_lib/actions.ts` | `saveWorkoutSet` valida y guarda según el modo; `fetchDayWorkout` mapea `duration_seconds`; `buildSuggestion` devuelve `undefined` fuera de `carga` |
| `app/gym/ejercicio/_components/set-row.tsx` | Campos según modo: `carga` → reps·peso·RPE, `reps` → reps·RPE, `tiempo` → min·RPE |
| `app/gym/ejercicio/_components/exercise-card.tsx` | Oculta el toggle kg/lb y la sugerencia de carga fuera de `carga` |
| `app/gym/estadisticas/_components/stat-card.tsx` | Muestra minutos en vez de kg/e1RM para `tiempo` |

---

## 2 · Objetivos en g/kg y día de ciclado

### El problema

`nutrition_goals` es una fila por usuario con gramos absolutos. Dos cosas no
caben ahí: que el objetivo se escriba por kilo de peso corporal, y que exista un
segundo juego de objetivos para los días de ciclado de carbohidratos.

### Esquema

```sql
-- Dos juegos de objetivos por usuario
alter table public.nutrition_goals
  add column profile text not null default 'normal'
  check (profile in ('normal', 'ciclado'));

alter table public.nutrition_goals drop constraint nutrition_goals_pkey;
alter table public.nutrition_goals add primary key (user_id, profile);

alter table public.nutrition_goals
  add column protein_g_kg numeric check (protein_g_kg is null or protein_g_kg >= 0),
  add column carbs_g_kg   numeric check (carbs_g_kg   is null or carbs_g_kg   >= 0),
  add column fat_g_kg     numeric check (fat_g_kg     is null or fat_g_kg     >= 0);
```

`energy_kcal` y `fiber_g` **se quedan absolutos**: la meta de calorías es 1 850
con regla de déficit, un número puesto a mano que no se mueve con el peso, y la
fibra se prescribe en g/día.

Backfill de la fila que existe, con el último pesaje (77,10 kg), redondeando a
dos decimales:

| | antes | g/kg | resuelto |
|---|---|---|---|
| Proteína | 170 g | 2,20 | 169,6 g |
| Carbos | 160 g | 2,08 | 160,4 g |
| Grasa | 63 g | 0,82 | 63,2 g |

La diferencia es de décimas y viene de redondear a dos decimales. Se deja
anotado en la bitácora de `analisis-progreso`. El perfil `ciclado` **nace
vacío**: los números los pone el usuario.

Después del backfill se borran `protein_g`, `carbs_g` y `fat_g`.

```sql
-- Qué días fueron de ciclado. Solo hay fila en los días marcados.
create table public.nutrition_days (
  user_id      uuid not null references auth.users(id) on delete cascade,
  logged_on    date not null,
  goal_profile text not null check (goal_profile in ('normal', 'ciclado')),
  created_at   timestamptz not null default now(),
  primary key (user_id, logged_on)
);
alter table public.nutrition_days enable row level security;
create policy "Users manage own nutrition_days" on public.nutrition_days
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

Ausencia de fila = día normal. Es el default correcto: son la mayoría de los
días y así los 401 registros que ya existen no necesitan backfill.

### La vista que salva las skills

`consultas.sql` de **analisis-progreso** y **reporte-nutricion** leen
`nutrition_goals.protein_g / carbs_g / fat_g` directo y asumen una sola fila.
Borrar esas columnas las rompe a las dos.

```sql
create view public.nutrition_goals_current
with (security_invoker = true) as
select g.user_id, g.profile, w.weight_kg,
       g.energy_kcal,
       round(g.protein_g_kg * w.weight_kg, 1) as protein_g,
       round(g.carbs_g_kg   * w.weight_kg, 1) as carbs_g,
       round(g.fat_g_kg     * w.weight_kg, 1) as fat_g,
       g.fiber_g, g.updated_at
  from public.nutrition_goals g
  left join lateral (
    select b.weight_kg from public.body_weight_logs b
     where b.user_id = g.user_id order by b.measured_at desc limit 1
  ) w on true;
```

`security_invoker = true` para que la RLS del usuario siga aplicando; sin eso la
vista correría con los permisos del dueño y expondría los objetivos de
cualquiera. Las dos skills pasan a leer la vista con `profile = 'normal'`.

### RPC nueva para el objetivo de cada día

Estadísticas necesita, por día, el perfil que le tocaba y el peso vigente
entonces. Va en una RPC aparte en vez de ensanchar `nutrition_summary`: es
aditivo y no arriesga la pantalla que ya funciona.

```sql
create function public.nutrition_day_goals(p_from date, p_to date)
returns table (day date, profile text, weight_kg numeric,
               energy_kcal numeric, protein_g numeric,
               carbs_g numeric, fat_g numeric, fiber_g numeric)
```

Por cada día del rango: el perfil sale de `nutrition_days` (o `'normal'` si no
hay fila) y el peso del pesaje más reciente **con fecha ≤ ese día**. Así un día
de julio se compara contra el peso que había en julio, no contra el de hoy.
`security invoker`, `search_path = ''`, como todas las demás.

### Cambios en la app

| Archivo | Qué cambia |
|---|---|
| `lib/nutricion/objetivos.ts` *(nuevo)* | Qué campo es por kilo y cuál absoluto; `resolveGoals(goals, weightKg)` → gramos. Un solo lugar donde vive la multiplicación |
| `lib/nutricion/diario.ts` | `fetchDay` trae también el perfil del día y el último peso; `fetchGoals` devuelve los dos perfiles y `saveGoals` cambia su `onConflict` de `'user_id'` a `'user_id,profile'` — si no, el upsert del perfil de ciclado pisaría el normal |
| `app/nutricion/objetivos.tsx` | Dos secciones (Normal / Ciclado). Se escribe g/kg y debajo se lee en vivo «2,20 g/kg × 77,1 kg = 170 g». El chequeo de kcal implícitas que ya existe corre sobre los gramos resueltos |
| `app/nutricion/index.tsx` | Switch de ciclado bajo el navegador de fecha, en cualquier día. Al prenderlo las `MacroBar` se recalculan contra el otro perfil |
| `app/nutricion/estadisticas/_lib/actions.ts` | Llama a `nutrition_day_goals` y promedia el objetivo del período |
| `app/nutricion/estadisticas/_components/goal-meters.tsx` | Compara contra ese promedio; el pie aclara cuántos días fueron de ciclado |

**Sin pesaje registrado** no hay con qué resolver los g/kg. El diario lo dice en
una línea y ofrece ir a la pestaña de Peso, en vez de pintar barras en cero.
Mismo criterio que la tarjeta «Definí tu objetivo diario» que ya existe.

---

## 3 · Fibra en la UI

`fiber_g` ya viaja entero: está en `food_products`, en las vistas
`nutrition_log_macros` y `recipe_nutrition`, en `nutrition_goals`, en
`GOAL_FIELDS`, en `nutrition_summary` y en la gráfica de Estadísticas. Ya tiene
su `MacroBar` en el diario y su renglón en `ImpactPreview`.

Lo único que falta es la **F** donde hoy hay tres letras, con la misma
tipografía y el mismo gris que P/C/G:

| Archivo | Línea |
|---|---|
| `app/nutricion/index.tsx` | 151 — encabezado de comida |
| `app/nutricion/index.tsx` | 172 — renglón del diario |
| `app/nutricion/catalogo/index.tsx` | 134 — tarjeta del catálogo |
| `app/nutricion/recetas/[id].tsx` | 251 — total del preparado |

No hay cambio de datos ni de esquema. Es el pedazo más chico del lote y se puede
verificar solo.

---

## Verificación

- **Migraciones**: cada una se aplica contra una rama de Supabase antes que
  contra producción. Hay 502 `workout_logs`, 401 `nutrition_logs` y 32 pesajes
  que no se pueden perder.
- **RPCs**: para cada una, correr la versión vieja y la nueva sobre el mismo
  rango y comparar fila por fila. El volumen, las series y el balance por grupo
  del histórico **no pueden moverse ni un kilo**: ningún registro existente es
  de cardio, así que cualquier diferencia es un bug de la migración.
- **Cardio de punta a punta**: crear «Caminadora inclinada» en modo tiempo,
  meterla en un día, registrar 45 min, y confirmar que (a) aparece en el día,
  (b) **no** aparece en Balance por grupo, (c) **no** genera un récord,
  (d) suma a los minutos de cardio del período, (e) sale en el CSV con `tipo`
  = `cardio` y `minutos` = 45.
- **g/kg**: con 77,1 kg, el objetivo resuelto tiene que dar 170/160/63 ±1 g
  contra lo que hay hoy en pantalla.
- **Ciclado**: marcar un día, confirmar que las barras cambian de meta, que el
  día de al lado no se movió, y que Estadísticas cuenta ese día como de ciclado.
- **Skills**: correr `consultas.sql` y la consulta de objetivos de
  `reporte-nutricion` después de la migración. Tienen que devolver lo mismo que
  antes.

## Fuera de alcance

Descartado en el brainstorming: inclinación y velocidad por serie, migrar el
LISS al modelo nuevo, y calorías en kcal/kg.

No se toca: la `CardioCard`, el catálogo de alimentos, el OCR, las recetas más
allá del renglón de fibra, ni la tabla `cardio_plan` / `cardio_logs`.
