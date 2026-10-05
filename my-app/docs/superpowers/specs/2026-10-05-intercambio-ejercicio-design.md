# Intercambiar un ejercicio por un equivalente, en caliente

Fecha: 2026-10-05 · Rama: `feats-plan-ciro`

---

## El problema

Llegás a la prensa y está ocupada. Hacés hack squat, que trabaja lo mismo, pero
la app no tiene cómo registrarlo: la pantalla del día solo muestra lo que dice
`routines` para ese día de la semana, y las series se emparejan con la rutina por
`exercise_id`
([actions.ts:213](../../../app/gym/ejercicio/_lib/actions.ts)). Las opciones
hoy son registrar el hack squat como si fuera prensa, lo que ensucia el historial
de los dos, o ir a Rutinas, cambiar el ejercicio y acordarse de volverlo a poner
la semana siguiente.

Registrar el sustituto con su propio `exercise_id` sin guardar nada más tampoco
alcanza. El loader no lo encuentra en `routines`, y la tarjeta vuelve a mostrar
la prensa en el próximo `useFocusEffect`, que puede pasar antes de la primera
serie mientras caminás a la otra máquina.

## La decisión

Un intercambio es **una fila por casillero de rutina y por fecha**: «el lunes 5,
el casillero de Prensa se hizo con Hack Squat». Vive en una tabla nueva,
`workout_swaps`, y se aplica al cargar el día.

- **Solo ese día.** La rutina no se toca. El lunes siguiente vuelve a aparecer
  la prensa. Cambiar la rutina para siempre ya se hace en Rutinas.
- **Solo antes de empezar.** Se puede cambiar mientras el casillero no tenga
  series guardadas ese día, y volver al original mientras el sustituto no tenga
  series guardadas. No hay cambios a mitad de ejercicio: cada ejercicio queda con
  su historial limpio y no hace falta guardar desde qué serie se cambió.
- **La prescripción es del casillero, no del ejercicio.** Series, reps
  objetivo, descanso, cadencia, súper serie y notas se mantienen. El sustituto
  ocupa el mismo lugar del entrenamiento.
- **Las series van con el `exercise_id` del sustituto.** El hack squat arma su
  propio historial, sus PRs y su referencia de «la vez anterior». La prensa no
  recibe nada ese día, porque no se hizo.
- **Los candidatos salen del catálogo.** Primero los del mismo `muscle_group`,
  después cualquier otro con el buscador, y además se puede crear un ejercicio
  nuevo ahí mismo. No hay alternativas curadas por ejercicio.

Lo que se descartó:

- **Columna `workout_logs.replaces_exercise_id`.** El cambio recién existiría
  al guardar la primera serie, así que antes de eso se pierde con cualquier
  recarga.
- **Solo AsyncStorage.** Queda en el teléfono, el export no lo ve y se pierde
  al reinstalar.

## Esquema

```sql
create table public.workout_swaps (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  routine_id   uuid not null references public.routines(id) on delete cascade,
  workout_date date not null,
  exercise_id  uuid not null references public.exercises(id) on delete restrict,
  created_at   timestamptz not null default now(),

  -- Un casillero tiene un solo sustituto por día. Cambiarlo otra vez pisa la
  -- fila, no agrega otra.
  constraint workout_swaps_slot_unique unique (user_id, routine_id, workout_date),
  -- Dos casilleros no pueden usar el mismo ejercicio el mismo día: sus series
  -- chocarían en el índice único (user_id, exercise_id, workout_date, set_number)
  -- de workout_logs y la serie 1 de uno pisaría la del otro.
  constraint workout_swaps_exercise_unique unique (user_id, workout_date, exercise_id)
);
```

- RLS `for all to authenticated` con `(select auth.uid()) = user_id`, y
  `revoke all ... from anon`, igual que `body_weight_logs`.
- `on delete cascade` hacia `routines`: si se borra el casillero, el intercambio
  pierde su sentido. Las series no se pierden porque cuelgan del ejercicio, no
  del casillero.
- `on delete restrict` hacia `exercises` por consistencia con `workout_logs`,
  aunque el catálogo nunca se borra.
- Alcanza con los índices de los dos `unique`: la consulta del loader es «los
  swaps de este usuario en esta fecha», y `workout_swaps_exercise_unique` la
  cubre por prefijo.

### RPCs

Las dos son `security invoker`, con `set search_path = ''` y todo calificado por
esquema, como `swap_routine_order`.

**`swap_routine_exercise(p_routine_id uuid, p_date date, p_exercise_id uuid)`**
hace un upsert del intercambio. Rechaza con un mensaje en castellano cuando:

1. el casillero no existe o no es del usuario (la RLS ya lo oculta: «Rutina no
   encontrada»);
2. `extract(dow from p_date)` no coincide con el `day_of_week` del casillero;
3. el ejercicio que el casillero muestra hoy, que es el sustituto si ya hay
   swap o si no el de la rutina, tiene series guardadas en `p_date`;
4. `p_exercise_id` ya está en la rutina de ese día de la semana, en cualquier
   casillero, incluido el mismo. Esto cubre también «cambiar la prensa por la
   prensa»;
5. `p_exercise_id` ya es sustituto en otro casillero esa fecha. El `unique`
   también lo frena, pero la RPC lo dice con palabras.

La regla 4 hace que deshacer sea siempre seguro: el original de un casillero
nunca puede estar ocupado como sustituto en otro.

**`undo_routine_swap(p_routine_id uuid, p_date date)`** borra la fila. Rechaza
si el sustituto tiene series guardadas en `p_date`. Si no hay fila, no hace nada
y no da error.

Las dos reglas viven en la base y no solo en la UI porque la app se puede abrir
en dos teléfonos, y porque las fechas pasadas también se pueden navegar.

## Cambios en la app

### Tipos (`types/database.ts`, `app/gym/ejercicio/_lib/types.ts`)

- `WorkoutSwap` con las columnas de la tabla.
- `ExerciseWithSets` agrega
  `swappedFrom?: { exercise_id: string; name: string }`. Es el original del
  casillero, para el «en lugar de Prensa» y el «Volver a Prensa».

### Lógica pura (`app/gym/ejercicio/_lib/swaps.ts` + `swaps.test.ts`)

- **`applySwaps(routines, swaps, exercisesById)`** devuelve cada casillero con
  `exercise_id` y `exercises` reemplazados por el sustituto y `swappedFrom`
  completo. Los casilleros sin swap salen tal cual. Un swap cuyo ejercicio no
  esté en `exercisesById` se ignora: es mejor mostrar el original que una
  tarjeta rota.
- **`swapCandidates(catalog, original, excludedIds, query)`** devuelve
  `{ sameGroup, others }`.
  - Sin texto de búsqueda: `sameGroup` trae los del mismo grupo y `others` sale
    vacío.
  - Con texto: las dos listas se filtran por nombre o grupo.
  - Compara con `normalize` de
    [analysis.ts](../../../app/gym/estadisticas/_lib/analysis.ts) (sin acentos
    ni mayúsculas). Así, el `'cardio'` en minúscula que hay hoy en la base cae
    en el mismo grupo que `'Cardio'`.
  - Ordena por nombre y deja afuera `excludedIds`.
  - `excludedIds` es la unión de los ejercicios de la rutina de ese día y los
    sustitutos activos en otros casilleros, lo mismo que exigen las reglas 4 y
    5 de la RPC.

Si `normalize` termina usándose desde dos features, se mueve a `lib/`.

### Loader (`fetchDayWorkout`)

- Suma `workout_swaps` de la fecha y el catálogo (`exercises.select('*')`) al
  `Promise.all`, y aplica `applySwaps` antes de armar `sets_data`.
- `exerciseIds`, que alimenta `previous_sets`, sale de los casilleros **ya
  intercambiados**. Así el sustituto trae su «anterior» y su sugerencia de
  carga, y la unidad kg/lb también es la suya. El resto del armado no cambia
  porque ya está todo indexado por `exercise_id`.
- El catálogo completo se devuelve en `DayWorkout.catalog` para que el modal no
  tenga que pedirlo de nuevo. Son unas 43 filas.

### Acciones (`app/gym/ejercicio/_lib/actions.ts`)

- `swapExercise(routineId, dateStr, exerciseId)` y
  `undoSwap(routineId, dateStr)` envuelven las RPCs con el mismo
  `{ success, error }` que el resto.
- `createExercise` en
  [configuracion/_lib/actions.ts](../../../app/gym/configuracion/_lib/actions.ts)
  pasa a devolver además el `id` creado (`.select('id').single()`). Rutinas lo
  ignora y el modal lo usa para dejarlo elegido.

### UI

- **`ExerciseCard`.**
  - Agrega un botón «Cambiar» junto a los chips de prescripción. Solo aparece
    mientras ninguna serie del casillero esté guardada.
  - Si el casillero está intercambiado, debajo del grupo muscular se lee «en
    lugar de Prensa». Mientras el sustituto no tenga series, se ofrece «Volver a
    Prensa».
- **`SwapExerciseModal`** (`app/gym/ejercicio/_components/swap-exercise-modal.tsx`).
  - Es un modal de pantalla completa, y se monta solo mientras está abierto,
    igual que `ExerciseGuideModal`.
  - El título es «Cambiar Prensa». Abajo va el buscador, la lista
    «Mismo grupo · Cuádriceps» y, al escribir, «Otros».
  - Al final está `ExerciseForm` para crear un ejercicio, con el grupo del
    original ya cargado. Para eso `ExerciseForm` gana una prop opcional
    `initialMuscle`.
  - Tocar un ejercicio llama a `swapExercise`, cierra el modal y recarga el día.
    Si falla, el error se muestra dentro del modal y no se cierra.
  - Crear un ejercicio llama a `createExercise` y después a `swapExercise` con
    el id nuevo. Si el nombre ya existe, se muestra el error de duplicado que ya
    tiene `createExercise`, y lo que corresponde es buscarlo en la lista.
  - Con el grupo vacío y sin búsqueda se muestra «No hay otros ejercicios de
    Cuádriceps. Buscá o creá uno».
- **El sustituto se pinta según su propio `tracking_mode`.** Si la prensa
  (`carga`) se cambia por sentadilla búlgara a peso corporal (`reps`), la
  tarjeta pide reps y no kilos. Las reps objetivo del casillero siguen valiendo.

### Estadísticas

No cambian.

- `exercise_stats`, `records` y `previous_sets` ya están por `exercise_id`, y el
  sustituto arma su propia historia.
- `by_muscle` agrupa por el texto de `muscle_group`, así que un sustituto del
  mismo grupo mantiene el balance.
- **Efecto conocido.** Un ejercicio de la rutina que se reemplaza seguido
  aparece en «sin registrar» (`stale`). Es correcto, porque no se está haciendo.

### Export (`export_training_data`)

Hoy le saca la prescripción a la rutina con
`left join routines r on r.exercise_id = l.exercise_id and r.day_of_week = ...`.
Las series de un sustituto quedan con `reps_objetivo`, `descanso_prescrito_s`,
`cadencia` y `super_serie` en null.

- El join pasa por `workout_swaps`. Si la serie es de un sustituto ese día, la
  prescripción sale del casillero (`r.id = ws.routine_id`). Si no, sigue
  saliendo por `exercise_id` como hasta ahora.
- Se agrega al final la columna **`en_lugar_de text`**, con el nombre del
  original o null. El skill `analisis-progreso` puede así distinguir «hizo hack
  squat» de «hizo hack squat porque la prensa estaba ocupada».
- Como cambia la firma, va `drop function` + `create`. Después hay que
  **volver a aplicar los grants y revokes** que tenga la función viva.
- **Partir de la definición viva** (`pg_get_functiondef`), no del archivo local.
  La base tiene migraciones sin archivo en el repo
  (`exercise_stats_serie_representativa`, `harden_anon_access_and_rpc`, …).
- Nada en la app llama a esta RPC; la usa solo el skill. Hay que agregar una
  línea en `.claude/skills/analisis-progreso/SKILL.md` sobre `workout_swaps` y
  la columna nueva.

### Documentación

- Una fila nueva en la tabla de migraciones de `supabase/README.md`.

## Verificación

**Base**, por SQL vía MCP, antes y después de aplicar la migración:

- La tabla, los constraints, la RLS y el revoke a `anon` existen.
- Las cinco reglas de `swap_routine_exercise` y la de `undo_routine_swap`
  rechazan lo que deben y aceptan el caso feliz.
  - Se prueban en una transacción con
    `set local role authenticated; set local request.jwt.claims = '{"sub":"<uid>"}'`
    y `rollback` al final, para no dejar datos de prueba.
- `export_training_data` devuelve las mismas filas que antes para un rango
  sin intercambios (comparar conteos y una muestra). Para un swap de prueba
  dentro de la transacción, `en_lugar_de` y la prescripción salen completos.

**App:**

- `npx tsc --noEmit && npx expo lint && npm test`.
- `swaps.test.ts` cubre:
  - `applySwaps`: sin swaps, con swap, con un swap que apunta a un ejercicio
    desconocido, y que la prescripción y la súper serie se mantengan;
  - `swapCandidates`: mismo grupo con acentos y mayúsculas distintos,
    exclusiones, búsqueda que trae otros grupos y grupo vacío.

**A mano, en el Android:**

1. Cambiar un ejercicio y recargar antes de guardar series. Tiene que seguir el
   sustituto.
2. Guardar una serie. «Cambiar» y «Volver» desaparecen.
3. Mirar Estadísticas: el sustituto tiene su sesión y el original no.
4. Crear un ejercicio desde el modal. Queda elegido.
5. Cambiar un ejercicio que está dentro de una súper serie. El descanso y el
   «siguiente» siguen funcionando.
6. Abrir el día siguiente de la misma semana. Muestra la rutina sin cambios.

## Fuera de alcance

- Cambiar a mitad de un ejercicio (series 1 en el original, 2 y 3 en el
  sustituto).
- Alternativas curadas por ejercicio, como el «Alternativa: Pec Deck» de las
  notas del entrenador.
- Reemplazar el ejercicio en la rutina para siempre desde la pantalla del día.
- Usar el `dataset_id` o la taxonomía del dataset externo (equipamiento,
  músculo objetivo) para afinar los candidatos.
- Mostrar en Estadísticas cuántas veces se reemplazó cada ejercicio. El dato
  queda en `workout_swaps` para cuando haga falta.
