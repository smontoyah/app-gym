# Reglas del proyecto

## Rutinas nuevas con referencia real (PDF del entrenador)

Cuando se cargue una fase o rutina que trae referencia visual (las miniaturas o
los fotogramas de video del PDF de Ciro), el trabajo no está terminado hasta que
se verifique a ojo el gif de **cada** ejercicio de la rutina contra su
miniatura. Eso incluye los nuevos y también los que ya estaban vinculados en
fases anteriores. Se compara la máquina o el equipo, la postura, el agarre, si
es a uno o dos brazos y el patrón de movimiento, mirando las imágenes y no
puntajes de similitud.

- Si un gif no corresponde, se corrige en `scripts/ejercicios-dataset.mjs`.
- Si no hay equivalente exacto, se marca con `≈` y se anota en qué difiere, o
  se deja sin vincular.
- Después se corre `scripts/vincular-ejercicios.mjs`, y un `--dry-run` tiene
  que dar 0 pendientes.

El método está en `supabase/README.md`, sección «La guía de cada ejercicio».

Por qué: en CULMINACIÓN (seed del 2026-11-18) solo se revisaron los 12
ejercicios nuevos y los demás se dieron por buenos. Quedaron mal tres gifs
(vuelos laterales, plancha y crunch con balón), y se descubrió al usarlos en el
gimnasio.
