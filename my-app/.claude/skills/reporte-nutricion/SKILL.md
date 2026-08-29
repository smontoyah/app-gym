---
name: reporte-nutricion
description: Genera el PDF de una página con la analítica de nutrición del diario (calorías diarias contra meta, macros, peso, comidas y alimentos que más aportan) para un rango de fechas. Usar cuando se pida "el informe de nutrición", "el reporte para el coach", "la analítica de lo que comí", o cualquier variante con un rango ("de esta semana", "de septiembre", "de los últimos 30 días").
---

# Informe de nutrición en PDF

Reproduce **el mismo informe de una página** cambiando solo el rango de fechas.
La maqueta, la geometría de los gráficos y el render viven en `report.js` y no se
tocan; lo que cambia en cada corrida son los datos y el texto de análisis.

## Qué NO cambiar

`report.js` está afinado para caber en **una sola hoja A4**. Si agregas secciones,
se desborda a dos páginas. Antes de tocarlo, confirma con el usuario.

Decisiones de diseño que ya se tomaron y conviene respetar:

- **Una sola serie de color** (azul `#2a78d6`, slot categórico 1). Todo lo demás va
  en tokens de texto. No introducir una paleta categórica: las barras codifican
  magnitud, no identidad.
- **Etiquetas directas selectivas**, no un número sobre cada barra: solo el máximo,
  el mínimo y los días incompletos. En el gráfico de peso, solo el punto final —
  en el arranque la etiqueta choca con el rótulo del eje.
- **Los días incompletos se rayan, no se borran.** Un hueco sin explicar genera una
  pregunta del coach; la barra rayada más el pie ya la responden.

## Pasos

### 1. Resolver el rango

Convierte lo que pidió el usuario a dos fechas ISO. Si no dijo rango, pregunta —
no asumas "el último mes". Ojo con la fecha de hoy: `logged_on` es fecha **local**
del usuario, no UTC.

### 2. Traer los datos

Vía la herramienta MCP de Supabase `execute_sql`. Sustituye `:from` y `:to`.
Si el MCP no expone las tools, ver la nota de memoria sobre enrutar por `claude -p`.

```sql
-- A. Totales por día (la serie principal)
select l.logged_on,
       count(*) as items,
       round(sum(p.energy_kcal * l.quantity_g / 100.0)) as kcal,
       round(sum(p.protein_g   * l.quantity_g / 100.0)) as protein,
       round(sum(p.carbs_g     * l.quantity_g / 100.0)) as carbs,
       round(sum(p.fat_g       * l.quantity_g / 100.0)) as fat,
       round(sum(p.fiber_g     * l.quantity_g / 100.0)) as fiber
from public.nutrition_logs l
join public.food_products p on p.id = l.product_id
where l.logged_on between ':from' and ':to'
group by l.logged_on order by l.logged_on;

-- B. Meta vigente
select energy_kcal, protein_g, carbs_g, fat_g, fiber_g from public.nutrition_goals;

-- C. Promedio por tiempo de comida
select l.meal,
       count(distinct l.logged_on) as dias,
       round(sum(p.energy_kcal * l.quantity_g/100.0) / count(distinct l.logged_on)) as kcal_prom,
       round(sum(p.protein_g   * l.quantity_g/100.0) / count(distinct l.logged_on)) as prot_prom
from public.nutrition_logs l
join public.food_products p on p.id = l.product_id
where l.logged_on between ':from' and ':to'
group by l.meal order by kcal_prom desc;

-- D. Alimentos que más aportan
select p.name, p.brand,
       count(distinct l.logged_on) as dias,
       round(sum(l.quantity_g)) as g_total,
       round(sum(p.energy_kcal * l.quantity_g/100.0)) as kcal_total
from public.nutrition_logs l
join public.food_products p on p.id = l.product_id
where l.logged_on between ':from' and ':to'
group by p.id, p.name, p.brand
order by kcal_total desc limit 8;

-- E. Peso corporal
select measured_at::date as fecha, weight_kg
from public.body_weight_logs
where measured_at::date between ':from' and ':to'
order by measured_at;
```

**Control de sanidad antes de seguir:** si algún producto tiene macros en null, sus
calorías se pierden en la suma sin avisar. Verifícalo:

```sql
select distinct p.name from public.nutrition_logs l
join public.food_products p on p.id = l.product_id
where l.logged_on between ':from' and ':to'
  and (p.energy_kcal is null or p.protein_g is null or p.carbs_g is null or p.fat_g is null);
```

Si devuelve filas, dilo en el informe: los promedios están subestimados.

### 3. Marcar días incompletos y calcular promedios

Un día con **3 ítems o menos** casi siempre es un registro abandonado, no un día de
ayuno. Márcalo `partial: true` y **exclúyelo de todos los promedios** — si entra,
hunde la media y el informe miente. Los días del rango **sin ningún registro** van en
`days` con `kcal: null` (el gráfico deja el hueco visible) y tampoco promedian.

Usa tu criterio: si el usuario dice que ese día sí comió poco de verdad, no lo marques.

### 4. Escribir el JSON

En el scratchpad de la sesión. Contrato:

```jsonc
{
  "meta": { "userName": "Sebastián Montoya", "rangeLabel": "Registro del 18 al 28 de agosto de 2026",
            "generatedOn": "29 ago 2026", "totalLogs": 101, "daysWithData": 10 },
  "goal": { "kcal": 2000, "protein": 160, "carbs": 190, "fat": 65 },
  "averages": { "kcal": 1546, "protein": 137, "carbs": 134, "fat": 52, "fiber": 13 },
  // un objeto por día del rango, incluidos los que no tienen registro
  "days": [{ "date": "2026-08-18", "dayNum": "18", "dow": "mar", "kcal": 1672, "partial": false }],
  "kpis": [{ "label": "Promedio diario", "value": "1.546", "unit": "kcal", "note": "9 días completos" }],
  "meals": [{ "name": "Almuerzo", "kcalPerDay": 596, "proteinPerDay": 50 }],
  "foods": [{ "name": "Pechuga de pollo (cruda)", "kcal": 2417, "days": 7 }],
  "weights": [{ "dayNum": "19", "kg": 78.2 }],
  "flag":  { "title": "Titular del hallazgo.", "body": "Dos o tres frases. Admite <b>HTML</b>." },
  "notes": ["<b>Viñeta:</b> texto."],
  "captions": { "daily": "", "macros": "", "weight": "", "meals": "", "foods": "", "method": "" }
}
```

Reglas de contenido:

- **`kpis`: exactamente 4.** Con más, la fila se aprieta y el número deja de leerse.
  Los cuatro por defecto: promedio diario, proteína (con g/kg de peso), adherencia a
  la meta (% y déficit absoluto) y peso al cierre.
- **`foods`: máximo 8**, con nombres cortos — la columna es de 150 px y trunca.
  Acorta "Pechuga de pollo, sin piel (cruda)" a "Pechuga de pollo (cruda)", pero
  **conserva la forma** (cruda/cocida): el peso del plan depende de eso.
- **`captions.method`** siempre cierra con la metodología: origen de los datos, que
  las macros salen del valor por 100 g × cantidad, que las proteínas se pesan en
  crudo y arroz/pasta/maduro/leguminosas en cocido, y qué días se excluyeron.

### 5. El análisis se escribe cada vez, no se copia

`flag` y `notes` son lo único que le da valor al PDF sobre una captura de pantalla.
Derívalos de **estos** datos, no del informe anterior. Lo que conviene mirar:

- **Cruzar peso contra calorías.** Es el chequeo más revelador y el que abrió el
  informe de agosto: si el peso está plano pero las calorías registradas implican un
  déficit fuerte, hay subregistro y el plan no se debe ajustar sobre esos números.
  Referencia rápida: ~7.700 kcal por kg de peso corporal.
- Qué macro explica el hueco calórico (casi nunca es la proteína).
- Qué tiempo de comida se registra peor, y cuál aporta menos proteína.
- Alimentos con mucha caloría por poco gramaje.

Si los datos no dan para un hallazgo fuerte, dilo — un `flag` inventado es peor que
uno que diga "el registro fue consistente y no hay señales de alarma".

### 6. Generar y **mirar** el PDF

```bash
node .claude/skills/reporte-nutricion/report.js datos.json salida.pdf
```

Luego **ábrelo con la herramienta Read** (`pages: 1`) y revísalo de verdad. Ha fallado
antes por: etiquetas encimadas con los rótulos de eje, barras aplastadas cuando la
columna es angosta, y desborde a una segunda página. Si son dos páginas, recorta
`notes` o `foods` antes que reducir el tipo.

### 7. Entregar

Copiar a `~/Descargas/` con nombre que lleve el rango
(`reporte-nutricion-18-28ago2026.pdf`). No dejarlo en el repo. Si ya existe uno con
ese nombre, avisar antes de sobrescribir.
