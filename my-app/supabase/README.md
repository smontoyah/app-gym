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
| `product_cooking_state` | `food_products.base_state` (en qué forma están las macros: crudo o cocido) y `food_products.cooked_yield_pct` (gramos cocidos por cada 100 g crudos). `nutrition_logs.logged_state` recuerda en qué forma se pesó cada renglón; `quantity_g` sigue siendo siempre la forma base. `nutrition_log_macros` expone las tres |
| `unify_raw_cooked_foods` | Funde las dos filas de papa y de batata en una sola, con el rendimiento deducido de sus propias kcal (89,53 % y 113,16 %). Muda los registros del diario convirtiendo el peso y anotando `logged_state`, y borra la fila sobrante |
| `exercise_guide` | `exercises.dataset_id` (vínculo con el catálogo de referencia) e `exercises.instructions` (pasos en español). Bucket **público** `exercises` para las ilustraciones animadas. Unifica `Femorales` → `Isquiotibiales` |
| `exercise_media_select_policy` | Política de **SELECT** sobre `storage.objects` para el bucket `exercises`. Sin ella la subida fallaba entera: la Storage API inserta con `INSERT … RETURNING`, y un RETURNING bajo RLS necesita permiso de lectura sobre la fila nueva |

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

   Atajo que sirvió en la fase CARGA: **los PDF de Ciro traen una miniatura por
   ejercicio y son las mismas ilustraciones de Gym visual que el dataset.**
   Sacándolas con `pdfimages -j -p el.pdf out/im` y comparándolas contra
   `images/*.jpg` se empareja mirando el dibujo en vez de traduciendo el nombre.
   Dos detalles del método: las miniaturas salen en orden de página y los
   `object ID` que repite `pdfimages -list` confirman el orden (la caminadora es
   el mismo objeto en las cinco páginas donde aparece); y varias miniaturas son
   fotogramas de los videos del propio entrenador, no del dataset, así que ahí
   no hay nada que comparar y toca elegir por nombre.

   Así se cazó que los dos «Elevación de talón sentado en máquina» del PDF
   (lunes y viernes) traen dibujos de **máquinas distintas** —uno es la de
   sentado con el peso en las rodillas y el otro una prensa de talón—, aunque el
   nombre, las reps, la cadencia y el descanso sean idénticos.
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

**Si el script falla con `storage — new row violates row-level security policy`
en todos los archivos**, lo que falta es la política de **SELECT** del bucket,
no la de INSERT: la Storage API sube con `INSERT … RETURNING` y bajo RLS un
RETURNING necesita leer la fila nueva. Lo arregla la migración
`exercise_media_select_policy`. Se verifica en la base sin salir del SQL:

```sql
-- como authenticated, el mismo insert pasa sin RETURNING y falla con RETURNING
select policyname, cmd from pg_policies
 where schemaname='storage' and tablename='objects' and policyname ilike '%exercise%';
```

Tienen que salir tres filas (INSERT, SELECT, UPDATE). Y ojo con `storage.objects`
si hay que limpiar a mano: un trigger (`storage.protect_delete`) bloquea el
`delete` directo, y el escape es `set_config('storage.allow_delete_query','true',true)`
dentro de la transacción. Borrar la fila sin borrar el archivo deja un huérfano,
así que para archivos de verdad usá la Storage API.

**El estado real se mira en la base, no en la app.** Si `dataset_id` e
`instructions` están llenos pero `image_url` es null, la subida nunca corrió:

```sql
select count(*) from storage.objects where bucket_id = 'exercises';  -- 0 = nada subido
```

Ese estado es engañoso en pantalla: la tarjeta solo pinta miniatura si
`image_url` no es null, pero `hasGuide` también acepta `instructions`, así que el
modal «cómo se hace» abre con los pasos y sin dibujo.

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

### Crudo y cocido

Un alimento cambia de peso al cocinarse pero sus macros no viajan con el agua:
100 g de arroz seco son 360 kcal y 100 g del mismo arroz cocido, 130. Por eso
cada fila del catálogo vale para **una sola forma**, y hasta ahora esa forma
vivía únicamente en el nombre —«Arroz blanco (cocido)»—, que la app no puede
interpretar.

`base_state` la vuelve dato: dice en qué forma están las macros por 100 g y, por
lo tanto, en qué forma se guarda `nutrition_logs.quantity_g`. `cooked_yield_pct`
dice cuánto rinde: **gramos cocidos por cada 100 g crudos**, 250 en el arroz que
absorbe agua y 75 en la pechuga que la suelta. Con las dos, el diario muestra el
selector *Crudo / Cocido* y acepta el peso que de verdad tocó la balanza.

**La conversión se hace en la app, antes de insertar.** `quantity_g` es siempre
la forma base, así que las vistas, las recetas, las estadísticas y la
exportación siguen valiendo sin cambiar una línea. Lo único que se guarda aparte
es `logged_state`, la memoria de lo que dijo la balanza: sin ella, quien anotó
200 g de arroz cocido vería 80 g en su diario y no reconocería su renglón.

Las tres columnas son opcionales. Un empacado que no se cocina las deja en null
y se comporta como antes; un producto con forma pero sin rendimiento solo se
puede pesar en su forma, que es lo mismo que pasaba antes de esta migración.

**Papa y batata estaban cargadas dos veces**, una fila en crudo y otra en
cocido, porque antes era la única manera de poder pesarlas en las dos formas.
`unify_raw_cooked_foods` las fundió. El rendimiento no se inventó: al cocinar se
mueve agua y no energía, así que sale de las propias filas —
`gramos_cocidos / gramos_crudos = kcal_crudo / kcal_cocido`— y por eso los
registros que se mudaron conservan sus calorías exactas.

Sobrevive la fila que refleja cómo se pesa el alimento en esta cocina: la papa
**cocida** (cinco de sus seis registros se pesaron así) y la batata **cruda**
(sin registros, y el plan la pesa en crudo). En la papa las dos filas no eran el
mismo trozo de comida —la cruda era «con piel»— así que la proteína y la fibra
de lo que se pese crudo quedan ~30 % bajas contra la fila vieja; las calorías,
los carbohidratos y la grasa coinciden.

El peso de una unidad (`unit_weight_g`), la porción y el contenido del envase
están **en la forma base**. Por eso el selector de forma solo aparece mientras
se escribe en gramos: contar huevos ya es pesar en la forma en la que está
cargado el huevo.

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

| Archivo | Fase |
|---|---|
| `ajuste1_2026-08-03.sql` | AJUSTE 1 · RPE 7/10 · RIR 3 · super series · 4 días |
| `carga_ds_rir2_2026-09-07.sql` | CARGA (DS \| RIR 2) · RIR 2 · drop sets · 5 días · 5 semanas |

### Renombrar en vez de insertar

Cuando el entrenador rebautiza un movimiento que ya se venía haciendo
(«Flexión de rodilla» → «Leg curl», «Vuelos laterales» → «Elevaciones
laterales»), el seed **renombra la fila existente** antes del upsert del
catálogo, y no deja que el nombre nuevo entre como fila aparte.

No es cosmético: de ese id cuelgan los `workout_logs`, que son los que alimentan
la carga sugerida (`previous_sets` + `buildSuggestion`) y el récord por
ejercicio. Si el nombre nuevo entrara como fila nueva, el mismo movimiento
arrancaría con historial vacío y la app dejaría de sugerir carga justo cuando
más sirve. El rename va **antes** del upsert: al revés, la fila nueva ya
existiría y el rename chocaría contra el unique.

Solo aplica cuando es el mismo movimiento. Si cambió de verdad —«Extensión de
columna a 15°» pasó a «en banco a 45°», que es otro banco— igual conviene
renombrar (el ejercicio ocupa el mismo lugar en la rutina), pero hay que
**actualizar también el `dataset_id`** en `scripts/ejercicios-dataset.mjs`,
porque la ilustración sí es otra.

### Drop sets y repeticiones que no son un número

`routines` prescribe el ejercicio, no cada serie por separado, así que el
«Drop» que el PDF marca en la última fila de la tabla de series va en `notes`
(«Última serie en drop set»), que la app ya pinta debajo de los chips. Modelar
la serie como fila para un dato que hoy siempre dice lo mismo —la última— sería
pagar una tabla por un texto.

`target_reps` es **texto** justamente para que convivan `'11'`, `'22'`,
`'11/lado'` y `'fm'` (fallo muscular). `parseTargetReps` saca el primer número,
así que `'fm'` deja la sugerencia de carga en null: en una serie al fallo no hay
repetición objetivo que cumplir, y eso es lo correcto, no un hueco.

Antes no era así —el seed borraba las tres tablas— y cada fase nueva estrenaba
un historial vacío, que es justo lo que hace falta para saber si la fase
anterior sirvió. La migración `exercises_never_deleted` cerró esa puerta desde
la base: las FK son ON DELETE RESTRICT, así que un seed que intente borrar el
catálogo ahora falla en vez de vaciar el historial en silencio.

### Cuando llegue una fase nueva (AJUSTE 2, 3…)

1. Copiá el seed de la fase vigente (hoy `carga_ds_rir2_2026-09-07.sql`) a un
   archivo nuevo con la fecha de la fase.
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
