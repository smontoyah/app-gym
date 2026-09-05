---
name: analisis-progreso
description: Analiza los datos reales de la app (diario de nutrición, registros de gimnasio, cardio, peso corporal y catálogo de alimentos) para responder preguntas de progreso, diagnóstico o auditoría. Usar cuando se pida "un diagnóstico", "qué está pasando con mi peso", "revisa mis datos", "estoy progresando?", "audita el catálogo", "por qué no bajo/subo", o cualquier pregunta que se conteste mirando lo registrado. NO es para generar el PDF del coach — eso es `reporte-nutricion`.
---

# Análisis de progreso sobre los datos de la app

Esta skill responde preguntas con los datos que Sebastián lleva registrando a
diario. El estándar no es "sacar unas cifras": es **un diagnóstico de nivel
experto, con la incertidumbre declarada**, que aguante que él lo discuta.

Antes de empezar, lee `bitacora.md` (en esta misma carpeta). Ahí está lo
calibrado en análisis anteriores: rangos de gasto ya acotados, hipótesis ya
descartadas y errores ya cometidos. **Sin eso vas a repetir conclusiones que ya
se refutaron.** Al terminar, actualízala (§7).

---

## 1. Reglas de la casa — no negociables

**a) Filtra siempre por `user_id`.** El MCP entra con service role: la RLS no
aplica y en la base hay 4 usuarios. Sin el filtro mezclas datos de otras
personas. El usuario es:

```
345f2fa2-eedc-481d-ba93-4f186fab0094   -- smontoyah99@gmail.com
```

**b) No llames los RPCs por MCP.** `nutrition_summary`, `training_summary`,
`exercise_stats`, `export_training_data` y `previous_sets` son todos
`security invoker` y se apoyan en `auth.uid()`, que bajo service role es null:
devuelven vacío sin error. Usa SQL directo (ver `consultas.sql`). Si de verdad
necesitas probar un RPC como lo ve la app, simula el JWT dentro de una
transacción — está en la nota de memoria `supabase-mcp-tools-not-bound`.

**c) Para nutrición usa la vista `nutrition_log_macros`, nunca un join a mano
contra `food_products`.** La vista resuelve productos **y recetas**; un join
manual descarta en silencio cualquier renglón que venga de una receta. Hoy no
hay recetas, pero el día que las haya el error es invisible.

**d) Zona horaria `America/Bogota`.** `logged_on` y `workout_date` son fechas
locales ya resueltas por la app; `created_at` y `measured_at` son `timestamptz`
y hay que convertirlos. Un `created_at::date` crudo mueve toda cena a "el día
siguiente" y produce conclusiones falsas sobre desfase de registro.

**e) Separa días completos de días con hueco.** Un día al que le falta un
tiempo de comida no es un día de poca comida: es un día mal medido. Métrico
por defecto: **día completo = tiene los 4 tiempos** (`desayuno`, `almuerzo`,
`cena`, `snack`); alternativo, ≤3 ítems es registro abandonado. Los promedios
se calculan **solo con días completos**, y el conteo de días con hueco se
reporta aparte. Mezclarlos hunde la media y hace mentir al análisis.

**f) El día en curso no promedia.** `logged_on = hoy` está a medias por
definición.

---

## 2. Entrenamiento: la regla que más se ha equivocado

> **`routines` y `cardio_plan` son una plantilla de la app, no un compromiso.**

Nunca calcules adherencia como `sesiones / días planeados`, ni digas
"el plan pide 6 días y solo hay 2". Eso ya se dijo una vez y estuvo mal.

- **Sebastián entrena 4 veces por semana, por decisión propia.** Ese es el
  denominador real.
- La frecuencia se mide contando `workout_date` distintos en `workout_logs`.
  **Cuentan los ejercicios registrados, no los días que "debería" ir.**
- **`cardio_logs`: la ausencia es dato — pero solo desde el 2026-09-05.**
  Ese día Sebastián se comprometió a anotar todo el cardio que haga: *"si no
  está anotado es porque no lo hice"*. Siempre es **caminata inclinada**.
  Desde esa fecha se puede leer la ausencia como cero.
  **Antes del 2026-09-05 la ausencia es ambigua** y no se debe interpretar: las
  2 filas de agosto no significan que incumpliera nada. Nunca aplicar la regla
  nueva a datos viejos.
- Sigue en pie: **`cardio_plan` no es compromiso.** Lo que se cuenta es
  `cardio_logs`, no las 7 filas del plan.
- Las 6 filas de `routines` por día y las 7 de `cardio_plan` son el molde con el
  que la app arma la pantalla del día. Sirven para saber *qué* ejercicio tocaba
  y con qué prescripción (`target_reps`, `rest_seconds`, `cadence`,
  `superset_group`), no para juzgar cumplimiento.

Lo mismo aplica a `training_phases`: describe el bloque vigente
(`rpe_target`, `rir_target`, `method`), no una obligación.

---

## 3. El mapa de la app

| Tabla / vista | Qué es | Trampa |
|---|---|---|
| `nutrition_logs` | Un renglón por alimento comido. `quantity_g` **siempre** en gramos de la forma base del producto | `product_id` y `recipe_id` son ambos nullable; un renglón sin ninguno suma 0 en silencio |
| `nutrition_log_macros` | **Úsala.** Vista que resuelve macros por renglón, productos y recetas | — |
| `food_products` | Catálogo. Macros **por 100 g** de la forma que declara `base_state` | `verified` se pone en `true` cada vez que se guarda el formulario: **no sirve como marca de "revisado"**. Para marcar un estimado, usa `note` en el log |
| `nutrition_goals` | Meta vigente (una fila) | Es una meta *puesta a mano*, no un gasto medido. **Los 2.000 kcal son deliberados y correctos — no proponer subirlos a los 2.399 de Ciro.** Ver §7 |
| `body_weight_logs` | Peso. `measured_at` es timestamptz | El árbitro de todo. Ver §5 |
| `workout_logs` | Una fila **por serie**: `reps`, `weight`, `rpe` | `rpe` puede ser null en parte de las series; es normal, no es pérdida de datos |
| `exercises` | Catálogo acumulativo, nunca se borra | `instructions` e `image_url` vienen del dataset de referencia |
| `routines`, `cardio_plan`, `training_phases` | Plantilla y prescripción | **No son compromiso.** Ver §2 |
| `cardio_logs` | Cardio efectivamente anotado | Ver §2 |
| `recipes`, `recipe_items`, `recipe_nutrition` | Recetas compuestas | Hoy vacías. La vista de macros ya las contempla |
| `ocr_usage` | Cupo diario de escaneos | Irrelevante para análisis |

**Cómo se calculan las macros:** `macro_por_100g × quantity_g / 100`. Nada más.
La conversión crudo↔cocido ya ocurrió *antes* de guardar: `quantity_g` está en
la forma base y `logged_state` solo recuerda en qué forma se pesó, para poder
mostrarlo. Detalle en `lib/nutricion/coccion.ts`.

**Regla de pesaje del plan de Ciro** (memoria `plan-nutricional-ciro-pesaje`):
todo se pesa crudo **excepto** arroz, pastas, plátano maduro y leguminosas, que
van cocidos. Si un producto no dice la forma en el nombre, sospecha.

---

## 4. El procedimiento

Corre lo de `consultas.sql` en este orden. No saltes al análisis con una sola
consulta: casi todos los hallazgos buenos han salido de **cruzar** dos series.

1. **Cobertura** — rango, días con datos, días con hueco, cuáles. Sin esto no
   sabes qué tan sólido es lo que sigue.
2. **Serie diaria de nutrición** — kcal y macros por día, con marca de completo.
3. **Peso** — la serie, y **su intervalo de confianza** (§5). Obligatorio.
4. **Cruce peso × calorías** — el chequeo más revelador que existe aquí.
5. **Entrenamiento** — sesiones reales, series, e1RM por ejercicio, RPE.
6. **Sanidad del catálogo** — nulls y control de Atwater, solo si la pregunta
   toca los números de los alimentos.

**Control de sanidad que va siempre:** si un producto usado tiene `energy_kcal`
o alguna macro en null, sus calorías desaparecen de la suma sin avisar. Si
aparece alguno, dilo antes de cualquier conclusión.

---

## 5. La capa experta

Esto es lo que separa un resumen de un diagnóstico.

### Balance energético

- **7.700 kcal ≈ 1 kg** de tejido graso.
- **Si el peso está plano, la ingesta real es igual al gasto real.** No hay
  vuelta. Esa identidad es la herramienta más potente disponible, porque no
  depende de creerle al diario.
- **`nutrition_goals` no es el gasto.** Es un número puesto a mano. Compararse
  contra él no dice nada sobre si se sube o se baja de peso; solo dice si se
  cumplió una meta arbitraria. Dilo explícitamente cuando aplique.

**Estimar el gasto (TDEE).** La app **no guarda estatura, edad ni sexo**, así
que no hay forma de calcular un basal exacto. Pídelos si la pregunta lo exige;
si no, acota:

- Basal (Mifflin-St Jeor) para ~78 kg según estatura/edad: **1.620–1.785 kcal**.
- Multiplicador de actividad **para este perfil** (trabajo sentado, 4 sesiones
  de pesas por semana, cardio casi nulo): **1,35–1,50**. **No uses 1,55–1,65** —
  ese error ya se cometió y sobrestimó el gasto en ~400 kcal/día.
- Una sesión de pesas de ~60 min a ~19 series quema **250–350 kcal netas**,
  no 500–600. Es el error de intuición más común del tema.
- TDEE resultante para este perfil: **≈ 2.200–2.500 kcal**.

### El cardio en la cuenta energética

Caminata inclinada ≈ 7 METs. Neto sobre el reposo:
`(MET − 1) × 3,5 × kg / 200` ≈ **8 kcal/min** a 78 kg. El plan completo (95
min/semana) daría ~760 kcal/semana ≈ **110 kcal/día**.

**No sumar el cardio planeado al gasto.** Se suma el cardio *registrado*, y solo
cuando la báscula lo confirma. Meter en el TDEE una actividad que quizá no
ocurra es la forma más fácil de fabricar un déficit que no existe.

**Aviso que hay que dar al retomar cardio:** la primera semana de una actividad
nueva suele traer un repunte de peso de 0,3–0,7 kg por inflamación y retención,
que **no es grasa**. Si no se advierte antes, se lee como "el plan no funciona".

### El límite de lo que la báscula puede resolver

**Nunca afirmes un hueco calórico mayor del que el intervalo de confianza del
peso permite.** Este es el error más grave que se ha cometido en esta skill.

Calcula siempre el IC 95 % de la pendiente (SQL en `consultas.sql`, bloque C2) y
tradúcelo a kcal/día. Con ~16 mediciones y ruido diario de 0,25 kg, el intervalo
es de **±0,2 kg/semana ≈ ±220 kcal/día**: con dos semanas y media de datos
simplemente **no se puede distinguir** un déficit de 200 kcal de un superávit de
200. Decirlo es parte del diagnóstico, no una excusa.

Regla práctica: para cerrar el intervalo a ±50 kcal/día hacen falta **unas 6
semanas** de pesaje diario. Si la pregunta requiere más precisión de la que hay,
la respuesta correcta es "todavía no se puede saber, y esto es lo que falta".

### Los amortiguadores — qué pueden y qué no

Cuando el peso no se mueve y las cuentas no cuadran, siempre sale la pregunta
del glucógeno. La respuesta:

- **Glucógeno**: capacidad total ~400–500 g muscular + ~100 g hepático. De medio
  lleno a lleno son ~250 g + ~750 g de agua ≈ **1 kg, una sola vez**, y satura
  en **24–72 h**. Para cargarlo hacen falta **5–7 g de carbohidrato por kg**;
  por debajo de ~3 g/kg no hay motor. **No puede tapar un déficit sostenido**,
  porque el déficit es acumulativo y el búfer es de una sola carga.
- **Músculo**: 0,25–0,5 kg al mes en el mejor caso para alguien no novato. Sobre
  2–3 semanas, ≤0,3 kg. Fuerza que sube ≠ masa que sube: el primer mes es
  adaptación neural.
- **Agua, sodio y contenido intestinal**: ±0,3–0,5 kg de ruido día a día, sin
  tendencia.

**Techo combinado: los amortiguadores absorben ~200 kcal/día sobre 2–3 semanas.
Ni uno más.** Un hueco de 800 kcal/día no se explica así; uno de 200, sí.

**Cómo refutar la hipótesis del glucógeno con datos** (no con teoría): parte la
serie de peso en dos mitades. Una carga de glucógeno es *front-loaded* — sube en
la semana 1 y luego el déficit asoma como caída en las semanas 2–3. Si la
segunda mitad no cae, la hipótesis está muerta. Revisa también si los
carbohidratos vienen subiendo; sin motor no hay carga.

### Subregistro

La literatura da **20–40 %** de subregistro en diarios autoreportados, incluso
con gente honesta. Pero:

> **Sebastián registra con rigor y honestidad. Está establecido en varias
> sesiones. No abras un diagnóstico suponiendo lo contrario.**

El hueco, cuando existe, está en **medición**, no en omisión. Por orden de
tamaño típico:

1. **Grasa de cocción** — la fuga más grande y la que él mismo reconoce.
   Una cucharada rasa = 10 g = 90 kcal.
2. **Comidas no registrables** (restaurante, casa ajena). Un kebab son ~590 kcal;
   prorrateado sobre el mes pesa más que cualquier otra partida.
3. **Tolerancia legal de etiqueta**: ±20 %, y los fabricantes declaran bajo.
4. **Forma crudo/cocido mal elegida** — ver el catálogo, abajo.
5. **Tamaño real de la unidad**: el huevo del USDA son 50 g (equivale a un huevo
   colombiano **A**); un **AA** son ~55 g. Un scoop copeteado carga 35–40 g, no 30.

Lo que **no** hay que ir a buscar: picoteo, bebidas azucaradas, endulzantes.
Toma café con leche (la leche la anota), stevia y agua. Ya se verificó.

### Auditoría del catálogo

- **Control de Atwater**: `4·P + 4·C + 9·G` contra `energy_kcal`. Una diferencia
  negativa de tamaño ≈ `4 × fibra` es normal (la etiqueta cuenta la fibra como
  carbohidrato pero no como energía). Diferencias que no se expliquen así, sí
  son sospechosas.
- **`cooked_yield_pct`** = gramos cocidos por cada 100 g crudos. Referencias:
  pechuga ~71, carne molida ~73, pasta **220–240** (no 350), arroz ~260,
  arepa ~88. Un valor mal puesto no hace daño mientras se pese en la forma base
  — es una mina que estalla el día que se pese en la otra forma.
- **Falta `base_state` o `cooked_yield_pct`** ⇒ el usuario *no puede* anotar en
  la otra forma aunque quiera. Es una limitación, no un error de datos.
- **Redondez de las cantidades**: qué proporción de `quantity_g` cae en
  múltiplos de 10 o de 50. Mucha redondez sugiere cifras tecleadas; mucha
  variación sugiere balanza. Es una señal débil — **no acuses con ella sola**.

### Entrenamiento

- **La métrica de progresión es el e1RM, no el peso ni el tonelaje.** Epley:
  `peso × (1 + reps/30)`. El tonelaje confunde progreso con hacer más
  repeticiones; el peso solo ignora que se hicieron 6 en vez de 12.
- **Estancamiento** = mismo e1RM en 3+ sesiones seguidas.
- **Retroceso**: mira el RPE antes de llamarlo así. Peso abajo **con RPE alto**
  = fatiga real. Peso abajo **con RPE bajo** = casi siempre cambio de máquina,
  de agarre o reseteo técnico deliberado. No son lo mismo.
- **RPE > 9 sostenido** a lo largo de un bloque pide descarga.
- **Volumen**: 10–20 series duras por grupo muscular por semana es el rango
  productivo. Cuenta por `muscle_group` sobre semanas reales.
- Ejercicios que aparecen 1–2 veces no dan para conclusión de progresión. Exige
  ≥3 sesiones.

---

## 6. Cómo se escribe la respuesta

- **Declara la incertidumbre en el mismo renglón que la afirmación.** "Te faltan
  ~700 kcal" está mal; "el hueco está entre 340 y 800, centrado en ~500" está
  bien.
- **Distingue lo que dicen los datos de lo que estimas tú.** El peso plano es un
  dato. El TDEE es un estimado con supuestos. No los presentes igual.
- **Cruza antes de concluir.** Un promedio solo casi nunca es un hallazgo.
- **Si él discute una conclusión, recalcula de verdad** — no la defiendas ni la
  retires por cortesía. Ya pasó una vez que tenía razón y el número había que
  corregirlo hacia abajo.
- **Si los datos no alcanzan, dilo y di qué falta.** "Con 17 días no se puede
  resolver esto; con 6 semanas sí" es una respuesta completa y útil.
- Escribe en español, con las cifras en tablas cuando sean más de tres.

---

## 7. El rol de coach nutricional

Desde el 2026-09-04 Sebastián pidió explícitamente que este rol lo asuma yo. Eso
cambia el estándar: no basta describir los datos, hay que **decidir** — ajustar
o esperar — y decir cuándo los datos no alcanzan para decidir.

**Frontera:** se trabaja sobre sus números. Nada clínico (sangre, digestivo,
lesiones) — eso va a un profesional que lo examine. El protocolo de
entrenamiento de Ciro y sus mediciones de pliegues son buen material; no hay
razón para descartarlos.

### La trampa central — leerla antes de tocar cualquier meta

> **El número de la meta no es lo que comió. Y perseguir el número de la app,
> con un registro que lee bajo, lo hace comer de más.**

```
Meta 2.000 en la app  +  registro que lee 650 bajo  =  2.650 reales → superávit
Meta 2.399 en la app  +  el mismo error             =  3.050 reales → peor
```

Corolario: **mientras el registro no esté calibrado, subir o bajar la meta no
arregla nada.** Primero el instrumento, después el número. Y nunca aplicar un
factor de corrección ("si dice 1.300 voy en 2.000"): el hueco no es constante,
depende de cuánto aceite llevó el plato y de si comió por fuera.

### La meta vigente y por qué

| | Valor | Razón |
|---|---|---|
| Calorías | **2.000** | Déficit de ~16 % sobre un gasto de ~2.380 ⇒ 0,35–0,45 kg/semana, el rango que conserva masa magra |
| Proteína | **165 g** | 2,1 g/kg de peso; ≈2,6 g/kg de masa magra |
| Carbohidratos | **180 g** | El resto del presupuesto |
| Grasa | **65 g** | Piso hormonal (~0,8 g/kg). **No bajar de aquí** |
| Fibra | **30 g** | Venía sin meta y en 15 g reales. Único hueco nutricional de fondo |

Puesta el 2026-09-04. **No moverla hasta que el registro esté calibrado.**

### Protocolo vigente: 4 semanas de calibración (desde el 2026-09-04)

**Semanas 1–2 — cerrar el registro.** El objetivo NO es bajar de peso, es
calibrar el instrumento: anotar el aceite siempre, toda comida por fuera como
estimada (patrón del kebab, desglose en `note`), y la ensalada aunque parezca
despreciable — por la fibra, no por las calorías.

**Semanas 3–4 — leer la respuesta.** Apuntar a 2.000 con el registro ya
cerrado, pesarse diario, **no tocar ninguna variable**. Al cierre la báscula
arbitra:

- Bajó ~1,4 kg en 4 semanas ⇒ el 2.000 es correcto, seguir.
- No se movió ⇒ el gasto es menor de lo calculado, bajar a **1.850**.
- Bajó mucho más de 2 kg ⇒ el déficit quedó grande, subir a 2.150.

Si cambia variables a mitad, el reloj estadístico vuelve a cero: decírselo.

### La revisión semanal

Es el entregable recurrente. Bundle `F1` de `consultas.sql`. Se mira:

1. **Tendencia de peso con su IC** — y si el IC todavía no resuelve, decirlo.
2. **Promedio de días completos contra 2.000**, y cuántos días quedaron con hueco.
3. **Proteína en g/kg** y **fibra** — las dos metas de calidad.
4. **Días con grasa de cocción anotada** — el termómetro de si el registro se
   está cerrando. Es la métrica de proceso de estas 4 semanas.
5. **e1RM de los ejercicios estancados** (§5) — para avisar de subcarga o de
   necesidad de descarga.

Cierra siempre con **una** decisión: ajustar, esperar, o "los datos aún no dan".

## 8. Cómo crece esta skill

**Al cerrar cada análisis, actualiza `bitacora.md`.** Es lo que hace que la
próxima consulta arranque de más arriba. Anota:

- **Constantes calibradas** que se estrecharon (rango de TDEE, ruido de la
  báscula, tamaño real de una porción).
- **Hipótesis descartadas**, con el argumento que las mató — para no volver a
  proponerlas.
- **Correcciones**: cualquier conclusión previa que resultó mal, y por qué.
- **Hechos del usuario** que no están en la base (frecuencia real de gimnasio,
  qué toma, marca de huevo, si pesa crudo o cocido).
- **Preguntas abiertas** que hagan falta para el próximo diagnóstico.

Si un hallazgo es estructural sobre cómo funciona la app o el plan, va además a
memoria como nota `project` o `feedback`, no solo a la bitácora.

Si aparece una consulta nueva que valga la pena, agrégala a `consultas.sql` con
un comentario de qué contesta.
