# Cardio, objetivos en g/kg con ciclado, y fibra — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el cardio se registre como un ejercicio más de la rutina, que los objetivos de nutrición se escriban en g/kg con un segundo perfil para los días de ciclado de carbos, y que la fibra tenga la misma presencia visual que P/C/G.

**Architecture:** Tres pistas independientes. La de fibra es solo UI. La de cardio agrega `tracking_mode` a `exercises` y `duration_seconds` a `workout_logs`, hace `reps`/`weight` nullable, y migra cuatro RPCs que hoy suponen que esas dos columnas tienen valor. La de nutrición parte `nutrition_goals` en dos perfiles con los macros en g/kg, agrega `nutrition_days` para marcar el ciclado, y expone una vista que mantiene vivas las consultas de las skills.

**Tech Stack:** Expo SDK 54 · expo-router · React Native · TypeScript strict · Supabase (Postgres + RLS + RPCs `security invoker`)

**Spec:** [`docs/superpowers/specs/2026-09-21-cardio-ciclado-fibra-design.md`](../specs/2026-09-21-cardio-ciclado-fibra-design.md)

## Global Constraints

- **Español en todo lo que ve el usuario** y en los comentarios de código. El codebase comenta el *porqué*, no el *qué* — seguir ese tono.
- **Los enums de dominio van en español**: `'carga' | 'reps' | 'tiempo'`, `'normal' | 'ciclado'`. Mismo criterio que `'crudo' | 'cocido'` y `'desayuno' | 'almuerzo' | ...`.
- **Toda RPC nueva o modificada**: `security invoker` y `set search_path = ''`, con todo calificado por esquema. Sin excepción — es lo que hace que la RLS siga aplicando.
- **Datos que no se pueden perder**: 502 `workout_logs`, 401 `nutrition_logs`, 32 `body_weight_logs`, 43 `exercises`, 101 `food_products`.
- **`git commit` al final de cada tarea.** Rama `feats-plan-ciro`.
- **Verificación obligatoria antes de cerrar cualquier tarea**: `npx tsc --noEmit` sin errores.
- **Ninguna migración se aplica sin antes correr su consulta de verificación** y comparar contra el valor de referencia que el propio plan indica.
- Las migraciones van en `supabase/migrations/` con el formato `YYYYMMDDHHMMSS_nombre.sql` que ya usa el repo.

---

## Estructura de archivos

**Se crean:**

| Archivo | Responsabilidad |
|---|---|
| `lib/tracking-mode.ts` | Los tres modos de medición y la conversión minutos↔segundos. Único lugar donde vive esa aritmética |
| `lib/nutricion/objetivos.ts` | Qué campo es por kilo y cuál absoluto, y la resolución g/kg × peso → gramos |
| `lib/tracking-mode.test.ts` | Tests de la conversión |
| `lib/nutricion/objetivos.test.ts` | Tests de la resolución |
| `supabase/migrations/20260921100000_exercise_tracking_mode.sql` | Esquema de cardio |
| `supabase/migrations/20260921110000_stats_rpcs_tracking_mode.sql` | Las cuatro RPCs |
| `supabase/migrations/20260921120000_nutrition_goals_per_kg.sql` | Perfiles + g/kg + `nutrition_days` + vista + RPC |

**Se modifican:** `types/database.ts`, `lib/muscle-groups.ts`, `lib/nutricion/diario.ts`, `app/gym/configuracion/_components/exercise-form.tsx`, `app/gym/configuracion/_lib/actions.ts`, `app/gym/ejercicio/_lib/{types,actions}.ts`, `app/gym/ejercicio/_components/{set-row,exercise-card}.tsx`, `app/gym/estadisticas/_components/stat-card.tsx`, `app/nutricion/{index,objetivos}.tsx`, `app/nutricion/catalogo/index.tsx`, `app/nutricion/recetas/[id].tsx`, `app/nutricion/estadisticas/_lib/actions.ts`, `app/nutricion/estadisticas/_components/goal-meters.tsx`, `.claude/skills/analisis-progreso/consultas.sql`, `.claude/skills/reporte-nutricion/SKILL.md`, `package.json`.

**Orden:** Tarea 1 sola (fibra, sin dependencias). Tareas 2-8 son la pista de cardio en orden estricto. Tareas 9-15 son la de nutrición en orden estricto. Las dos pistas no se tocan entre sí.

---

## Task 1: La F de fibra en los cuatro renglones

Primera porque no tiene dependencias, no toca datos, y sirve para confirmar que el ciclo de verificación funciona antes de meterse con las migraciones.

**Files:**
- Modify: `app/nutricion/index.tsx:151`, `app/nutricion/index.tsx:172`
- Modify: `app/nutricion/catalogo/index.tsx:134`
- Modify: `app/nutricion/recetas/[id].tsx:251`

**Interfaces:**
- Consumes: `DayTotals` y `NutritionLogMacros`, que ya traen `fiber_g`. Nada nuevo.
- Produces: nada. Es una hoja del árbol.

- [ ] **Step 1: Encabezado de comida en el diario**

En `app/nutricion/index.tsx`, reemplazar la línea 151:

```tsx
                        ? `P ${Math.round(mealTotals.protein_g)}  C ${Math.round(mealTotals.carbs_g)}  G ${Math.round(mealTotals.fat_g)}  ·  `
```

por:

```tsx
                        ? `P ${Math.round(mealTotals.protein_g)}  C ${Math.round(mealTotals.carbs_g)}  G ${Math.round(mealTotals.fat_g)}  F ${Math.round(mealTotals.fiber_g)}  ·  `
```

- [ ] **Step 2: Renglón del diario**

En el mismo archivo, reemplazar la línea 172:

```tsx
                          {'  ·  P '}{e.protein_g ?? 0}{'  C '}{e.carbs_g ?? 0}{'  G '}{e.fat_g ?? 0}
```

por:

```tsx
                          {'  ·  P '}{e.protein_g ?? 0}{'  C '}{e.carbs_g ?? 0}{'  G '}{e.fat_g ?? 0}{'  F '}{e.fiber_g ?? 0}
```

- [ ] **Step 3: Tarjeta del catálogo**

En `app/nutricion/catalogo/index.tsx`, reemplazar la línea 134:

```tsx
                    {p.energy_kcal ?? '—'} kcal · P {p.protein_g ?? '—'} · C {p.carbs_g ?? '—'} · G {p.fat_g ?? '—'}
```

por:

```tsx
                    {p.energy_kcal ?? '—'} kcal · P {p.protein_g ?? '—'} · C {p.carbs_g ?? '—'} · G {p.fat_g ?? '—'} · F {p.fiber_g ?? '—'}
```

- [ ] **Step 4: Total del preparado en la receta**

En `app/nutricion/recetas/[id].tsx`, reemplazar el bloque de la línea 250-252:

```tsx
                  {nutrition.energy_kcal ?? '—'} kcal · P {nutrition.protein_g ?? '—'} g ·
                  C {nutrition.carbs_g ?? '—'} g · G {nutrition.fat_g ?? '—'} g
```

por:

```tsx
                  {nutrition.energy_kcal ?? '—'} kcal · P {nutrition.protein_g ?? '—'} g ·
                  C {nutrition.carbs_g ?? '—'} g · G {nutrition.fat_g ?? '—'} g ·
                  F {nutrition.fiber_g ?? '—'} g
```

- [ ] **Step 5: Verificar**

```bash
npx tsc --noEmit && npx expo lint
```

Esperado: sin errores. `fiber_g` ya existe en `FoodProduct`, `NutritionLogMacros`, `RecipeNutrition` y `DayTotals`, así que si TypeScript se queja es que se tipeó mal un nombre de campo.

- [ ] **Step 6: Commit**

```bash
git add app/nutricion/index.tsx app/nutricion/catalogo/index.tsx "app/nutricion/recetas/[id].tsx"
git commit -m "feat(nutricion): mostrar fibra junto a P/C/G en diario, catálogo y recetas

La F tenía el dato completo en la base y en las barras de objetivo, pero
faltaba en los renglones donde se leen los tres macros de un vistazo."
```

---

## Task 2: Esquema de cardio

**Files:**
- Create: `supabase/migrations/20260921100000_exercise_tracking_mode.sql`
- Modify: `types/database.ts`

**Interfaces:**
- Produces: `exercises.tracking_mode` (`'carga'|'reps'|'tiempo'`, default `'carga'`), `workout_logs.duration_seconds` (`integer null`), y `workout_logs.reps`/`.weight` nullable. El tipo `Exercise` gana `tracking_mode: TrackingMode`; `WorkoutLog` gana `duration_seconds: number | null` y sus `reps`/`weight` pasan a `number | null`.

- [ ] **Step 1: Tomar la foto del antes**

Correr contra la base y **anotar los cuatro números** en el mensaje del commit:

```sql
select count(*) as filas,
       count(reps) as con_reps,
       count(weight) as con_peso,
       coalesce(sum(weight * reps), 0) as volumen_total
  from public.workout_logs;
```

Referencia esperada: `filas = 502`, `con_reps = 502`, `con_peso = 502`. El volumen es el número que **no se puede mover** en la tarea 6.

- [ ] **Step 2: Escribir la migración**

```sql
-- =============================================================================
--  Cardio como ejercicio de la rutina
--
--  Hasta acá el cardio era una tarjeta aparte (`cardio_plan` / `cardio_logs`):
--  UN bloque de minutos por fecha, sin nombre propio y fuera de la rutina. Eso
--  se queda como está — es el LISS que prescribe el entrenador.
--
--  Lo que se abre acá es poder crear ejercicios de cardio con nombre
--  («caminadora inclinada»), meterlos en el plan de un día y registrarlos serie
--  por serie como cualquier otro. No entraban porque `reps` y `weight` eran
--  not null y una serie de 45 minutos no tiene ni repeticiones ni kilos.
-- =============================================================================

-- La CATEGORÍA no necesita columna: `muscle_group` ya es texto libre sin
-- constraint, así que 'Cardio' entra como un valor más. Lo que sí hace falta es
-- cómo se MIDE el ejercicio, y va acá y no en `routines` porque una caminadora
-- se mide en minutos el lunes y el miércoles también: es del movimiento, no de
-- la prescripción.
--
-- Es ortogonal a la categoría a propósito: una plancha es Core y es de tiempo.
alter table public.exercises
  add column tracking_mode text not null default 'carga';

alter table public.exercises
  add constraint exercises_tracking_mode_check
  check (tracking_mode in ('carga', 'reps', 'tiempo'));

comment on column public.exercises.tracking_mode is
  'Cómo se mide: carga (reps × peso), reps (solo repeticiones) o tiempo (segundos).';

-- Tope de 10 h. No es un límite de entrenamiento sino un filtro de tecleo,
-- mismo criterio que MAX_REPS y MAX_WEIGHT_KG en el cliente.
alter table public.workout_logs
  add column duration_seconds integer;

alter table public.workout_logs
  add constraint workout_logs_duration_check
  check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 36000));

comment on column public.workout_logs.duration_seconds is
  'Duración de la serie. Solo en ejercicios con tracking_mode = tiempo.';

-- Nullable y NO cero: 0 kg ya es un valor real en el historial (los ejercicios
-- a peso corporal se registran así), de modo que un cero de «no aplica» sería
-- indistinguible de uno de «sin carga externa» y contaminaría cualquier
-- promedio. Las 502 filas existentes conservan su valor.
alter table public.workout_logs alter column reps   drop not null;
alter table public.workout_logs alter column weight drop not null;
```

- [ ] **Step 3: Aplicar y verificar que no se movió nada**

Aplicar la migración, después correr la misma consulta del paso 1. Los cuatro números tienen que ser **idénticos**: `alter ... drop not null` no toca los datos y la columna nueva nace en null.

Además, confirmar que los 43 ejercicios quedaron en `'carga'`:

```sql
select tracking_mode, count(*) from public.exercises group by 1;
```

Esperado: una sola fila, `carga | 43`.

- [ ] **Step 4: Actualizar los tipos**

En `types/database.ts`, agregar antes del tipo `Exercise`:

```ts
/**
 * Cómo se mide un ejercicio. Es ortogonal al grupo muscular: una plancha es
 * Core y se mide en tiempo, una caminadora es Cardio y también.
 */
export type TrackingMode = 'carga' | 'reps' | 'tiempo';
```

Dentro de `Exercise`, después de `muscle_group`:

```ts
  /** Qué campos pide la serie: reps+peso, solo reps, o minutos. */
  tracking_mode: TrackingMode;
```

En `WorkoutLog`, reemplazar:

```ts
  set_number: number;
  reps: number;
  weight: number;
```

por:

```ts
  set_number: number;
  /** null en los ejercicios de tiempo. */
  reps: number | null;
  /** null en los de tiempo y en los de solo reps. NO se usa 0: 0 kg es un peso real. */
  weight: number | null;
  /** Segundos de la serie. Solo en tracking_mode = 'tiempo'. */
  duration_seconds: number | null;
```

- [ ] **Step 5: Verificar**

```bash
npx tsc --noEmit
```

Esperado: **errores**, y son la parte útil de este paso. TypeScript va a marcar cada lugar que asume `reps`/`weight` no-nulos. Anotar la lista — son exactamente los sitios que tocan las tareas 5 y 8. Si el error aparece en un archivo que no está en la lista de "Se modifican" de este plan, pararse y avisar antes de seguir.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260921100000_exercise_tracking_mode.sql types/database.ts
git commit -m "feat(gym): tracking_mode en exercises y duration_seconds en workout_logs

reps y weight pasan a nullable para que quepa una serie de tiempo. Nullable
y no cero porque 0 kg ya significa algo: los ejercicios a peso corporal se
registran así.

Verificado sobre las 502 filas existentes: filas, con_reps, con_peso y
volumen total idénticos antes y después."
```

---

## Task 3: `lib/tracking-mode.ts` con tests

Acá se monta el arnés de tests, porque esta es la primera aritmética que puede corromper datos en silencio.

**Files:**
- Create: `lib/tracking-mode.ts`, `lib/tracking-mode.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `TrackingMode` de `types/database.ts` (Tarea 2).
- Produces:
  - `TRACKING_MODES: readonly TrackingMode[]`
  - `TRACKING_LABELS: Record<TrackingMode, string>`
  - `TRACKING_HINTS: Record<TrackingMode, string>`
  - `MAX_DURATION_SECONDS: 36000`
  - `parseMinutes(value: string): number | null` — minutos escritos → segundos
  - `formatMinutes(seconds: number): string` — segundos → minutos para el input
  - `labelDuration(seconds: number): string` — `'45 min'`
  - `usesWeight(mode)`, `usesReps(mode)`, `usesDuration(mode)`

- [ ] **Step 1: Instalar el arnés**

```bash
npx expo install --dev jest-expo jest @types/jest
```

En `package.json`, agregar a `scripts`:

```json
    "test": "jest"
```

y al final del objeto raíz:

```json
  "jest": {
    "preset": "jest-expo",
    "testMatch": ["**/*.test.ts", "**/*.test.tsx"]
  }
```

- [ ] **Step 2: Escribir los tests que fallan**

Crear `lib/tracking-mode.test.ts`:

```ts
import {
  formatMinutes,
  labelDuration,
  MAX_DURATION_SECONDS,
  parseMinutes,
  usesDuration,
  usesReps,
  usesWeight,
} from './tracking-mode';

describe('parseMinutes', () => {
  it('lee minutos enteros', () => {
    expect(parseMinutes('45')).toBe(2700);
  });

  it('acepta coma decimal, que es como se escribe en el teclado de acá', () => {
    expect(parseMinutes('12,5')).toBe(750);
  });

  it('acepta punto decimal', () => {
    expect(parseMinutes('12.5')).toBe(750);
  });

  it('redondea al segundo: 0,7 min son 42 s, no 42,000000001', () => {
    expect(parseMinutes('0,7')).toBe(42);
  });

  it('rechaza el vacío, la basura y el cero', () => {
    expect(parseMinutes('')).toBeNull();
    expect(parseMinutes('  ')).toBeNull();
    expect(parseMinutes('abc')).toBeNull();
    expect(parseMinutes('0')).toBeNull();
    expect(parseMinutes('-5')).toBeNull();
  });

  it('rechaza lo que pasa del tope de tecleo', () => {
    expect(parseMinutes('600')).toBe(MAX_DURATION_SECONDS);
    expect(parseMinutes('601')).toBeNull();
  });
});

describe('formatMinutes', () => {
  it('vuelve al mismo número que se escribió', () => {
    expect(formatMinutes(2700)).toBe('45');
  });

  it('muestra un decimal solo cuando hace falta', () => {
    expect(formatMinutes(750)).toBe('12.5');
    expect(formatMinutes(600)).toBe('10');
  });

  it('ida y vuelta sin pérdida en los valores que se tipean', () => {
    for (const written of ['45', '10', '12.5', '1']) {
      expect(formatMinutes(parseMinutes(written) as number)).toBe(written);
    }
  });
});

describe('labelDuration', () => {
  it('dice la unidad, que es lo que se lee en la tarjeta', () => {
    expect(labelDuration(2700)).toBe('45 min');
    expect(labelDuration(750)).toBe('12.5 min');
  });
});

describe('qué campos pide cada modo', () => {
  it('carga pide reps y peso', () => {
    expect(usesReps('carga')).toBe(true);
    expect(usesWeight('carga')).toBe(true);
    expect(usesDuration('carga')).toBe(false);
  });

  it('reps pide solo repeticiones', () => {
    expect(usesReps('reps')).toBe(true);
    expect(usesWeight('reps')).toBe(false);
    expect(usesDuration('reps')).toBe(false);
  });

  it('tiempo pide solo minutos', () => {
    expect(usesReps('tiempo')).toBe(false);
    expect(usesWeight('tiempo')).toBe(false);
    expect(usesDuration('tiempo')).toBe(true);
  });
});
```

- [ ] **Step 3: Correr y ver fallar**

```bash
npm test -- lib/tracking-mode.test.ts
```

Esperado: FAIL — `Cannot find module './tracking-mode'`.

- [ ] **Step 4: Escribir el módulo**

Crear `lib/tracking-mode.ts`:

```ts
import type { TrackingMode } from '@/types/database';

/**
 * Cómo se mide un ejercicio, y la aritmética de minutos ↔ segundos.
 *
 * La base guarda SEGUNDOS y el usuario escribe MINUTOS. La conversión vive
 * únicamente acá: tenerla repetida en la pantalla del día y en estadísticas es
 * cómo se termina con «45 min» en un lado y «44,9 min» en el otro.
 */

export const TRACKING_MODES = ['carga', 'reps', 'tiempo'] as const;

/** En el selector del formulario, que es angosto. */
export const TRACKING_LABELS: Record<TrackingMode, string> = {
  carga: 'Carga',
  reps: 'Reps',
  tiempo: 'Tiempo',
};

/** Debajo del selector: qué va a pedir la serie. */
export const TRACKING_HINTS: Record<TrackingMode, string> = {
  carga: 'Repeticiones y peso, como el press banca.',
  reps: 'Solo repeticiones, sin carga externa.',
  tiempo: 'Minutos, como la caminadora o una plancha.',
};

/**
 * Diez horas. Igual que `MAX_REPS` y `MAX_WEIGHT_KG`, no es un límite de
 * entrenamiento sino un filtro de tecleo: atrapa el dígito de más.
 */
export const MAX_DURATION_SECONDS = 36000;

export const usesReps = (mode: TrackingMode) => mode === 'carga' || mode === 'reps';
export const usesWeight = (mode: TrackingMode) => mode === 'carga';
export const usesDuration = (mode: TrackingMode) => mode === 'tiempo';

/**
 * Los minutos escritos, en segundos. `null` si lo escrito no es una duración.
 * Acepta coma decimal: es lo que ofrece el teclado numérico en español.
 */
export function parseMinutes(value: string): number | null {
  const clean = value.trim().replace(',', '.');
  if (clean === '') return null;

  const minutes = Number(clean);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;

  const seconds = Math.round(minutes * 60);
  return seconds > MAX_DURATION_SECONDS ? null : seconds;
}

/**
 * Los segundos guardados, como se escriben en el input. Un decimal como mucho:
 * la diferencia entre 12,5 y 12,51 minutos no existe para quien la teclea.
 */
export function formatMinutes(seconds: number): string {
  const minutes = Math.round((seconds / 60) * 10) / 10;
  return String(minutes);
}

/** '45 min' — para leer, no para editar. */
export function labelDuration(seconds: number): string {
  return `${formatMinutes(seconds)} min`;
}
```

- [ ] **Step 5: Correr y ver pasar**

```bash
npm test -- lib/tracking-mode.test.ts
```

Esperado: PASS, los 14 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/tracking-mode.ts lib/tracking-mode.test.ts
git commit -m "feat(gym): modos de medición y conversión minutos↔segundos

Monta jest-expo, que el proyecto no tenía. La conversión va con tests
porque la base guarda segundos y el usuario escribe minutos: un redondeo
mal puesto acá se ve como un dato que no cuadra consigo mismo entre dos
pantallas."
```

---

## Task 4: La categoría Cardio en el catálogo de ejercicios

**Files:**
- Modify: `lib/muscle-groups.ts`
- Modify: `app/gym/configuracion/_components/exercise-form.tsx`
- Modify: `app/gym/configuracion/_lib/actions.ts`

**Interfaces:**
- Consumes: `TRACKING_MODES`, `TRACKING_LABELS`, `TRACKING_HINTS` (Tarea 3); `TrackingMode` (Tarea 2).
- Produces:
  - `CARDIO_GROUP = 'Cardio'` y `EXERCISE_CATEGORIES: readonly string[]` en `lib/muscle-groups.ts`
  - `createExercise(name: string, muscleGroup: string, trackingMode: TrackingMode)` — **la firma gana un tercer parámetro obligatorio**
  - `ExerciseForm`'s `onSubmit: (name: string, muscleGroup: string, mode: TrackingMode) => void`

- [ ] **Step 1: Partir la lista de grupos**

En `lib/muscle-groups.ts`, después del `export type MuscleGroup`, agregar:

```ts
/**
 * El cardio no es un músculo, pero comparte columna con los que sí lo son:
 * `exercises.muscle_group` es texto libre y agregar una tabla de categorías
 * para un solo valor sería peor que este acuerdo.
 *
 * Que esté aparte de MUSCLE_GROUPS es lo que impide que la caminadora aparezca
 * como un grupo en «Balance por grupo» con récord de 0 kg. El corte en las
 * estadísticas se hace por este valor.
 */
export const CARDIO_GROUP = 'Cardio';

/** Lo que ofrece el desplegable: los músculos, más cardio al final. */
export const EXERCISE_CATEGORIES = [...MUSCLE_GROUPS, CARDIO_GROUP] as const;
```

- [ ] **Step 2: El formulario ofrece la categoría y el modo**

En `app/gym/configuracion/_components/exercise-form.tsx`:

Cambiar los imports:

```tsx
import { EXERCISE_CATEGORIES, CARDIO_GROUP } from '@/lib/muscle-groups';
import { TRACKING_HINTS, TRACKING_LABELS, TRACKING_MODES } from '@/lib/tracking-mode';
import type { TrackingMode } from '@/types/database';
```

Cambiar el tipo del prop:

```tsx
  onSubmit: (name: string, muscleGroup: string, mode: TrackingMode) => void;
```

Agregar el estado del modo junto a los que ya hay:

```tsx
  const [mode, setMode] = useState<TrackingMode>('carga');
```

Reemplazar el `useMemo` de `filtered` para que filtre sobre la lista nueva:

```tsx
  const filtered = useMemo(() => {
    if (!muscle.trim()) return EXERCISE_CATEGORIES;
    const q = muscle.toLowerCase();
    return EXERCISE_CATEGORIES.filter((g) => g.toLowerCase().includes(q));
  }, [muscle]);
```

Reemplazar `handleSelectMuscle` — elegir Cardio preselecciona tiempo, que es lo que uno va a querer nueve de cada diez veces, pero se puede cambiar:

```tsx
  const handleSelectMuscle = (group: string) => {
    setMuscle(group);
    setDropdownOpen(false);
    if (group === CARDIO_GROUP) setMode('tiempo');
  };
```

Reemplazar `handleSubmit`:

```tsx
  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name, muscle, mode);
    setName('');
    setMuscle('');
    setMode('carga');
    setDropdownOpen(false);
  };
```

Insertar el selector entre el `</View>` que cierra el desplegable y el `<View style={s.buttons}>`:

```tsx
      <Text style={s.modeLabel}>Cómo se mide</Text>
      <View style={s.modes}>
        {TRACKING_MODES.map((m) => (
          <TouchableOpacity
            key={m}
            style={[s.mode, mode === m && s.modeOn]}
            onPress={() => setMode(m)}
          >
            <Text style={[s.modeText, mode === m && s.modeTextOn]}>{TRACKING_LABELS[m]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.modeHint}>{TRACKING_HINTS[mode]}</Text>
```

Agregar a `createStyles`, copiando el patrón de chips que usa el modal del diario:

```tsx
    modeLabel: { color: c.textSecondary, fontSize: 13, marginBottom: 7 },
    modes: { flexDirection: 'row', gap: 8 },
    mode: {
      flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center',
      borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary,
    },
    modeOn: { backgroundColor: c.accent, borderColor: c.accent },
    modeText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    modeTextOn: { color: c.accentText },
    modeHint: { color: c.textMuted, fontSize: 11, marginTop: 6, marginBottom: 10 },
```

- [ ] **Step 3: La acción guarda el modo**

En `app/gym/configuracion/_lib/actions.ts`, agregar al import de tipos `TrackingMode`:

```ts
import type { Exercise, RoutineWithExercise, TrackingMode } from '@/types/database';
```

Reemplazar la firma y el insert de `createExercise` (el comentario de arriba se conserva tal cual):

```ts
export async function createExercise(
  name: string,
  muscleGroup: string,
  trackingMode: TrackingMode
): Promise<{ success: boolean; error: string | null }> {
  const auth = await currentUserId();
  if (!auth.userId) return { success: false, error: auth.error };

  const { error } = await supabase.from('exercises').insert({
    user_id: auth.userId,
    name: name.trim(),
    muscle_group: muscleGroup.trim() || 'General',
    tracking_mode: trackingMode,
  });
```

- [ ] **Step 4: Ajustar quien lo llama**

En `app/gym/configuracion/index.tsx`, buscar la llamada a `createExercise` y el `onSubmit` del `<ExerciseForm>`. Pasar el tercer argumento a través. TypeScript señala la línea exacta si se olvida.

- [ ] **Step 5: Verificar**

```bash
npx tsc --noEmit && npx expo lint && npm test
```

Esperado: sin errores, tests en verde.

- [ ] **Step 6: Probar contra la base**

Levantar la app, ir a Rutinas → «Crear nuevo ejercicio», escribir «Caminadora inclinada», elegir categoría Cardio (el modo tiene que saltar solo a Tiempo), crear. Después:

```sql
select name, muscle_group, tracking_mode from public.exercises where muscle_group = 'Cardio';
```

Esperado: `Caminadora inclinada | Cardio | tiempo`.

- [ ] **Step 7: Commit**

```bash
git add lib/muscle-groups.ts app/gym/configuracion/
git commit -m "feat(gym): categoría Cardio y selector de modo al crear ejercicio

EXERCISE_CATEGORIES (lo que ofrece el desplegable) se separa de
MUSCLE_GROUPS (lo que puntúa en el balance por grupo). Esa separación es lo
que va a impedir que la caminadora aparezca como un músculo."
```

---

## Task 5: Registrar series de tiempo y de solo reps

La tarea más grande de la pista. Toca el camino completo: leer el día, pintar la fila, validar y guardar.

**Files:**
- Modify: `app/gym/ejercicio/_lib/types.ts`
- Modify: `app/gym/ejercicio/_lib/actions.ts`
- Modify: `app/gym/ejercicio/_components/set-row.tsx`
- Modify: `app/gym/ejercicio/_components/exercise-card.tsx`
- Modify: `app/gym/ejercicio/index.tsx`

**Interfaces:**
- Consumes: `parseMinutes`, `formatMinutes`, `labelDuration`, `usesWeight`, `usesReps`, `usesDuration`, `MAX_DURATION_SECONDS` (Tarea 3).
- Produces:
  - `SetLog` gana `duration: string`; `SetLog.previous` gana `durationSeconds: number | null`
  - `SetInput` gana `duration: string`
  - `SetField` pasa a `'reps' | 'weight' | 'rpe' | 'duration'`
  - `saveWorkoutSet` gana el parámetro `mode: TrackingMode` y `duration: string`

- [ ] **Step 1: Los tipos de la pantalla**

En `app/gym/ejercicio/_lib/types.ts`, dentro de `SetLog` reemplazar:

```ts
  rpe: string;
  saved: boolean;
  /** Referencia de la sesión previa. En kg, que es como se guarda. */
  previous?: { weightKg: number; reps: number; rpe: number | null };
```

por:

```ts
  rpe: string;
  /** Minutos tal como se escriben. Solo en tracking_mode = 'tiempo'. */
  duration: string;
  saved: boolean;
  /** Referencia de la sesión previa. El peso en kg, que es como se guarda. */
  previous?: {
    weightKg: number | null;
    reps: number | null;
    durationSeconds: number | null;
    rpe: number | null;
  };
```

Dentro de `SetInput`, agregar después de `weight`:

```ts
  /** Minutos escritos. Vacío fuera de los ejercicios de tiempo. */
  duration: string;
```

- [ ] **Step 2: Leer el día con la duración**

En `app/gym/ejercicio/_lib/actions.ts`:

Agregar al import:

```ts
import { formatMinutes, MAX_DURATION_SECONDS, parseMinutes, usesDuration, usesReps, usesWeight } from '@/lib/tracking-mode';
import type { PreviousSetRow, RoutineWithExercise, TrackingMode } from '@/types/database';
```

En `buildSuggestion`, agregar como primera línea del cuerpo — la sugerencia es de carga y en un ejercicio sin carga no significa nada:

```ts
  if (previous.length === 0 || targetReps === null) return undefined;

  const topWeight = Math.max(...previous.map((p) => Number(p.weight ?? 0)));
```

Dentro de `fetchDayWorkout`, en el `routines.map`, reemplazar el bloque que arma `sets_data`:

```ts
    const mode = routine.exercises.tracking_mode;
    const sets_data: SetLog[] = [];
    for (let n = 1; n <= routine.sets; n++) {
      const saved = savedLogs.find((l) => l.set_number === n);
      const prev = previous.find((p) => p.set_number === n);
      const source = saved ?? prev ?? null;
      const referenceKg = source?.weight != null ? Number(source.weight) : null;
      const referenceSecs = source?.duration_seconds ?? null;

      sets_data.push({
        set_number: n,
        reps: source?.reps != null ? String(source.reps) : '',
        weight: referenceKg !== null ? inUnit(referenceKg) : '',
        duration: referenceSecs !== null ? formatMinutes(referenceSecs) : '',
        rpe: saved?.rpe != null ? String(saved.rpe) : '',
        saved: !!saved,
        previous: prev
          ? {
              weightKg: prev.weight != null ? Number(prev.weight) : null,
              reps: prev.reps,
              durationSeconds: prev.duration_seconds,
              rpe: prev.rpe,
            }
          : undefined,
      });
    }
```

Y en `buildSuggestion`, la llamada dentro del `return` del map pasa a:

```ts
      suggestion: mode === 'carga' ? buildSuggestion(previous, targetReps, rpeTarget) : undefined,
```

- [ ] **Step 3: Guardar según el modo**

En el mismo archivo, reemplazar el cuerpo de `saveWorkoutSet` por:

```ts
export async function saveWorkoutSet(params: {
  exerciseId: string;
  dateStr: string;
  setNumber: number;
  /** Qué campos hay que exigir y cuáles ignorar. */
  mode: TrackingMode;
  reps: string;
  weight: string;
  duration: string;
  /** Unidad en la que está escrito `weight`. A la base va siempre en kg. */
  unit: WeightUnit;
  rpe: string;
}): Promise<SaveSetResult> {
  const { exerciseId, dateStr, setNumber, mode, reps, weight, duration, unit, rpe } = params;

  // Cada modo pide lo suyo y deja el resto en null. No se guardan ceros de
  // relleno: 0 kg es un peso real (peso corporal) y confundirlo con «no aplica»
  // ensuciaría cualquier promedio futuro.
  let parsedReps: number | null = null;
  let parsedWeight: number | null = null;
  let parsedDuration: number | null = null;

  if (usesReps(mode)) {
    if (!reps) return { success: false, error: 'Faltan las repeticiones', loggedAt: null };
    parsedReps = parseInt(reps, 10);
    if (!Number.isFinite(parsedReps) || parsedReps < 1 || parsedReps > MAX_REPS) {
      return {
        success: false,
        error: `Las repeticiones deben estar entre 1 y ${MAX_REPS}`,
        loggedAt: null,
      };
    }
  }

  if (usesWeight(mode)) {
    if (!weight) return { success: false, error: 'Falta el peso', loggedAt: null };
    const entered = parseWeight(weight);
    if (entered === null) return { success: false, error: 'Peso inválido', loggedAt: null };
    parsedWeight = toKg(entered, unit);
    if (parsedWeight > MAX_WEIGHT_KG) {
      return {
        success: false,
        error: `La carga no puede pasar de ${labelWeight(MAX_WEIGHT_KG, unit)}`,
        loggedAt: null,
      };
    }
  }

  if (usesDuration(mode)) {
    parsedDuration = parseMinutes(duration);
    if (parsedDuration === null) {
      return {
        success: false,
        error: `Escribí los minutos, hasta ${MAX_DURATION_SECONDS / 60}`,
        loggedAt: null,
      };
    }
  }

  const parsedRpe = rpe ? parseFloat(rpe) : NaN;
  if (rpe && (!Number.isFinite(parsedRpe) || parsedRpe < 1 || parsedRpe > 10)) {
    return { success: false, error: 'El RPE debe estar entre 1 y 10', loggedAt: null };
  }

  const auth = await currentUserId();
  if (!auth.userId) return { success: false, error: auth.error, loggedAt: null };

  const { data, error } = await supabase
    .from('workout_logs')
    .upsert(
      {
        user_id: auth.userId,
        exercise_id: exerciseId,
        workout_date: dateStr,
        set_number: setNumber,
        reps: parsedReps,
        weight: parsedWeight,
        duration_seconds: parsedDuration,
        rpe: rpe ? parsedRpe : null,
      },
      {
        onConflict: 'user_id,exercise_id,workout_date,set_number',
        ignoreDuplicates: false,
      }
    )
    .select('created_at')
    .single();

  if (error) return { success: false, error: error.message, loggedAt: null };
  return { success: true, error: null, loggedAt: data?.created_at ?? null };
}
```

- [ ] **Step 4: La fila cambia de campos**

En `app/gym/ejercicio/_components/set-row.tsx`:

Imports nuevos:

```tsx
import { labelDuration, usesDuration, usesReps, usesWeight } from '@/lib/tracking-mode';
import type { TrackingMode } from '@/types/database';
```

Cambiar el tipo del campo y agregar el prop:

```tsx
export type SetField = 'reps' | 'weight' | 'rpe' | 'duration';
```

En `SetRowProps`, agregar después de `unit`:

```tsx
  /** Qué inputs pinta la fila. */
  mode: TrackingMode;
```

Agregar `mode` a la desestructuración de los props del componente.

Reemplazar el `useMemo` del `hint`:

```tsx
  const hint = useMemo(() => {
    const parts: string[] = [];

    if (usesWeight(mode) && unit === 'lb') {
      const entered = parseWeight(set.weight);
      if (entered !== null) parts.push(`= ${formatWeight(toKg(entered, 'lb'))} kg`);
    }

    if (set.previous && !set.saved) {
      const { weightKg, reps, durationSeconds, rpe } = set.previous;
      const rpeLabel = rpe !== null ? ` @ RPE ${rpe}` : '';
      if (usesDuration(mode) && durationSeconds !== null) {
        parts.push(`anterior ${labelDuration(durationSeconds)}${rpeLabel}`);
      } else if (usesWeight(mode) && weightKg !== null && reps !== null) {
        parts.push(`anterior ${labelWeight(weightKg, unit)} × ${reps}${rpeLabel}`);
      } else if (reps !== null) {
        parts.push(`anterior ${reps} reps${rpeLabel}`);
      }
    }

    return parts.join(' · ');
  }, [mode, unit, set.weight, set.previous, set.saved]);
```

Reemplazar los dos `<TextInput>` de reps y peso (los primeros dos de la fila) por:

```tsx
        {usesReps(mode) && (
          <TextInput
            style={[s.input, set.saved && s.inputSaved]}
            keyboardType="numeric"
            placeholder={targetReps ?? '0'}
            placeholderTextColor={colors.placeholder}
            value={set.reps}
            onChangeText={(v) => onValueChange(exerciseId, setIndex, 'reps', v)}
          />
        )}
        {usesWeight(mode) && (
          <TextInput
            style={[s.input, set.saved && s.inputSaved]}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.placeholder}
            value={set.weight}
            onChangeText={(v) => onValueChange(exerciseId, setIndex, 'weight', v)}
          />
        )}
        {usesDuration(mode) && (
          <View style={s.durationWrap}>
            <TextInput
              style={[s.input, s.durationInput, set.saved && s.inputSaved]}
              keyboardType="numeric"
              placeholder={targetReps ?? '0'}
              placeholderTextColor={colors.placeholder}
              value={set.duration}
              onChangeText={(v) => onValueChange(exerciseId, setIndex, 'duration', v)}
            />
            <Text style={s.durationUnit}>min</Text>
          </View>
        )}
```

En el `onPress` del botón de guardar, agregar `duration`:

```tsx
            onSave(
              exerciseId,
              {
                setNumber: set.set_number,
                reps: set.reps,
                weight: set.weight,
                duration: set.duration,
                rpe: set.rpe,
              },
              unit
            )
```

Agregar a `createStyles`:

```tsx
    durationWrap: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 },
    durationInput: { flex: 1 },
    durationUnit: { color: c.textSecondary, fontSize: 13 },
```

- [ ] **Step 5: La tarjeta esconde lo que no aplica**

En `app/gym/ejercicio/_components/exercise-card.tsx`:

```tsx
import { usesWeight } from '@/lib/tracking-mode';
```

Después de la línea que desestructura el ejercicio, agregar:

```tsx
  const { name, muscle_group, image_url, instructions, tracking_mode } = exercise.exercises;
  /** El toggle kg/lb y la sugerencia de carga no significan nada sin carga. */
  const hasLoad = usesWeight(tracking_mode);
```

Envolver el `<WeightUnitToggle .../>` en `{hasLoad && ( ... )}` y hacer lo mismo con el bloque que pinta `suggestionText(...)`.

Reemplazar el `useMemo` de `unsavedWithData` — la condición de "tiene datos" depende del modo:

```tsx
  const unsavedWithData = useMemo(
    () =>
      exercise.sets_data.filter((st) => {
        if (st.saved) return false;
        if (tracking_mode === 'tiempo') return st.duration !== '';
        if (tracking_mode === 'reps') return st.reps !== '';
        return st.reps !== '' && st.weight !== '';
      }),
    [exercise.sets_data, tracking_mode]
  );
```

Pasar `mode={tracking_mode}` al `<SetRow>`.

Los encabezados de columna que hoy dicen REPS / KG: cambiarlos según el modo a `REPS · KG · RPE`, `REPS · RPE` o `MIN · RPE`.

- [ ] **Step 6: La pantalla pasa el modo al guardar**

En `app/gym/ejercicio/index.tsx`, en `handleSaveSets`, la llamada a `saveWorkoutSet` gana dos campos. El modo sale del ejercicio, que hay que buscar en los bloques:

```tsx
  const handleSaveSets = useCallback(
    async (exerciseId: string, sets: SetInput[], unit: WeightUnit) => {
      const mode =
        flatten(workout.blocks).find((e) => e.exercise_id === exerciseId)?.exercises
          .tracking_mode ?? 'carga';

      const results = await Promise.all(
        sets.map((st) =>
          saveWorkoutSet({
            exerciseId,
            dateStr,
            setNumber: st.setNumber,
            mode,
            reps: st.reps,
            weight: st.weight,
            duration: st.duration,
            unit,
            rpe: st.rpe,
          })
        )
      );
```

Agregar `workout.blocks` al array de dependencias del `useCallback`.

- [ ] **Step 7: Verificar**

```bash
npx tsc --noEmit && npx expo lint && npm test
```

- [ ] **Step 8: Probar de punta a punta**

Agregar «Caminadora inclinada» a la rutina de hoy con 1 serie, registrar 45 min, y confirmar en la base:

```sql
select l.set_number, l.reps, l.weight, l.duration_seconds, l.rpe
  from public.workout_logs l
  join public.exercises e on e.id = l.exercise_id
 where e.muscle_group = 'Cardio' and l.workout_date = current_date;
```

Esperado: `1 | null | null | 2700 | <rpe o null>`. Los nulls son el punto: **si aparece un 0 en `reps` o `weight`, el paso 3 está mal.**

- [ ] **Step 9: Commit**

```bash
git add app/gym/ejercicio/
git commit -m "feat(gym): registrar series de tiempo y de solo repeticiones

Cada modo pide lo suyo y deja el resto en null. Sin ceros de relleno: 0 kg
es un peso real en los ejercicios a peso corporal."
```

---

## Task 6: Migrar las cuatro RPCs

El riesgo real del lote. Se hace en una sola migración porque las cuatro comparten el mismo supuesto roto.

**Files:**
- Create: `supabase/migrations/20260921110000_stats_rpcs_tracking_mode.sql`
- Modify: `types/database.ts`

**Interfaces:**
- Produces: `PreviousSetRow` gana `duration_seconds: number | null` y sus `reps`/`weight` pasan a nullable; `ExerciseStatsRow` gana `tracking_mode: TrackingMode` y `duration_min: number | null`.

- [ ] **Step 1: Tomar la foto del antes**

**Este paso no es opcional.** Guardar la salida en `/tmp/rpc-antes.json`:

```sql
select sets, volume, avg_rpe, exercises, cardio_minutes, by_muscle
  from public.training_summary('2026-01-01', '2026-12-31');

select exercise_id, name, sessions, sets, volume, max_weight, best_e1rm
  from public.exercise_stats('2026-01-01', '2026-12-31')
 order by name;
```

- [ ] **Step 2: Escribir la migración**

Crear `supabase/migrations/20260921110000_stats_rpcs_tracking_mode.sql`. Empieza con este encabezado:

```sql
-- =============================================================================
--  Las estadísticas, con cardio en workout_logs
--
--  `reps` y `weight` ahora pueden ser null. `sum(weight * reps)` ignora los
--  nulls, así que el volumen sobrevive solo; lo que NO sobrevive es `count(*)`,
--  que contaría una serie de caminadora como una serie de fuerza, y el balance
--  por grupo, que pintaría «Cardio» como si fuera un músculo.
--
--  El corte va por CATEGORÍA y no por modo, y los dos filtros usan el mismo
--  criterio a propósito: una plancha es Core en modo tiempo, es una serie de
--  trabajo real, y tiene que contar tanto en el total como en el balance de
--  Core. Si se cortara por tracking_mode, la plancha sumaría en un lado y no en
--  el otro y los dos números dejarían de cuadrar en la misma pantalla.
-- =============================================================================
```

Después, las cuatro funciones. **Cada una se copia entera desde su migración de origen** y se le aplican los cambios que siguen — `create or replace` necesita el cuerpo completo.

**`exercise_stats`** (origen: `20260818135930`, línea 15). Cambia la firma ⇒ antes va:

```sql
drop function if exists public.exercise_stats(date, date, integer);
```

Cambios sobre el cuerpo:
1. En el `returns table`, agregar al final: `tracking_mode text,` y `duration_min numeric`.
2. El CTE `logs` pasa a traer la duración y el modo:

```sql
  with logs as (
    select l.exercise_id, l.workout_date, l.reps, l.weight, l.rpe, l.duration_seconds
      from public.workout_logs l
     where l.user_id = (select auth.uid())
  ),
```

3. En `per_session`, agregar a la lista de columnas: `sum(g.duration_seconds) as duration_secs,`.
4. En el `join lateral (...) agg`, agregar: `sum(r.duration_secs) as duration_secs,`.
5. En el `select` final, agregar al final de la lista, antes del `from`: `e.tracking_mode,` y `round(agg.duration_secs / 60.0, 1)`.

**`training_summary`** (origen: `20260818135930`, línea 128). La firma **no** cambia ⇒ `create or replace` directo, sin `drop`.

Cambios sobre el cuerpo:

1. El CTE `logs` incorpora el grupo y la duración con un join, que hoy no tiene:

```sql
  logs as (
    select l.exercise_id, l.workout_date, l.reps, l.weight, l.rpe, l.created_at,
           l.duration_seconds, e.muscle_group
      from public.workout_logs l
      join public.exercises e on e.id = l.exercise_id
     where l.user_id = (select auth.uid())
  ),
```

2. `day_strength` deja de contar el cardio como fuerza:

```sql
  day_strength as (
    select l.workout_date                        as day,
           count(*) filter (where l.muscle_group <> 'Cardio')::bigint as sets,
           sum(l.weight * l.reps)                as volume,
           round(avg(l.rpe), 1)                  as avg_rpe,
           count(distinct l.exercise_id) filter (where l.muscle_group <> 'Cardio')::bigint
                                                 as exercises
      from logs l
     group by l.workout_date
  ),
```

3. `range_totals` y `prev_totals`, el mismo filtro sobre `count(*)` y sobre `count(distinct l.exercise_id)`.

4. El CTE `muscle` excluye la categoría y ya no necesita su propio join:

```sql
  muscle as (
    select l.muscle_group                         as grp,
           count(*)::bigint                       as sets,
           sum(l.weight * l.reps)                 as volume,
           count(distinct l.workout_date)::bigint as sessions
      from logs l, win w
     where l.workout_date between w.from_date and w.to_date
       and l.muscle_group <> 'Cardio'
     group by l.muscle_group
  ),
```

5. `range_cardio` suma también el cardio que ahora vive en `workout_logs`:

```sql
  range_cardio as (
    select (select count(*) from public.cardio_logs c, win w
             where c.user_id = (select auth.uid())
               and c.workout_date between w.from_date and w.to_date)::bigint
           +
           (select count(distinct l.workout_date) from logs l, win w
             where l.workout_date between w.from_date and w.to_date
               and l.duration_seconds is not null)::bigint
           as sessions,
           (select coalesce(sum(c.minutes), 0) from public.cardio_logs c, win w
             where c.user_id = (select auth.uid())
               and c.workout_date between w.from_date and w.to_date)::bigint
           +
           (select coalesce(round(sum(l.duration_seconds) / 60.0), 0) from logs l, win w
             where l.workout_date between w.from_date and w.to_date)::bigint
           as minutes
  ),
```

6. `pr_events` **no se toca**. `max(weight * (1 + reps/30))` sobre filas nulas da null, y `top_e1rm > prev_best` con null no es true, así que el cardio queda fuera de los récords solo. **Verificarlo en el paso 4, no darlo por hecho.**

**`previous_sets`** (origen: `20260804032117`). Cambia la firma ⇒ antes va:

```sql
drop function if exists public.previous_sets(date, uuid[]);
```

Agregar `duration_seconds numeric` al `returns table` y `l.duration_seconds` al `select` final.

**`export_training_data`** (origen: `20260807020626`, línea 48). La firma **no** cambia.

En el primer brazo del `union all` (series de fuerza), reemplazar el literal `'fuerza'::text` por:

```sql
  select case when e.tracking_mode = 'tiempo' then 'cardio' else 'fuerza' end::text,
```

y la columna `null::smallint` que corresponde a `minutos` por:

```sql
         (l.duration_seconds / 60)::smallint,
```

- [ ] **Step 3: Aplicar**

Aplicar la migración contra la base.

- [ ] **Step 4: Comparar contra la foto del antes**

Volver a correr las dos consultas del paso 1 y comparar con `/tmp/rpc-antes.json`.

**Tiene que dar idéntico** en `sets`, `volume`, `avg_rpe`, `exercises` y `by_muscle`: ningún registro del histórico es de cardio, así que cualquier diferencia es un bug de esta migración, no un efecto esperado. Si algo se movió, revertir y revisar los filtros antes de seguir.

`cardio_minutes` sí puede subir si en la tarea 5 se registró la prueba de 45 min.

Después, confirmar que la caminadora no contamina:

```sql
-- Balance por grupo: no puede aparecer 'Cardio'
select jsonb_array_elements(by_muscle) -> 'group'
  from public.training_summary('2026-01-01', '2026-12-31');

-- Récords: no puede aparecer un ejercicio de cardio
select jsonb_array_elements(records) -> 'name'
  from public.training_summary('2026-01-01', '2026-12-31');

-- El CSV: la caminadora sale como cardio con sus minutos
select tipo, ejercicio, reps, peso_kg, minutos
  from public.export_training_data('2026-01-01', '2026-12-31')
 where ejercicio = 'Caminadora inclinada';
```

Esperado en la última: `cardio | Caminadora inclinada | null | null | 45`.

- [ ] **Step 5: Actualizar los tipos**

En `types/database.ts`, en `PreviousSetRow`:

```ts
export type PreviousSetRow = {
  exercise_id: string;
  workout_date: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  duration_seconds: number | null;
  rpe: number | null;
};
```

En `ExerciseStatsRow`, agregar al final:

```ts
  tracking_mode: TrackingMode;
  /** Minutos del rango. Solo tiene valor en los ejercicios de tiempo. */
  duration_min: number | null;
```

- [ ] **Step 6: Verificar y commitear**

```bash
npx tsc --noEmit && npm test
git add supabase/migrations/20260921110000_stats_rpcs_tracking_mode.sql types/database.ts
git commit -m "feat(gym): las estadísticas entienden el cardio

count(*) contaba una serie de caminadora como serie de fuerza y el balance
por grupo pintaba Cardio como si fuera un músculo. El corte va por
categoría y no por modo, para que una plancha en Core siga contando en los
dos lados.

Verificado contra el histórico: sets, volume, avg_rpe, exercises y
by_muscle idénticos antes y después."
```

---

## Task 7: Estadísticas muestran minutos

**Files:**
- Modify: `app/gym/estadisticas/_components/stat-card.tsx`
- Modify: `app/gym/estadisticas/_lib/types.ts`

**Interfaces:**
- Consumes: `ExerciseStatsRow.tracking_mode` y `.duration_min` (Tarea 6), `labelDuration` (Tarea 3).

- [ ] **Step 1: Propagar los campos nuevos**

En `app/gym/estadisticas/_lib/types.ts`, agregar `tracking_mode` y `duration_min` al tipo que representa una fila de ejercicio, siguiendo el nombre que ya use el archivo.

- [ ] **Step 2: La tarjeta lee minutos cuando toca**

En `app/gym/estadisticas/_components/stat-card.tsx`, donde hoy se pinta el último peso y el 1RM estimado, envolver en una condición: si `tracking_mode === 'tiempo'`, mostrar en su lugar los minutos totales del período y el promedio por sesión. Para `'reps'`, mostrar solo las repeticiones y omitir kg y e1RM.

- [ ] **Step 3: Verificar**

```bash
npx tsc --noEmit && npx expo lint
```

Abrir Estadísticas y confirmar que «Caminadora inclinada» aparece con minutos y sin «0 kg», y que no figura en Balance por grupo ni en Récords.

- [ ] **Step 4: Commit**

```bash
git add app/gym/estadisticas/
git commit -m "feat(gym): estadísticas de ejercicios de tiempo en minutos"
```

---

## Task 8: Esquema de objetivos en g/kg y ciclado

**Files:**
- Create: `supabase/migrations/20260921120000_nutrition_goals_per_kg.sql`
- Modify: `types/database.ts`

**Interfaces:**
- Produces: `nutrition_goals` con PK `(user_id, profile)` y `protein_g_kg`/`carbs_g_kg`/`fat_g_kg`; tabla `nutrition_days`; vista `nutrition_goals_current`; RPC `nutrition_day_goals(p_from date, p_to date)`.

- [ ] **Step 1: Foto del antes**

```sql
select energy_kcal, protein_g, carbs_g, fat_g, fiber_g from public.nutrition_goals;
select weight_kg from public.body_weight_logs order by measured_at desc limit 1;
```

Referencia: `1850 | 170 | 160 | 63 | 30` y `77.10`.

- [ ] **Step 2: Escribir la migración**

```sql
-- =============================================================================
--  Objetivos en g/kg, con un perfil para los días de ciclado de carbos
--
--  Los gramos absolutos envejecen con el peso: 170 g de proteína son 2,2 g/kg a
--  77 kg y 2,4 a 71. Lo que se prescribe es el ratio, así que es el ratio lo
--  que se guarda y el gramaje se deriva del último pesaje.
--
--  `energy_kcal` y `fiber_g` se quedan absolutos: la meta de calorías es un
--  número puesto a mano con regla de déficit, no algo que se mueva con el peso,
--  y la fibra se prescribe en g/día.
-- =============================================================================

alter table public.nutrition_goals
  add column profile text not null default 'normal';

alter table public.nutrition_goals
  add constraint nutrition_goals_profile_check check (profile in ('normal', 'ciclado'));

-- La fila que ya existía queda como 'normal' por el default de arriba.
alter table public.nutrition_goals drop constraint nutrition_goals_pkey;
alter table public.nutrition_goals add primary key (user_id, profile);

alter table public.nutrition_goals
  add column protein_g_kg numeric,
  add column carbs_g_kg   numeric,
  add column fat_g_kg     numeric;

alter table public.nutrition_goals
  add constraint nutrition_goals_protein_kg_check
    check (protein_g_kg is null or protein_g_kg >= 0),
  add constraint nutrition_goals_carbs_kg_check
    check (carbs_g_kg is null or carbs_g_kg >= 0),
  add constraint nutrition_goals_fat_kg_check
    check (fat_g_kg is null or fat_g_kg >= 0);

-- Backfill con el último pesaje de cada usuario. Dos decimales: la diferencia
-- contra el gramaje viejo queda en décimas (170 → 169,6 g de proteína) y es el
-- precio de que el número se lea. El perfil 'ciclado' nace vacío a propósito:
-- esos valores los pone el usuario, no una cuenta.
update public.nutrition_goals g
   set protein_g_kg = round(g.protein_g / w.weight_kg, 2),
       carbs_g_kg   = round(g.carbs_g   / w.weight_kg, 2),
       fat_g_kg     = round(g.fat_g     / w.weight_kg, 2)
  from (
    select distinct on (b.user_id) b.user_id, b.weight_kg
      from public.body_weight_logs b
     order by b.user_id, b.measured_at desc
  ) w
 where w.user_id = g.user_id and w.weight_kg > 0;

alter table public.nutrition_goals
  drop column protein_g,
  drop column carbs_g,
  drop column fat_g;

-- ── Qué día fue de ciclado ───────────────────────────────────────────────────
-- Solo hay fila en los días marcados: la ausencia es «día normal», que es la
-- mayoría, y así los 401 registros que ya existen no necesitan backfill.
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

-- ── La vista que mantiene vivas las consultas de las skills ──────────────────
-- `analisis-progreso/consultas.sql` y `reporte-nutricion` leen protein_g,
-- carbs_g y fat_g de la tabla. Borrar esas columnas las rompía a las dos: la
-- vista se las devuelve ya resueltas contra el último peso.
--
-- security_invoker: sin esto la vista correría con los permisos del dueño y
-- expondría los objetivos de cualquier usuario.
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

-- ── El objetivo que le tocaba a cada día ─────────────────────────────────────
-- Va aparte y no dentro de `nutrition_summary` porque es aditivo: la pantalla
-- de estadísticas sigue funcionando aunque esta RPC falle.
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
  select d.day,
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
    -- el peso que había en julio.
    left join lateral (
      select b.weight_kg
        from public.body_weight_logs b
       where b.user_id = (select auth.uid())
         and b.measured_at::date <= d.day::date
       order by b.measured_at desc
       limit 1
    ) w on true;
$$;
```

- [ ] **Step 3: Aplicar y verificar el backfill**

```sql
select profile, energy_kcal, protein_g_kg, carbs_g_kg, fat_g_kg, fiber_g
  from public.nutrition_goals;
```

Esperado: una fila, `normal | 1850 | 2.20 | 2.08 | 0.82 | 30`.

```sql
select profile, weight_kg, energy_kcal, protein_g, carbs_g, fat_g, fiber_g
  from public.nutrition_goals_current;
```

Esperado: `normal | 77.10 | 1850 | 169.6 | 160.4 | 63.2 | 30`. Contra el `170 | 160 | 63` del paso 1: **±1 g, no más**. Si la diferencia es mayor, el backfill dividió por el peso equivocado.

```sql
select * from public.nutrition_day_goals(current_date - 6, current_date);
```

Esperado: 7 filas, todas con `profile = 'normal'` y el objetivo resuelto.

- [ ] **Step 4: Confirmar que la RLS de la vista aplica**

```sql
select count(*) from public.nutrition_goals_current;
```

Esperado: 1 (solo la fila propia). Si devuelve más, falta el `security_invoker`.

- [ ] **Step 5: Actualizar los tipos**

En `types/database.ts`, reemplazar `NutritionGoals`:

```ts
/** Cuál de los dos juegos de objetivos. */
export type GoalProfile = 'normal' | 'ciclado';

/**
 * Meta diaria. Una fila por usuario y perfil.
 *
 * Los macros van en gramos por kilo de peso corporal porque es como se
 * prescriben; el gramaje sale de multiplicar por el último pesaje. Las calorías
 * y la fibra no: son números absolutos puestos a mano.
 */
export type NutritionGoals = {
  user_id: string;
  profile: GoalProfile;
  energy_kcal: number | null;
  protein_g_kg: number | null;
  carbs_g_kg: number | null;
  fat_g_kg: number | null;
  fiber_g: number | null;
  updated_at: string;
};

/** Fila de `nutrition_goals_current`: el mismo objetivo ya resuelto en gramos. */
export type NutritionGoalsResolved = {
  user_id: string;
  profile: GoalProfile;
  weight_kg: number | null;
  energy_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  updated_at: string;
};

/** Un día marcado como de ciclado. Sin fila = día normal. */
export type NutritionDay = {
  user_id: string;
  logged_on: string;
  goal_profile: GoalProfile;
  created_at: string;
};

/** Fila de `nutrition_day_goals`: qué objetivo le tocaba a ese día. */
export type NutritionDayGoal = {
  day: string;
  profile: GoalProfile;
  weight_kg: number | null;
  energy_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
};
```

- [ ] **Step 6: Verificar y commitear**

```bash
npx tsc --noEmit
```

Esperado: **errores** en `objetivos.tsx`, `index.tsx`, `diario.ts`, `goal-meters.tsx` y `impact-preview.tsx` — son las tareas 9-14.

```bash
git add supabase/migrations/20260921120000_nutrition_goals_per_kg.sql types/database.ts
git commit -m "feat(nutricion): objetivos en g/kg con perfil normal y de ciclado

nutrition_goals pasa a PK (user_id, profile) con los macros en g/kg; se
agrega nutrition_days para marcar qué día fue cuál.

La vista nutrition_goals_current mantiene vivas las consultas de las skills
analisis-progreso y reporte-nutricion, que leían protein_g/carbs_g/fat_g
directo de la tabla.

Backfill verificado con 77,1 kg: 170/160/63 g → 2,20/2,08/0,82 g/kg, que
resuelven a 169,6/160,4/63,2. La diferencia es el redondeo a dos decimales."
```

---

## Task 9: `lib/nutricion/objetivos.ts` con tests

**Files:**
- Create: `lib/nutricion/objetivos.ts`, `lib/nutricion/objetivos.test.ts`

**Interfaces:**
- Consumes: `GoalField` de `lib/nutricion/diario.ts`; `NutritionGoals`, `GoalProfile` (Tarea 8).
- Produces:
  - `GOAL_PROFILES: readonly GoalProfile[]`
  - `PROFILE_LABELS: Record<GoalProfile, string>`
  - `PER_KG_FIELDS: readonly ('protein_g' | 'carbs_g' | 'fat_g')[]`
  - `isPerKg(field: GoalField): boolean`
  - `GOAL_INPUT_UNITS: Record<GoalField, string>` — `'g/kg'` o `'g'`/`'kcal'`
  - `resolveGoals(goals: NutritionGoals | null, weightKg: number | null): Record<GoalField, number | null>`
  - `PER_KG_COLUMN: Record<'protein_g'|'carbs_g'|'fat_g', 'protein_g_kg'|'carbs_g_kg'|'fat_g_kg'>`

- [ ] **Step 1: Escribir los tests que fallan**

Crear `lib/nutricion/objetivos.test.ts`:

```ts
import type { NutritionGoals } from '@/types/database';
import { isPerKg, resolveGoals } from './objetivos';

const NORMAL: NutritionGoals = {
  user_id: 'u1',
  profile: 'normal',
  energy_kcal: 1850,
  protein_g_kg: 2.2,
  carbs_g_kg: 2.08,
  fat_g_kg: 0.82,
  fiber_g: 30,
  updated_at: '2026-09-21T00:00:00Z',
};

describe('isPerKg', () => {
  it('los tres macros van por kilo', () => {
    expect(isPerKg('protein_g')).toBe(true);
    expect(isPerKg('carbs_g')).toBe(true);
    expect(isPerKg('fat_g')).toBe(true);
  });

  it('calorías y fibra son absolutas: se prescriben así, no por peso', () => {
    expect(isPerKg('energy_kcal')).toBe(false);
    expect(isPerKg('fiber_g')).toBe(false);
  });
});

describe('resolveGoals', () => {
  it('multiplica los macros por el peso y redondea a un decimal', () => {
    const r = resolveGoals(NORMAL, 77.1);
    expect(r.protein_g).toBe(169.6);
    expect(r.carbs_g).toBe(160.4);
    expect(r.fat_g).toBe(63.2);
  });

  it('deja calorías y fibra como están', () => {
    const r = resolveGoals(NORMAL, 77.1);
    expect(r.energy_kcal).toBe(1850);
    expect(r.fiber_g).toBe(30);
  });

  it('sigue al peso: a 71 kg los mismos g/kg dan menos gramos', () => {
    expect(resolveGoals(NORMAL, 71).protein_g).toBe(156.2);
  });

  it('sin pesaje no inventa un gramaje: los macros quedan en null', () => {
    const r = resolveGoals(NORMAL, null);
    expect(r.protein_g).toBeNull();
    expect(r.carbs_g).toBeNull();
    expect(r.fat_g).toBeNull();
  });

  it('sin pesaje las absolutas siguen valiendo: no dependen del peso', () => {
    const r = resolveGoals(NORMAL, null);
    expect(r.energy_kcal).toBe(1850);
    expect(r.fiber_g).toBe(30);
  });

  it('un macro sin definir queda en null, no en cero', () => {
    const r = resolveGoals({ ...NORMAL, carbs_g_kg: null }, 77.1);
    expect(r.carbs_g).toBeNull();
    expect(r.protein_g).toBe(169.6);
  });

  it('sin objetivo cargado devuelve todo en null', () => {
    const r = resolveGoals(null, 77.1);
    expect(r.energy_kcal).toBeNull();
    expect(r.protein_g).toBeNull();
  });

  it('un peso absurdo no produce un objetivo absurdo', () => {
    expect(resolveGoals(NORMAL, 0).protein_g).toBeNull();
    expect(resolveGoals(NORMAL, -5).protein_g).toBeNull();
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

```bash
npm test -- lib/nutricion/objetivos.test.ts
```

Esperado: FAIL — `Cannot find module './objetivos'`.

- [ ] **Step 3: Escribir el módulo**

Crear `lib/nutricion/objetivos.ts`:

```ts
import type { GoalProfile, NutritionGoals } from '@/types/database';
import { GOAL_FIELDS, type GoalField } from './diario';

/**
 * Cómo se escribe un objetivo y cómo se vuelve gramos.
 *
 * Los macros se prescriben por kilo de peso corporal, así que es el ratio lo
 * que se guarda: 170 g de proteína son 2,2 g/kg a 77 kg y 2,4 a 71, y lo que no
 * cambia entre esos dos días es el 2,2. Las calorías y la fibra no siguen esa
 * regla — son números puestos a mano.
 *
 * La multiplicación vive solo acá. Repetida en el diario, en objetivos y en
 * estadísticas es cómo se llega a tres cifras distintas para la misma meta.
 */

export const GOAL_PROFILES: readonly GoalProfile[] = ['normal', 'ciclado'];

export const PROFILE_LABELS: Record<GoalProfile, string> = {
  normal: 'Día normal',
  ciclado: 'Día de ciclado',
};

/** Los que se escriben por kilo. */
export const PER_KG_FIELDS = ['protein_g', 'carbs_g', 'fat_g'] as const;
export type PerKgField = (typeof PER_KG_FIELDS)[number];

/** Qué columna de la base guarda el ratio de cada macro. */
export const PER_KG_COLUMN = {
  protein_g: 'protein_g_kg',
  carbs_g: 'carbs_g_kg',
  fat_g: 'fat_g_kg',
} as const satisfies Record<PerKgField, keyof NutritionGoals>;

export function isPerKg(field: GoalField): field is PerKgField {
  return (PER_KG_FIELDS as readonly string[]).includes(field);
}

/** Con qué unidad se ESCRIBE cada objetivo, que no es con la que se lee. */
export const GOAL_INPUT_UNITS: Record<GoalField, string> = {
  energy_kcal: 'kcal',
  protein_g: 'g/kg',
  carbs_g: 'g/kg',
  fat_g: 'g/kg',
  fiber_g: 'g',
};

/**
 * El objetivo del día en gramos. Los macros por kilo quedan en `null` si no hay
 * un peso con qué resolverlos: mostrar un cero ahí sería decir que la meta es
 * no comer proteína, que es lo contrario de «todavía no te pesaste».
 */
export function resolveGoals(
  goals: NutritionGoals | null,
  weightKg: number | null
): Record<GoalField, number | null> {
  const out = Object.fromEntries(GOAL_FIELDS.map((f) => [f, null])) as Record<
    GoalField,
    number | null
  >;
  if (!goals) return out;

  out.energy_kcal = goals.energy_kcal;
  out.fiber_g = goals.fiber_g;

  const usable = weightKg !== null && Number.isFinite(weightKg) && weightKg > 0;
  if (!usable) return out;

  for (const field of PER_KG_FIELDS) {
    const ratio = goals[PER_KG_COLUMN[field]];
    out[field] = ratio == null ? null : Math.round(Number(ratio) * weightKg * 10) / 10;
  }
  return out;
}
```

- [ ] **Step 4: Correr y ver pasar**

```bash
npm test -- lib/nutricion/objetivos.test.ts
```

Esperado: PASS, los 10 tests. El de 71 kg es el que confirma que el ratio manda sobre el gramaje.

- [ ] **Step 5: Commit**

```bash
git add lib/nutricion/objetivos.ts lib/nutricion/objetivos.test.ts
git commit -m "feat(nutricion): resolución de objetivos g/kg × peso

Con tests porque es la cuenta que decide el objetivo de todos los días: un
error acá no se ve, solo hace que las barras del diario mientan."
```

---

## Task 10: El diario lee el perfil del día

**Files:**
- Modify: `lib/nutricion/diario.ts`

**Interfaces:**
- Consumes: `resolveGoals`, `PER_KG_COLUMN` (Tarea 9); `NutritionDay`, `GoalProfile` (Tarea 8).
- Produces:
  - `fetchDay` devuelve además `profile: GoalProfile`, `weightKg: number | null` y `goals` ya resuelto en gramos
  - `fetchGoals(): Promise<{ byProfile: Record<GoalProfile, NutritionGoals | null>; weightKg: number | null; error: string | null }>`
  - `saveGoals(profile: GoalProfile, values: ...)`
  - `setDayProfile(loggedOn: string, profile: GoalProfile): Promise<{ error: string | null }>`

- [ ] **Step 1: `fetchDay` trae el perfil y el peso**

En `lib/nutricion/diario.ts`, reemplazar `fetchDay` para que agregue dos consultas al `Promise.all` — la marca del día y el último pesaje — y resuelva el objetivo antes de devolverlo. La firma del retorno pasa a:

```ts
export async function fetchDay(dateStr: string): Promise<{
  entries: NutritionLogMacros[];
  totals: DayTotals;
  /** Ya resuelto en gramos contra el peso vigente. */
  goals: Record<GoalField, number | null>;
  profile: GoalProfile;
  /** El pesaje con el que se resolvió. `null` si todavía no hay ninguno. */
  weightKg: number | null;
  error: string | null;
}>
```

Las consultas nuevas: `nutrition_days` filtrada por `logged_on = dateStr` con `maybeSingle()`, `nutrition_goals` sin filtro de perfil (vienen las dos filas), y `body_weight_logs` ordenada por `measured_at` descendente con `limit(1)`. El perfil sale de `coalesce` de la marca con `'normal'`, y con él se elige cuál de las dos filas de objetivo pasarle a `resolveGoals`.

- [ ] **Step 2: `fetchGoals` y `saveGoals` manejan los dos perfiles**

```ts
export async function fetchGoals(): Promise<{
  byProfile: Record<GoalProfile, NutritionGoals | null>;
  weightKg: number | null;
  error: string | null;
}> {
  const [goalsRes, weightRes] = await Promise.all([
    supabase.from('nutrition_goals').select('*'),
    supabase
      .from('body_weight_logs')
      .select('weight_kg')
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const byProfile: Record<GoalProfile, NutritionGoals | null> = {
    normal: null,
    ciclado: null,
  };
  for (const row of (goalsRes.data ?? []) as NutritionGoals[]) byProfile[row.profile] = row;

  return {
    byProfile,
    weightKg: weightRes.data ? Number(weightRes.data.weight_kg) : null,
    error: goalsRes.error?.message ?? null,
  };
}

export async function saveGoals(
  profile: GoalProfile,
  values: {
    energy_kcal: number | null;
    protein_g_kg: number | null;
    carbs_g_kg: number | null;
    fat_g_kg: number | null;
    fiber_g: number | null;
  }
): Promise<{ error: string | null }> {
  const auth = await currentUserId();
  if (!auth.userId) return { error: auth.error };

  // El conflicto va por (user_id, profile), que es la PK nueva. Con el
  // 'user_id' de antes, guardar el perfil de ciclado pisaría el normal.
  const { error } = await supabase
    .from('nutrition_goals')
    .upsert({ user_id: auth.userId, profile, ...values }, { onConflict: 'user_id,profile' });
  return { error: error?.message ?? null };
}
```

- [ ] **Step 3: Marcar y desmarcar el día**

```ts
/**
 * Marca (o desmarca) un día como de ciclado. Volver a 'normal' BORRA la fila en
 * vez de guardarla: la ausencia es el default y así la tabla solo tiene los
 * días que de verdad se salieron de lo habitual.
 */
export async function setDayProfile(
  loggedOn: string,
  profile: GoalProfile
): Promise<{ error: string | null }> {
  const auth = await currentUserId();
  if (!auth.userId) return { error: auth.error };

  if (profile === 'normal') {
    const { error } = await supabase
      .from('nutrition_days')
      .delete()
      .eq('logged_on', loggedOn);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase
    .from('nutrition_days')
    .upsert(
      { user_id: auth.userId, logged_on: loggedOn, goal_profile: profile },
      { onConflict: 'user_id,logged_on' }
    );
  return { error: error?.message ?? null };
}
```

- [ ] **Step 4: Verificar**

```bash
npx tsc --noEmit && npm test
```

Los errores que queden tienen que estar solo en `objetivos.tsx`, `index.tsx`, `impact-preview.tsx` y `goal-meters.tsx`.

- [ ] **Step 5: Commit**

```bash
git add lib/nutricion/diario.ts
git commit -m "feat(nutricion): el diario resuelve el objetivo del día según su perfil

setDayProfile borra la fila al volver a normal: la ausencia es el default y
así nutrition_days solo guarda los días que se salieron de lo habitual."
```

---

## Task 11: Pantalla de objetivos con los dos perfiles

**Files:**
- Modify: `app/nutricion/objetivos.tsx`

**Interfaces:**
- Consumes: `fetchGoals`, `saveGoals` (Tarea 10); `GOAL_PROFILES`, `PROFILE_LABELS`, `GOAL_INPUT_UNITS`, `isPerKg`, `PER_KG_COLUMN`, `resolveGoals` (Tarea 9).

- [ ] **Step 1: Selector de perfil y campos en g/kg**

Reescribir la pantalla: dos chips arriba (`Día normal` / `Día de ciclado`, mismo patrón que los de comida del diario) que eligen qué borrador se edita. Los campos se abren con `GOAL_INPUT_UNITS` como sufijo, de modo que proteína, carbos y grasa muestran `g/kg` y calorías y fibra siguen en `kcal` y `g`.

- [ ] **Step 2: La lectura en vivo**

Debajo de cada campo por kilo, una línea en gris que muestre la cuenta ya hecha:

```tsx
{isPerKg(f) && weightKg !== null && parseNum(draft[f]) !== null && (
  <Text style={s.resolved}>
    {draft[f]} g/kg × {formatKg(weightKg)} kg = {resolved[f]} g
  </Text>
)}
```

Sin pesaje, en lugar de esa línea va un aviso con enlace a la pestaña de Peso.

- [ ] **Step 3: El chequeo de kcal corre sobre los gramos resueltos**

El bloque que hoy suma `P×4 + C×4 + G×9` tiene que usar los valores **resueltos**, no los g/kg — si no, diría que la meta son 21 kcal.

- [ ] **Step 4: Guardar el perfil que se está editando**

`handleSave` llama a `saveGoals(profile, { energy_kcal, protein_g_kg, carbs_g_kg, fat_g_kg, fiber_g })` con los valores del borrador del perfil activo.

- [ ] **Step 5: Verificar**

```bash
npx tsc --noEmit && npx expo lint
```

Abrir Objetivos: el perfil normal tiene que mostrar `2.2` en proteína y la línea `2.2 g/kg × 77.1 kg = 169.6 g`. Cargar el perfil de ciclado, guardar, y confirmar en la base que ahora hay **dos** filas y que la normal no se movió:

```sql
select profile, energy_kcal, protein_g_kg, carbs_g_kg, fat_g_kg, fiber_g
  from public.nutrition_goals order by profile;
```

- [ ] **Step 6: Commit**

```bash
git add app/nutricion/objetivos.tsx
git commit -m "feat(nutricion): objetivos en g/kg con perfil normal y de ciclado

Se escribe el ratio y se lee el gramaje debajo, para no tener que confiar
en la cuenta a ciegas."
```

---

## Task 12: El switch de ciclado en el diario

**Files:**
- Modify: `app/nutricion/index.tsx`

**Interfaces:**
- Consumes: `fetchDay`, `setDayProfile` (Tarea 10); `PROFILE_LABELS` (Tarea 9).

- [ ] **Step 1: Estado del perfil y del peso**

`load()` ahora recibe `profile` y `weightKg` de `fetchDay`. Guardarlos en estado junto a `goals`, que pasa a ser `Record<GoalField, number | null>` en vez de la fila cruda.

- [ ] **Step 2: El switch**

Debajo del navegador de fecha, una fila con `<Switch>` de React Native:

```tsx
<View style={s.cycleRow}>
  <View style={s.cycleInfo}>
    <Text style={s.cycleTitle}>Día de ciclado de carbos</Text>
    <Text style={s.cycleSub}>
      {profile === 'ciclado'
        ? 'Los objetivos de abajo son los del día de ciclado.'
        : 'Prendelo para cambiar a los objetivos de ciclado.'}
    </Text>
  </View>
  <Switch
    value={profile === 'ciclado'}
    onValueChange={handleToggleCycle}
    trackColor={{ false: colors.surfaceSecondary, true: colors.accent }}
  />
</View>
```

- [ ] **Step 3: El handler**

```tsx
const handleToggleCycle = async (on: boolean) => {
  const next: GoalProfile = on ? 'ciclado' : 'normal';
  // Optimista: el switch tiene que responder al dedo, no a la red.
  setProfile(next);
  const { error } = await setDayProfile(day, next);
  if (error) {
    setProfile(on ? 'normal' : 'ciclado');
    Alert.alert('No se pudo cambiar el día', error);
    return;
  }
  load();
};
```

- [ ] **Step 4: Las barras usan el objetivo resuelto**

`activeGoals` pasa a filtrar sobre el objeto resuelto:

```tsx
const activeGoals = GOAL_FIELDS.filter((f) => goals[f] != null);
```

y el `<MacroBar>` recibe `goal={goals[f]}`.

- [ ] **Step 5: El caso sin pesaje**

Si `weightKg === null` y hay algún macro por kilo definido, mostrar sobre las barras:

```tsx
<TouchableOpacity onPress={() => router.push('/nutricion/peso')}>
  <Text style={s.noWeight}>
    Registrá tu peso para ver los objetivos de proteína, carbos y grasa →
  </Text>
</TouchableOpacity>
```

Las barras de calorías y fibra se muestran igual: no dependen del peso.

- [ ] **Step 6: `AddEntryModal` recibe el objetivo resuelto**

El prop `goals` del modal y de `ImpactPreview` cambia de `NutritionGoals | null` a `Record<GoalField, number | null>`. Dentro de `impact-preview.tsx`, reemplazar `goals?.[f] ?? null` por `goals[f] ?? null` y el filtro `withGoal` por `GOAL_FIELDS.filter((f) => goals[f] != null)`.

- [ ] **Step 7: Verificar**

```bash
npx tsc --noEmit && npx expo lint && npm test
```

Probar: prender el switch en el día de hoy y confirmar que las barras cambian de meta; ir al día anterior y confirmar que **sigue en normal**; volver a hoy y confirmar que siguió en ciclado. Después:

```sql
select logged_on, goal_profile from public.nutrition_days order by logged_on;
```

Apagar el switch y confirmar que la fila **desaparece**.

- [ ] **Step 8: Commit**

```bash
git add app/nutricion/index.tsx components/nutricion/add-entry-modal.tsx components/nutricion/impact-preview.tsx
git commit -m "feat(nutricion): switch de día de ciclado en el diario

El switch va en cualquier fecha, no solo hoy: marcar ayer cuando uno se
olvidó es el caso normal, no la excepción."
```

---

## Task 13: Estadísticas comparan contra el objetivo de cada día

**Files:**
- Modify: `app/nutricion/estadisticas/_lib/actions.ts`
- Modify: `app/nutricion/estadisticas/_lib/types.ts`
- Modify: `app/nutricion/estadisticas/_components/goal-meters.tsx`

**Interfaces:**
- Consumes: RPC `nutrition_day_goals` y el tipo `NutritionDayGoal` (Tarea 8).

- [ ] **Step 1: Traer los objetivos del rango**

En `actions.ts`, agregar al `Promise.all` que ya existe:

```ts
supabase.rpc('nutrition_day_goals', { p_from: from, p_to: to }),
```

- [ ] **Step 2: Promediar el objetivo**

Promediar cada macro **solo sobre los días que tienen objetivo definido**, y contar cuántos fueron de ciclado:

```ts
/**
 * El objetivo promedio del período. No es el objetivo de hoy: si en el medio
 * hubo días de ciclado o el peso se movió, la meta contra la que se comió no
 * fue una sola. Promediarla es lo único que hace comparable un promedio de
 * consumo contra ella.
 */
function averageGoal(days: NutritionDayGoal[]): {
  goal: Record<GoalField, number | null>;
  cycleDays: number;
} {
  const goal = Object.fromEntries(GOAL_FIELDS.map((f) => [f, null])) as Record<
    GoalField,
    number | null
  >;
  for (const field of GOAL_FIELDS) {
    const values = days.map((d) => d[field]).filter((v): v is number => v != null);
    if (values.length > 0) {
      goal[field] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    }
  }
  return { goal, cycleDays: days.filter((d) => d.profile === 'ciclado').length };
}
```

- [ ] **Step 3: Las barras lo dicen**

En `goal-meters.tsx`, el prop `goals` pasa a `Record<GoalField, number | null>`. El `hint` de la `Section` suma los días de ciclado cuando los hay:

```tsx
hint={cycleDays > 0
  ? `${daysComplete} días completos · ${cycleDays} de ciclado`
  : `${daysComplete} días completos`}
```

- [ ] **Step 4: Verificar**

```bash
npx tsc --noEmit && npx expo lint
```

Con un solo día de ciclado en el rango, el objetivo promedio de carbos tiene que quedar **entre** el normal y el de ciclado, no igual a ninguno de los dos.

- [ ] **Step 5: Commit**

```bash
git add app/nutricion/estadisticas/
git commit -m "feat(nutricion): las barras comparan contra el objetivo de cada día

Con dos perfiles y un peso que se mueve, la meta del período no es una
sola. El promedio del objetivo es lo único comparable contra el promedio
de consumo."
```

---

## Task 14: Actualizar las consultas de las skills

**Files:**
- Modify: `.claude/skills/analisis-progreso/consultas.sql`
- Modify: `.claude/skills/analisis-progreso/SKILL.md`
- Modify: `.claude/skills/reporte-nutricion/SKILL.md`

**Interfaces:**
- Consumes: vista `nutrition_goals_current` (Tarea 8).

- [ ] **Step 1: `consultas.sql`**

En la línea 92, reemplazar:

```sql
), g as (select * from nutrition_goals where user_id = :'uid')
```

por:

```sql
-- La vista resuelve los g/kg contra el último pesaje: la tabla ya no guarda
-- gramos absolutos. 'normal' porque es contra lo habitual que se mide la
-- adherencia; los días de ciclado están en nutrition_days.
), g as (select * from nutrition_goals_current where user_id = :'uid' and profile = 'normal')
```

Revisar las líneas 101-103, que agrupan por `g.energy_kcal, g.protein_g`: los nombres de columna **no cambian** gracias a la vista, así que el resto de la consulta queda igual.

- [ ] **Step 2: `reporte-nutricion/SKILL.md`**

En la línea 56, reemplazar:

```sql
select energy_kcal, protein_g, carbs_g, fat_g, fiber_g from public.nutrition_goals;
```

por:

```sql
select energy_kcal, protein_g, carbs_g, fat_g, fiber_g
  from public.nutrition_goals_current where profile = 'normal';
```

- [ ] **Step 3: `analisis-progreso/SKILL.md`**

En la tabla de la línea 95, reemplazar la descripción de `nutrition_goals` por una que diga que ahora hay dos perfiles, que los macros se guardan en g/kg, que la vista `nutrition_goals_current` los devuelve resueltos, y que `nutrition_days` dice qué día fue de ciclado. Mantener la advertencia que ya está («es una meta puesta a mano, no un gasto medido»).

En la línea 97, actualizar la descripción de `workout_logs`: `reps` y `weight` pueden ser null en los ejercicios de cardio, y `duration_seconds` tiene los segundos.

En la línea 265, aclarar que el conteo por `muscle_group` excluye `'Cardio'`.

- [ ] **Step 4: Verificar**

Correr las dos consultas modificadas contra la base. Tienen que devolver las mismas columnas y valores equivalentes a los de antes de la migración (±1 g por el redondeo).

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/
git commit -m "docs(skills): leer objetivos desde nutrition_goals_current

La tabla ya no guarda gramos absolutos. La vista los devuelve resueltos con
los mismos nombres de columna, así que el resto de las consultas no cambia."
```

---

## Task 15: Verificación final

**Files:** ninguno. Es la puerta antes de publicar.

- [ ] **Step 1: La suite completa**

```bash
npx tsc --noEmit && npx expo lint && npm test
```

Esperado: sin errores, 24 tests en verde.

- [ ] **Step 2: El histórico no se movió**

```sql
select count(*) from public.workout_logs;    -- 502 + las series de prueba
select count(*) from public.nutrition_logs;  -- 401
select count(*) from public.body_weight_logs;-- 32
select count(*) from public.food_products;   -- 101
```

- [ ] **Step 3: Los advisors de Supabase**

```
mcp__supabase__get_advisors(type: "security")
```

La vista nueva es el candidato a aparecer acá. Si sale un `security_definer_view`, falta el `with (security_invoker = true)`.

- [ ] **Step 4: El recorrido a mano**

1. Crear un ejercicio de cardio en modo tiempo, meterlo en un día, registrar minutos.
2. Confirmar que Estadísticas lo muestra en minutos, **no** en Balance por grupo y **no** en Récords.
3. Prender el ciclado en un día y ver cambiar las barras; apagarlo y ver volver.
4. Cambiar un g/kg en Objetivos y ver moverse el gramaje del diario.
5. Confirmar la F de fibra en diario, catálogo y receta.

- [ ] **Step 5: Publicar**

Las migraciones ya están aplicadas. El JS va por OTA — no se toca `version` en `app.json`, así que el runtime sigue en 1.1.0 y el update alcanza a los builds instalados:

```bash
eas update --branch preview -m "Cardio como ejercicio, objetivos en g/kg con ciclado, fibra en la UI"
```

---

## Cobertura contra la spec

| Sección de la spec | Tarea |
|---|---|
| Esquema de cardio (`tracking_mode`, `duration_seconds`, nullable) | 2 |
| `lib/tracking-mode.ts` | 3 |
| `lib/muscle-groups.ts` partido + formulario + `createExercise` | 4 |
| Registro serie por serie según el modo | 5 |
| `exercise_stats`, `training_summary`, `previous_sets`, `export_training_data` | 6 |
| `stat-card` en minutos | 7 |
| Perfiles + g/kg + `nutrition_days` + vista + `nutrition_day_goals` | 8 |
| `lib/nutricion/objetivos.ts` | 9 |
| `diario.ts` con perfil y peso | 10 |
| Pantalla de objetivos con dos perfiles | 11 |
| Switch de ciclado | 12 |
| Estadísticas por día | 13 |
| Skills apuntando a la vista | 14 |
| Fibra en los cuatro renglones | 1 |
