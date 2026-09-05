# Bitácora de calibración

Lo que cada análisis dejó aprendido. **Léela antes de empezar y actualízala al
terminar.** Sin esto se repiten conclusiones ya refutadas.

Orden: lo más reciente arriba.

---

## 2026-09-05 (noche) — Grasa de alimentos, spray, y "Ensalada de la casa"

### Dos correcciones suyas, las dos acertadas

1. **"La grasa que sí como, que venga de alimentos y no de aceite de oliva."**
   Yo había metido 23 g de oliva como mecanismo para llegar a la meta de grasa
   — salida perezosa. Rearmado con grasa de alimentos enteros: **97 % viene de
   huevo (19 g), aguacate (11,7), almendra (10), carne (8,5), pollo (5,2) y
   leche (3,4)**; solo 2 g de spray. El cambio salió **gratis y mejor**:
   +5 g de proteína y +7 g de fibra por las mismas kcal.
   **Regla: la grasa se cubre con alimentos, no con aceite añadido.**

2. **El spray SÍ vale la pena, pero no por lo que parece.** No ahorra calorías
   del presupuesto: si se quita el aceite sin reponer la grasa, cae a 0,53 g/kg,
   muy por debajo del piso de 0,80. Lo que hace es **convertir una fuga de
   130–220 kcal/día ("un poquito para que no se pegue" × 3 cocciones) en una de
   ~18 kcal.** Reduce incertidumbre, no calorías. Su frase "no la estoy
   contando" es válida **solo con spray**; con aceite de botella hay que pesarlo.

### Producto nuevo: "Ensalada de la casa" (`ed576950`)

No quería registrar la ensalada, pero la come en almuerzo **y** cena. En vez de
aceptar el hueco, se resolvió la fricción real —que era **pesar**, no
registrar—: producto de composición fija, `intake_unit='unidad'`,
`unit_weight_g=230`, un toque por comida y cero balanza.

```
230 g = lechuga 50 + tomate 80 + pepino 60 + zanahoria 40
48,3 kcal · P 2,08 · C 10,77 · G 0,47 · fibra 3,43   (21 kcal/100 g)
```

**Condición documentada en `ocr_raw`: vale SOLO sin aliño.** Con aceite,
aguacate, queso o mayonesa hay que anotarlo aparte — una cucharada de aceite es
el doble de toda la ensalada.

**El argumento que lo decidió no fueron las kcal (97/día, despreciables) sino la
fibra:** sin registrarla, la app mostraría 30 g cuando come 37. Una falsa alarma
diaria erosiona la confianza en los números, que es el activo que costó una
semana reconstruir.

**Patrón reutilizable:** cuando rechace registrar algo, preguntar *qué* le
estorba. Casi siempre es pesar, no registrar — y un producto de composición fija
con `intake_unit='unidad'` lo resuelve sin perder datos.

### Meta final (aplicada 2026-09-05)

`nutrition_goals` → **1.850 kcal · 170 P · 160 C · 63 G · 30 fibra**
Proteína 2,18 g/kg. El día tipo entrega 1.848 · 171 P · 158 C · 63 G · 37 fibra.

Déficit real por escenario: gasto 2.050 → −0,7 kg / 2.150 → −1,1 / 2.250 → −1,5 /
2.380 → −1,9 kg en 4 semanas.

### Contraste con el plan de otro nutricionista (foto que compartió)

Plan de 6 comidas para recomposición, calculado sobre 3 días representativos:
**promedio 1.851 kcal** — a **1 kcal** de donde llegamos por otra vía. Fuerte
validación cruzada del número, y deja **los 2.399 de Ciro como el atípico**.
Pero su reparto (P 1,91 · C 1,74 · G 1,12 g/kg) es alto en grasa y bajo en
carbos para 19 series × 4 sesiones; el martes cae a 1.665 kcal en día de pesas.
Y **16 de sus alimentos no existen en el catálogo** (pancakes UPN, Clight,
gelatina light, Chocoline, barras, cuajada, maní, jamón, solomo, cañón…), con
"100 g de arroz" y "carne 120 g" sin decir crudo o cocido. **Inmedible para él.**
Ideas que sí se le tomaron: más variedad de fruta y almendras diarias.

---

## 2026-09-05 (tarde) — Meta a 1.850. Corrección: no presentar déficits puntuales.

### Objeción de Sebastián, y tenía razón

Ante el día propuesto de 1.947 kcal: *"yo ya venía comiendo como me recomiendas
y no he bajado peso."* Verificado contra sus días completos: **cierto.** El día
propuesto quitaba ~240 kcal de relleno (saltinas, palomitas, aguacate) y añadía
~270 de lenteja, verdura y el aceite visible. **En kcal reales era el mismo
día**, mejor compuesto pero sin recorte.

### El error de método

Presenté "déficit 433 kcal ⇒ 0,39 kg/sem" usando el **centro** del rango de
gasto (2.380) como si fuera un dato. Si el gasto real está en 2.050–2.150, ese
mismo día da 103–203 kcal de déficit ⇒ **0,4–0,7 kg en 4 semanas**, que es
indistinguible del ruido. Habría producido otro mes plano sin información —
exactamente el problema que veníamos resolviendo.

**Su experiencia vivida (no baja) es evidencia de que el gasto está en la parte
baja del rango.** Hay que ponderarla, no descartarla por ser subjetiva.

Regla escrita en §7 de la skill: **tabular siempre el déficit en todo el rango
de gasto y exigir que el extremo bajo dé ≥0,8 kg en 4 semanas.**

### Meta nueva (aplicada 2026-09-05)

`nutrition_goals` → **1.850 kcal · 165 P · 160 C · 63 G · 30 fibra**
Proteína 2,11 g/kg (36 % de las kcal), grasa 0,81 g/kg (piso hormonal).

Déficit resultante por escenario de gasto — **todos dan señal**:

| Gasto | Déficit | 4 semanas |
|---|---|---|
| 2.050 | 227 | −0,8 kg |
| 2.150 | 327 | −1,2 kg |
| 2.250 | 427 | −1,6 kg |
| 2.380 | 557 | −2,0 kg |

### El día tipo (versión B)

Desayuno 4 huevos + arepa 100 g + leche 200 ml · Almuerzo pollo 200 g crudos +
arroz 80 g cocidos + lenteja 150 g cocidos + ensalada + aceite 10 g · Snack
ISO100 30 g + banano · Cena **carne molida 95/5** 170 g crudos + papa 120 g
cocidos + brócoli 150 g + aceite 13 g.

Truco que vale la pena repetir: **95/5 en vez de 90/10** da más proteína con
60 kcal menos. Estaba en el catálogo sin usar.

**Rampa de fibra** (para no confundir el ruido de la semana 1 con fracaso):
lenteja 75 g → 110 → 150 en tres semanas (fibra 22 → 25 → 28 g), compensando
las kcal faltantes con arroz.

### Si en 4 semanas no baja ni 0,8 kg

Con el registro cerrado y esta meta, el modelo metabólico estaría mal de raíz.
Ahí toca dejar de ajustar calorías y mandarlo a descartar causas médicas
(tiroides, medicación) con datos en mano.

---

## 2026-09-05 — Cardio: compromiso de registro. Última pregunta cerrada.

**"Apenas estoy retomando el cardio. Me comprometo a anotarlo en la app cuando
lo haga; si no está anotado es porque no lo hice. Siempre es caminata
inclinada."**

Consecuencias:

- **`cardio_logs` pasa a ser fuente confiable desde el 2026-09-05.** La ausencia
  se puede leer como cero. **Hacia atrás no**: las 2 filas de agosto siguen
  siendo ambiguas y no se deben interpretar. Regla escrita en §2 con la frontera
  de fecha explícita.
- Modalidad única: caminata inclinada, ~7 METs ⇒ **~8 kcal/min netas** a 78 kg.
  El plan completo de Ciro (95 min/sem) valdría ~110 kcal/día.
- **El cardio NO se suma al TDEE por adelantado.** Se suma el registrado y solo
  si la báscula lo confirma. La meta sigue en 2.000: el cardio es acelerador
  del déficit, no permiso para comer más.
- `F1` no traía cardio — corregido, ahora incluye sesiones, minutos y kcal
  aproximadas.

**Aviso dado:** la primera semana de cardio nuevo puede traer +0,3–0,7 kg de
retención que no es grasa. Sin advertirlo, se lee como fracaso del plan —
justo el tipo de confusión que costó tres rondas de análisis con el glucógeno.

### Preguntas abiertas: ninguna.

Las cinco quedaron cerradas. El diagnóstico está completo; lo que falta es
tiempo. Próximo corte **~2026-10-02**.

---

## 2026-09-05 — Pechuga resuelta · el selector crudo/cocido funciona en 3 de 12 productos

### La pechuga estaba bien. Cerrada la última pregunta grande.

Él confirmó: **antes del selector (1-sep) hacía la conversión a mano.** Y los
datos lo prueban solos:

- **31-ago: 210 g** (calculado a mano) y **2-sep: 210 g** (calculado por la app
  al escribir 150 g cocidos). Misma porción, dos rutas, mismo número.
- Los valores no redondos —**226, 208, 88**— son la huella de la división
  manual: corresponden a 161, 148 y 63 g cocidos.
- Nunca existió una fila "Pechuga (cocida)" en el catálogo; la migración
  `unify_raw_cooked_foods` solo tocó papa y batata. Así que la única vía posible
  para lo cocido era, en efecto, convertir a mano.

**No hay error de 40 % en la mayor fuente de proteína.** La pechuga no explica
nada del hueco de ~650 kcal; ese sigue siendo aceite, comidas de calle,
tolerancia de etiqueta y estimación de porción.

**Regla que deja esto:** antes de sospechar del registro, revisar qué permitía
la app en esa fecha. Varias "anomalías" de este diario resultaron ser
limitaciones de la interfaz del momento, no descuidos.

### Hallazgo nuevo: el selector crudo/cocido casi no existe

`supportsCooking()` exige **base_state Y cooked_yield_pct**. De los 12 productos
con `base_state` en su diario, solo **3** ofrecen el selector:

| Producto | base_state | yield | ¿Selector? | kcal aportadas |
|---|---|---|---|---|
| Huevo entero | crudo | — | ❌ | 4.147 |
| Pechuga de pollo | crudo | 71,30 | ✅ | 4.023 |
| **Carne de res molida 90/10** | crudo | **—** | ❌ | **2.116** |
| Papa | cocido | 89,53 | ✅ | 1.289 |
| **Arroz blanco** | cocido | **—** | ❌ | 715 |
| Penne | crudo | 350 ⚠ | ✅ (mal) | 547 |
| Posta, arveja, cerdo, tilapia, zanahoria, coliflor | — | — | ❌ | <350 c/u |

**El riesgo hacia adelante:** ahora que el selector existe para la pechuga, es
razonable suponer que funciona en todo. No funciona. En la carne molida —2.116
kcal, su tercer aportante— sigue tocando la cuenta a mano, y si un día se
olvida y escribe los gramos cocidos contra la fila cruda, subregistra ~27 %
en silencio.

**Pendiente para él (arregla el catálogo a mano):** `cooked_yield_pct` de carne
molida ≈ 73 y de arroz ≈ 260; corregir penne de 350 a ~240. El huevo no
necesita: se cuenta por unidades.

### Preguntas abiertas

1. ~~Antropometría~~ · 2. ~~% de grasa~~ · 3. ~~Meta en 2.000~~ ·
   4. ~~Pechuga cruda o cocida~~ — **todas cerradas.**
5. ¿Hace el cardio aunque no lo anote? (100–200 kcal/día) — la única que queda.

---

## 2026-09-04 (cierre) — Rol de coach aceptado · meta fijada · protocolo de 4 semanas

### El malentendido que resolvió la decisión

Sebastián objetó subir la meta a 2.399 diciendo "si en 2.000 voy mal, eso me
haría engordar". **La premisa era falsa: nunca comió 2.000.** La app decía 1.657
y su ingesta real era ~2.300. Estaba 300 *por encima* de su meta creyendo estar
340 *por debajo*.

Y reveló que **los 2.000 fueron deliberados: no estaba de acuerdo con Ciro.**
No era un error de carga. La pregunta abierta nº 3 de la entrada anterior queda
cerrada.

### Veredicto: su 2.000 era mejor que el 2.399 de Ciro

Gasto ~2.380. Para bajar grasa conservando masa magra el rango útil es un
déficit del 15–20 % (350–475 kcal/día ⇒ 0,35–0,45 kg/semana): **1.900–2.030
kcal.** Su 2.000 cae en el centro. El −4 % de Ciro (100 kcal/día ⇒ 0,09
kg/semana) es defendible pero demasiado tímido: cada medición mensual quedaría
por debajo del ruido de la báscula.

**Retirada la recomendación de subir a 2.399.** Él tenía razón, por otro motivo.

### Meta aplicada el 2026-09-04

`nutrition_goals` → **2.000 kcal · 165 P · 180 C · 65 G · 30 fibra**
(antes 2.000 / 160 / 190 / 65 / null). Solo cambiaron proteína, carbos y fibra.
Proteína = 2,11 g/kg. Fibra era el único hueco nutricional de fondo (15 g
reales, verduras en 2 de 17 días). **La grasa de 65 g es piso hormonal: no
bajarla.**

### Protocolo vigente — 4 semanas desde el 2026-09-04

Escrito en §7 de la skill. Semanas 1–2 calibrar el registro (aceite siempre,
comidas de calle como estimadas, ensalada); semanas 3–4 apuntar a 2.000 sin
tocar variables y dejar que la báscula arbitre. Reglas de salida: bajó ~1,4 kg
⇒ seguir; no se movió ⇒ 1.850; bajó >2 kg ⇒ 2.150.

**Primer corte de revisión: ~2026-10-02.**

### Línea base del proceso (para medir si el registro se está cerrando)

Al 4-sep, sobre 17 días: **1 día con grasa de cocción anotada, 1 día con comida
estimada.** Esas dos cifras son la métrica de proceso de esta fase; deberían
tender a "casi todos los días" en la próxima revisión.

### Cambios en la skill

- **§7 nuevo, "El rol de coach nutricional"**: la frontera del rol, la trampa
  central (perseguir el número de la app con el registro bajo hace comer de
  más), la meta vigente con su justificación, el protocolo y la revisión
  semanal. La sección de crecimiento pasó a §8.
- **`consultas.sql` §F**: `F1` tablero semanal (incluye las dos métricas de
  proceso) y `F2` lectura de ejercicios estancados.
- **Bug corregido en `F2`.** El orden del `CASE` etiquetaba una bajada del
  −10 % como "SUBCARGADO" y un estancamiento con RPE 8,7 como "progresando".
  Dos causas: las ramas de retroceso iban después de las de estancamiento, y
  `rpe >= 9` con `rpe` null da null (cae al `else`). Ahora las bajadas se
  evalúan primero y hay rama final sin condición de RPE. Además se agregó
  `plano_3` (últimas 3 sesiones con el mismo e1RM), porque la tendencia larga
  no ve al que subió y luego se planchó — **rear delt en cabina** aparecía como
  "+7,5 % progresando" llevando 3 sesiones clavado.

### Pendiente inmediato — pregunta hecha, sin responder

**¿La pechuga se pesa cruda o ya cocida?** Es lo único que queda con impacto
grande: 85 kcal y 20 g de proteína por almuerzo.

---

## 2026-09-04 (noche) — Documentos de Ciro: la meta de la app estaba mal

Revisados `/home/sebastian/Documentos/Fitness - Ciro/`: informe de composición
corporal (1-ago, pliegues) y plan nutricional (3-ago). **Dos hallazgos que
reordenan el diagnóstico entero.**

### A. La meta cargada en la app NO es la del plan

| | App (`nutrition_goals`) | Plan de Ciro | Δ |
|---|---|---|---|
| kcal | 2.000 | **2.399** | **−399** |
| Proteína | 160 g | 166 g (2,1 g/kg) | −6 |
| Carbohidratos | 190 g | 252 g (3,2 g/kg) | **−62** |
| Grasa | 65 g | 79 g (1 g/kg) | −14 |

El perfil calórico del plan: **TMB 1.878 · IAF ligero · GET 2.499 · fase RC −4 %
= 2.399 kcal.** El déficit prescrito son **100 kcal/día**, no 400.

**Consecuencia:** un déficit del 4 % predice ~0,09 kg/semana ⇒ **0,22 kg en los
17 días analizados**, muy por debajo del ruido de 0,25 kg. *El peso plano es
exactamente lo que este plan predice.* No había anomalía que explicar.

Y al cruzarlo todo: ingesta real ≈ 2.300 (peso plano contra GET ~2.380) contra
un objetivo de 2.399 ⇒ **está cumpliendo el plan real.** Lo que falla es el
instrumento, no la conducta: la meta de la app está 400 kcal por debajo y el
registro captura ~650 menos de lo que come. Los dos errores lo empujaban a
concluir que le faltaba comer cuando iba bien.

**Pendiente:** proponerle corregir `nutrition_goals` a 2.399/166/252/79. No
tocar sin su visto bueno.

### B. El % de grasa: los dos números de Ciro son malos, en direcciones opuestas

| Fuente | %Grasa | kg |
|---|---|---|
| Informe de pliegues (1-ago) | **14,6** | 11,5 |
| Bioimpedancia del plan (3-ago) | **26,9** | 21,2 |

**12,3 puntos de diferencia en el mismo sujeto con dos días de separación.**

El 14,6 % se reprodujo por ingeniería inversa: es **Yuhasz** sobre la sumatoria
de 6 pliegues (Σ6 = 113 mm con supraespinal → 14,46 %; el informe dice 14,6 %).
Yuhasz se derivó en atletas y subestima fuera de esa población.

Contraste sobre **los mismos pliegues**:

| Ecuación | %Grasa |
|---|---|
| Yuhasz (la del informe) | 14,5 |
| Faulkner | 18,5 |
| Jackson-Pollock 7 (2 pliegues estimados) | 18,2 – 19,2 |
| Durnin-Womersley (bíceps estimado) | 20,5 – 21,1 |

**Estimación de trabajo: 19–20 % (≈ 15 kg de grasa).** La medición de pliegues
está bien hecha; **la ecuación aplicada es el problema** — distinguir siempre
entre el dato y su interpretación.

Señales independientes que respaldan 19–20 % y descartan 14,6 %:
cintura/talla **0,521** (umbral 0,50), pliegue abdominal **31 mm** (el mayor de
los siete, el siguiente es 21), IMC 27,0.

### C. El modelo de 4 masas del informe está inflado por el mismo error

Las cuatro masas suman 78,9 exacto, pero **la masa residual es la constante de
Matiegka para hombres (24,1 %): no se mide, se asume.** La masa muscular sale
por diferencia — es un residuo de residuos. Cada kg que falte en la grasa
aparece como músculo. Los **38,5 kg / 48,8 % de "masa muscular"** heredan
directamente la subestimación de Yuhasz; con 19 % de grasa, la masa muscular
real está ~6 kg por debajo. Además el informe **no muestra ningún diámetro
óseo**, que el modelo requiere.

### D. El gasto no se movió — tres rutas independientes convergen

| Ruta | GET |
|---|---|
| Componentes (esta skill) | 2.283 – 2.477 |
| Ciro: TMB 1.878 × IAF 1,331 | 2.499 |
| Mifflin 1.727 × el mismo IAF 1,331 | 2.299 |

La TMB de Ciro (1.878) está ~150 kcal por encima de Mifflin (1.727), así que su
GET de 2.499 es el techo. **Mejor estimación: ~2.300–2.400, centro 2.380.**
Sin cambios respecto de la entrada anterior. El % de grasa apenas mueve el
basal (±50 kcal entre 14,6 % y 20,7 %) — **no era la palanca que pensé.**

### Preguntas abiertas — actualizadas

1. ~~Estatura, edad, sexo~~ — resuelto.
2. ~~% de grasa corporal~~ — acotado a 19–20 %. Si se quiere precisión real,
   DEXA; ninguna ecuación de pliegues la va a dar.
3. **¿Por qué la meta de la app quedó en 2.000?** ¿Fue un cambio deliberado
   posterior o un error de carga?
4. ¿La pechuga de los registros viejos se pesó cruda o cocida?
5. ¿Hace el cardio aunque no lo anote?

---

## 2026-09-04 (tarde) — Antropometría resuelta: el gasto queda anclado

**171 cm · 27 años · hombre · 78,09 kg.** Cierra la pregunta abierta nº 1 y
convierte el rango de gasto de estimado en calculado.

| Constante | Valor | Nota |
|---|---|---|
| IMC | 26,7 | Poco informativo en alguien que levanta; hace falta % de grasa |
| **BMR (Mifflin-St Jeor)** | **1.720 kcal** | `10×78,09 + 6,25×171 − 5×27 + 5` |
| Contraste Katch-McArdle | 1.719 kcal @ 20 % de grasa | Convergencia casi exacta con Mifflin ⇒ el basal es sólido |
| EAT (4 sesiones/sem × ~280 kcal netas) | 160 kcal/día | |
| **TDEE** | **2.283 – 2.477**, centro **≈ 2.370** | `(BMR + EAT + NEAT)/0,90`, con NEAT 175–350 |

### El argumento que ahora es aritmético, no estimado

Si las 1.657 kcal registradas fueran su ingesta real con el peso plano, su PAL
sería **0,96 — por debajo del metabolismo basal.** Imposible. Incluso con PAL
1,2 (reposo en cama) el gasto sería 2.064 y **el hueco mínimo absoluto son 407
kcal/día**. Ya no depende de ningún supuesto de actividad.

- Hueco registro↔ingesta real: **515–915 kcal/día, centro ≈ 700**.
- Residual tras acreditar todo lo que él explicó (reconstrucción de 2.073 kcal):
  **207–407 kcal/día, centro ≈ 307**.

### Corrección a la corrección — error de lógica propio

En la sesión anterior bajé la cifra a "300–500 kcal/día" por la presión del IC
del peso. **Estaba mal razonado.** El IC de la báscula acota cuánto se aparta la
**ingesta** del **gasto** (±~200 kcal/día). No dice nada sobre cuánto se aparta
el **registro** de la **ingesta** — que es otra cantidad, y es la grande. Los
dos huecos son independientes:

```
gasto 2.370  ──(IC de la báscula: ±200)──>  ingesta real ~2.170–2.570
ingesta real  ──(hueco de registro)──────>  registrado 1.657
```

**No volver a usar el IC del peso para acotar el hueco de registro.** Sirve para
acotar el déficit, nada más. (La regla en §5 de la skill sigue siendo válida tal
como está escrita: prohíbe afirmar un *déficit* mayor del que el IC permite. El
error fue de aplicación, no de la regla.)

### Preguntas abiertas — actualizadas

1. ~~Estatura, edad, sexo~~ — **resuelto**.
2. **% de grasa corporal.** Es ahora el dato que más estrecharía todo: mueve el
   basal 135 kcal entre 16 % y 24 %, y decide si el objetivo correcto es
   recomposición o déficit.
3. ¿La pechuga de los registros viejos se pesó cruda o cocida? (40 % de error
   en su mayor fuente de proteína)
4. ¿Hace el cardio aunque no lo anote? (100–200 kcal/día)
5. ¿Los huevos son A o AA? (29 kcal/día)

---

## 2026-09-04 (mañana) — Primer diagnóstico completo (18 ago – 4 sep)

### Constantes calibradas

| Constante | Valor | Cómo se obtuvo |
|---|---|---|
| Peso, media del período | 78,09 kg (rango 77,7–78,5) | 16 pesajes |
| Ruido diario de la báscula (SD) | **0,25 kg** | Muy bajo: pesa 05:55–07:00, en ayunas, casi a diario |
| Tendencia de peso | +0,037 kg/sem, r² = 0,011 | Plano estadísticamente |
| **IC 95 % de la tendencia** | **−0,164 a +0,238 kg/sem** | ⇒ compatible solo con déficit ≤180 kcal/día o superávit ≤262 |
| kcal registradas, días completos | **1.657** (11 días) | 83 % de la meta de 2.000 |
| kcal registradas, todos los días | 1.499 | Contaminado por 5 días con hueco |
| Proteína | 146 g = **1,87 g/kg** | En rango correcto para hipertrofia |
| Fibra | 15 g/día | Bajo (referencia 25–35) |
| ~~TDEE estimado~~ | ~~2.200–2.500~~ → **ver entrada del 4-sep tarde: 2.283–2.477** | Antropometría resuelta |
| Frecuencia real de gimnasio | **4 veces/semana** | Dicho por él. NO son las 6 de `routines` |

### Hipótesis descartadas — no volver a proponerlas

- **Glucógeno como explicación del peso plano: NO.** Falla por cuatro lados:
  (1) acotado a ~1 kg y satura en 24–72 h, no puede tapar 17 días; (2) sus
  carbohidratos están en 1,8–2,1 g/kg y la carga necesita 5–7 g/kg; (3) la
  forma de la curva va al revés — 1ª mitad 78,000 kg, 2ª mitad **78,175**,
  cuando una carga front-loaded exigiría caída en la 2ª; (4) ya venía
  entrenando desde el 4 de agosto, dos semanas antes del diario.
- **Picoteo / bebidas azucaradas / omisiones deshonestas: NO.** Verificado con
  él: café con leche (anota la leche) + stevia en el desayuno, agua en el
  almuerzo, café solo sin endulzar el resto del día. Tiene snack registrado en
  15 de 17 días. **Registra con rigor. No abrir un diagnóstico suponiendo lo
  contrario.**

### Correcciones a conclusiones propias

- **Sobrestimé el hueco calórico.** Dije "faltan 650–1.150 kcal/día"; el IC de
  su propia serie de peso lo descarta. Dos errores: usé PAL 1,55–1,65 cuando su
  perfil real (trabajo sentado, cardio casi nulo) da 1,35–1,50, y asumí que una
  sesión de pesas quema ~500 kcal cuando son 250–350 netas. **Cifra corregida:
  300–500 kcal/día**, y con el gasto en el extremo bajo las cuentas cierran casi
  del todo.
- **Juzgué adherencia contra `routines` y `cardio_plan`.** Dije "el plan pide 6
  días de cardio y solo hay 2 registrados". Mal: esas tablas son plantilla de la
  app, no compromiso. Él corrigió. Ver §2 de la skill.
- **Mencioné picadas sin registrar.** Falso, tiene snacks anotados.

### Hallazgos que sí resistieron

- **Contraste de correlación** (el mejor hallazgo del período):
  corr(kcal, Δpeso mañana siguiente) = **−0,087 con todos los días** pero
  **+0,515 restringida a días completos**. Los días completos están bien
  medidos; los días con hueco son ruido que envenena los promedios.
- **Día delator: 27 de agosto.** 484 kcal registradas (solo desayuno y snack) y
  **+0,60 kg** a la mañana siguiente — el salto más grande de la serie.
- **Grasa de cocción anotada 1 día de 17.** 19 porciones de pechuga, 18 de
  huevo, 7 de carne molida — todas cocinadas con algo. Él acepta la fuga y la
  estima en 100–150 kcal/día.
- **Verduras anotadas 2 días de 17.** Dice que la ensalada es limpia y
  despreciable; probablemente cierto (30–60 kcal), pero explica la fibra baja.
- **Reconciliación que cuadra:** 1.657 registradas + 125 aceite + 40 ensalada
  + 167 comidas no registrables prorrateadas + 29 huevo AA + 15 arepa + 40
  tolerancia de etiqueta ≈ **2.073 kcal**, contra un gasto mínimo plausible de
  ~2.180. Residual ~107 kcal/día, dentro del ruido. **Su versión es coherente.**

### Auditoría del catálogo

Los 7 productos USDA (huevo, pechuga, carne molida, papa, banano, aguacate,
arroz) están **exactos contra SR Legacy, dígito por dígito**. Los escaneados con
OCR son internamente consistentes contra su `ocr_raw`. **Los números no son el
problema.** Pendientes, que él arregla a mano:

- Penne Deliziare: `cooked_yield_pct` = 350 %, debería ser ~240. **Él dice que
  lo pesó y tal vez se equivocó — no tocar sin confirmarle.**
- Spaghetti Doria: sin `base_state` ni rendimiento (el Penne sí los tiene).
- Carne molida 90/10 y arroz blanco: sin `cooked_yield_pct` (~73 y ~260).
- Arepa MASMAÏ: sin `base_state`. La etiqueta es de la arepa cruda de 100 g; su
  promedio registrado es 93 g, así que parece pesarla ya asada (−10 %).
- Pechuga: 15 de 19 registros sin `logged_state` (anteriores al selector del
  1-sep). Los datos sugieren que sí eran pesos crudos, pero **no está
  confirmado** y vale 85 kcal por almuerzo si está mal.

### Hechos del usuario que no están en la base

- Entrena **4 veces por semana**.
- Bebidas: café con leche + stevia (desayuno), agua (almuerzo), café solo sin
  endulzar el resto del día. Nada más.
- No pica entre comidas.
- Acepta que se le escapa el aceite; lo estima en 100–150 kcal/día.
- Come **4 huevos diarios desde el 27 de agosto** (antes eran 3, confirmado en
  los datos: 150 g clavados hasta el 26, 200 g desde el 27).
- Arregla el catálogo a mano; no aplicar UPDATEs sin pedírselo.

### Preguntas abiertas — resolverlas mejora el próximo diagnóstico

1. **Estatura, edad y sexo.** La app no los guarda y sin ellos el basal es un
   rango de 165 kcal. Es el dato que más estrecharía todo.
2. **¿La pechuga de los registros viejos se pesó cruda o cocida?** Vale 40 % de
   error en su mayor fuente de proteína.
3. **¿Hace el cardio aunque no lo anote?** Cambia el gasto en 100–200 kcal/día.
4. **¿Los huevos son A o AA?** 29 kcal/día de diferencia.

### Lo que hace falta para cerrar el caso

**Tiempo, no más análisis.** Con 0,25 kg de ruido diario, ~6 semanas de pesaje
llevan el error estándar a ~0,023 kg/semana ⇒ IC de **±50 kcal/día**, que sí
resuelve la pregunta. A partir del 4 de septiembre, con el aceite anotado y las
comidas de calle registradas como estimadas, el reloj arranca limpio.

**Próximo corte recomendado: primeros días de octubre de 2026.**
