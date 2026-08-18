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

## `seed/`

Un archivo por fase del entrenador. Cada uno **borra todo lo del usuario y
vuelve a sembrar el plan completo**, así que es idempotente pero destructivo:
se lleva por delante el historial de `workout_logs`.

### Cuando llegue una fase nueva (AJUSTE 2, 3…)

1. Exportá primero el histórico desde la app: **Ajustes → Exportar datos → Todo**.
   El seed borra los `workout_logs`, y ese CSV es la única copia.
2. Copiá `ajuste1_2026-08-03.sql` a un archivo nuevo con la fecha de la fase.
3. Actualizá el catálogo de ejercicios, las filas de rutina, `cardio_plan`
   y la fila de `training_phases` (`name`, `started_on`, `rpe_target`,
   `rir_target`, `method`, `warmup`).
4. Ajustá los `count` del bloque de verificación al final: aborta la
   transacción si el número de filas insertadas no es el esperado.
5. Aplicalo con el MCP de Supabase (`execute_sql`) o desde el SQL Editor.

El `user_id` va como literal en el seed. Para otro usuario, resolvelo con
`select id from auth.users where email = '…'`.
