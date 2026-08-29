# Base de datos

## `migrations/`

Copia local de las migraciones ya aplicadas en el proyecto remoto
(`dpuccuthmcrolutpzicu`). Los nombres de archivo coinciden con la versión
registrada en el historial de Supabase, así que `list_migrations` y esta
carpeta se leen igual.

Las funciones son todas `security invoker` con `search_path = ''`: la RLS del
usuario sigue aplicando y no hay resolución ambigua de nombres.

| Migración | Qué aporta |
|---|---|
| `routines_prescription_columns` | `target_reps`, `rest_seconds`, `cadence`, `superset_group`, `notes` en `routines` |
| `follow_pdf_schema` | `workout_logs.rpe`, `exercises.image_url`, tablas `training_phases`, `cardio_plan`, `cardio_logs` + RLS |
| `routine_rpcs_and_stats` | `swap_routine_order`, `move_routine_to_day`, `swap_routine_days`, `exercise_stats` |
| `export_rpc_and_cardio_seed` | `export_training_data` + cardio y fase del protocolo vigente |
| `previous_sets_rpc` | `previous_sets`: última sesión previa por ejercicio |
| `session_duration_timestamps` | `updated_at` + trigger en `workout_logs` y `cardio_logs`; `export_training_data` devuelve inicio, fin y duración de cada jornada en hora local (`p_tz`) |
| `stats_date_ranges_and_summary` | `exercise_stats` pasa a recibir un rango (`p_from`, `p_to`) y separa lo del período del récord de siempre; nueva `training_summary` con totales del período y del anterior, serie por día, balance por grupo muscular, récords y ejercicios de la rutina sin registrar |
| `nutrition_module` | Módulo de nutrición: `food_products` (catálogo, macros **por 100 g** + `ocr_raw` con la respuesta cruda del modelo), `nutrition_logs` (qué se comió y cuántos gramos), `ocr_usage` (cuota diaria de escaneos). Bucket privado `nutrition` con política por carpeta `{user_id}/…` |
| `recipes_goals_and_macro_views` | `recipes` + `recipe_items` (preparados hechos de productos del catálogo), `nutrition_goals` (meta diaria, una fila por usuario). `nutrition_logs` pasa a aceptar producto **o** receta. Vistas `recipe_nutrition` y `nutrition_log_macros`, ambas `security_invoker`, que resuelven los macros ya escalados |
| `ocr_usage_limit_rpc` | `bump_ocr_usage(p_user, p_limit)`: suma un escaneo al contador diario y devuelve el total, o `-1` si ya pasó el tope. Incremento y verificación en la misma sentencia |
| `exercises_never_deleted` | El catálogo de ejercicios pasa a ser acumulativo: las FK desde `routines` y `workout_logs` pasan de CASCADE a **RESTRICT**, `exercises` se queda sin política de DELETE (y sin el privilegio) y gana un unique por `(user_id, lower(name))` para que los seeds hagan upsert en vez de borrar y resembrar |
| `exercise_guide` | `exercises.dataset_id` (vínculo con el catálogo de referencia) e `exercises.instructions` (pasos en español). Bucket **público** `exercises` para las ilustraciones animadas. Unifica `Femorales` → `Isquiotibiales` |

### La cuota de escaneos

La API key de Gemini es una sola para toda la app: su límite diario se reparte
entre todos los usuarios. `bump_ocr_usage` incrementa y verifica en una sola
sentencia (`insert … on conflict do update … where scans < p_limit`); partirlo
en leer-comparar-escribir abriría una ventana donde dos peticiones simultáneas
leen el mismo valor y ambas pasan el tope.

La tabla `ocr_usage` no tiene política de escritura a propósito: solo la escribe
la Edge Function con `service_role`. Si el cliente pudiera tocar su contador, el
límite no limitaría nada.

### La guía de cada ejercicio

Cada fila de `exercises` puede apuntar, por `dataset_id`, a un movimiento del
[exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset): 1.324
ejercicios con animación, taxonomía y pasos en diez idiomas. De ahí salen la
ilustración animada y los pasos en español que la app muestra al tocar el
encabezado de un ejercicio.

Los **nombres no se tocan**: siguen siendo los del PDF del entrenador, que son
los que uno reconoce en el gimnasio y los que él usa cuando manda la fase
siguiente. El dataset entra por debajo como referencia. Lo que sí estandariza es
el vínculo: dos nombres distintos del mismo movimiento apuntan al mismo
`dataset_id` y por lo tanto son el mismo ejercicio.

Los pasos se **copian** a `exercises.instructions` en vez de referenciarse. El
dataset entero son 17 MB por las diez traducciones que no se usan; copiados
viajan en la misma consulta que la pantalla del día ya hacía.

**Para vincular un ejercicio nuevo:**

1. Buscalo en el navegador del dataset (abrí su `index.html`, tiene búsqueda por
   nombre, equipo y músculo) y copiá el id de 4 dígitos.
2. Agregá la línea a `scripts/ejercicios-dataset.mjs`, con la clave igual al
   nombre exacto en `exercises`.
3. Corré el script, que convierte la animación a WebP, la sube y actualiza la
   fila:

   ```bash
   APP_EMAIL=… APP_PASSWORD='…' node scripts/vincular-ejercicios.mjs
   ```

   Necesita `ffmpeg`. Es idempotente, así que vuelve a correrse sin costo: sólo
   trabaja sobre lo que cambió. Con `--dry-run` no toca nada y lista lo que
   haría, incluidos los ejercicios que quedaron sin vincular.

Un ejercicio sin `dataset_id` no es un error: sale en la app como salía antes,
sin miniatura y sin guía.

**La media es © Gym visual** (gymvisual.com) y se usa a 180×180 con la
atribución a la vista en el modal, que es lo que pide su NOTICE. Por eso los
archivos **no se versionan en este repo, que es público**: el script los
reconstruye desde el dataset local. Si algún día la app sale de uso personal,
hay que sacar licencia propia con Gym visual.

### Los grupos musculares

La lista canónica vive en `lib/muscle-groups.ts` y es la que alimenta el
desplegable de Rutinas. **Los seeds tienen que escribir esos mismos nombres.**

Estaba duplicada y divergiendo: los seeds decían «Isquiotibiales», «Glúteo»,
«Pantorrilla», «Core» y el desplegable ofrecía «Femorales», «Glúteos»,
«Pantorrillas», «Abdominales». El balance por grupo de Estadísticas agrupa por
el texto, así que cada ejercicio creado a mano abría una barra propia en vez de
sumarse a la de sus compañeros de músculo. Ya había pasado con «Peso muerto»,
que `exercise_guide` reasignó.

La base no tiene constraint contra esa lista a propósito: una fase nueva puede
traer un grupo que todavía no esté, y que el seed falle por eso sería peor que
tener un grupo suelto.

### El peso cocido de las recetas

`recipes.yield_g` es el peso del preparado **terminado, en la balanza**, y no la
suma de sus ingredientes. Al cocinar se evapora agua (un guiso pesa menos de lo
que entró) o se absorbe (el arroz pesa más). Una porción servida se escala
contra ese peso real: `macros_totales × gramos_servidos / total_g`.

Si `yield_g` queda en null se usa la suma de ingredientes, que es lo correcto
para preparados en frío —una ensalada, un batido— donde no hay pérdida. Usar la
suma cuando sí hubo cocción subestima los macros de forma sistemática: en el
caso de prueba (130 g de ingredientes que rinden 120 g) el error era del 8% en
cada comida.

## `functions/`

Edge Functions desplegadas con el MCP (`deploy_edge_function`), igual que las
migraciones: esta carpeta es la copia local de lo que corre en el proyecto.

| Función | Qué hace |
|---|---|
| `ocr-nutricion` | Recibe la foto de la tabla nutricional y la del frente en base64, se las pasa a Gemini con `responseSchema` y devuelve el JSON de macros validado. La API key vive en el secret `GEMINI_API_KEY`, nunca en la app. El modelo se cambia con el secret `GEMINI_MODEL` sin redesplegar. |

Las reglas por campo (marca que no se deduce, porción literal, columnas que no
se derivan una de otra) van en el `description` de cada propiedad del
`responseSchema`, no en el prompt: el modelo las obedece ahí y no en la prosa.

## `seed/`

Un archivo por fase del entrenador. Cada uno **reemplaza la rutina de la semana
y deja todo lo demás en pie**: es idempotente y no destructivo. `routines` es la
prescripción de la fase vigente, así que entra una nueva y sale la anterior; el
catálogo de `exercises` se siembra por upsert y `workout_logs` no se toca.

Antes no era así —el seed borraba las tres tablas— y cada fase nueva estrenaba
un historial vacío, que es justo lo que hace falta para saber si la fase
anterior sirvió. La migración `exercises_never_deleted` cerró esa puerta desde
la base: las FK son ON DELETE RESTRICT, así que un seed que intente borrar el
catálogo ahora falla en vez de vaciar el historial en silencio.

### Cuando llegue una fase nueva (AJUSTE 2, 3…)

1. Copiá `ajuste1_2026-08-03.sql` a un archivo nuevo con la fecha de la fase.
2. Actualizá el catálogo de ejercicios, las filas de rutina, `cardio_plan`
   y la fila de `training_phases` (`name`, `started_on`, `rpe_target`,
   `rir_target`, `method`, `warmup`).

   En el catálogo, **agregá los ejercicios nuevos de la fase; no saques los de
   la anterior**. El `on conflict … do update` reusa la fila que ya existe, y
   ese id es del que cuelgan los `workout_logs` viejos. Un ejercicio que la fase
   nueva no usa simplemente deja de aparecer en `routines`: sigue en el catálogo
   con su historial, listo para cuando vuelva.
   Dentro de esa lista los nombres tienen que ser distintos **ignorando
   mayúsculas**. Si aparecen dos que solo difieren en la caja, Postgres corta con
   `ON CONFLICT DO UPDATE command cannot affect row a second time`: no es un bug
   del seed, es el unique avisando que estás sembrando el mismo ejercicio dos
   veces.

   El grupo muscular tiene que salir de `lib/muscle-groups.ts` (ver «Los grupos
   musculares»); un nombre nuevo para un músculo que ya está parte su barra en
   el balance de Estadísticas.
3. Ajustá los `count` del bloque de verificación al final. El de `routines` es
   exacto (la rutina se reemplaza entera); el de `exercises` es un **piso**
   (`>=`), porque el catálogo acumula fases anteriores y lo que el usuario haya
   creado a mano desde la app.
4. Aplicalo con el MCP de Supabase (`execute_sql`) o desde el SQL Editor.
5. Vinculá los ejercicios nuevos al dataset (ver «La guía de cada ejercicio»), o
   van a salir sin ilustración ni pasos.

Ya no hace falta exportar el histórico antes de aplicar una fase: el seed no lo
toca. Exportar desde **Ajustes → Exportar datos → Todo** sigue siendo buena idea
como respaldo, pero dejó de ser el único ejemplar.

El `user_id` va como literal en el seed. Para otro usuario, resolvelo con
`select id from auth.users where email = '…'`.
