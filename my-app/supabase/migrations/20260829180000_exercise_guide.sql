-- =============================================================================
--  Cómo se hace el ejercicio: ilustración animada + pasos, y un grupo muscular
--  por músculo (no dos nombres para el mismo).
--
--  El catálogo del entrenador dice QUÉ levantar y CUÁNTO, pero no cómo se
--  ejecuta el movimiento. «Pec deck en cabina» o «Rear delt en cabina» son
--  nombres que uno reconoce cuando ya vio la máquina; el día que la fase trae
--  un ejercicio nuevo, el nombre solo no alcanza. La ilustración animada del
--  movimiento y los pasos en español cierran ese hueco sin agregar una
--  pantalla: viven dentro de la tarjeta que ya se usa para registrar series.
--
--  La fuente es el dataset de ejercicios (1.324 movimientos con animación,
--  taxonomía y pasos en 10 idiomas). Lo que se guarda acá NO es una copia del
--  dataset: es el VÍNCULO (`dataset_id`) más lo que se muestra en pantalla.
--  Los nombres siguen siendo los del PDF del entrenador —son los que uno
--  reconoce y los que él usa cuando manda la fase siguiente—; el dataset entra
--  por debajo como referencia, no como reemplazo.
-- =============================================================================

-- ── 1) El vínculo con el catálogo de referencia ──────────────────────────────
-- Es la pieza que estandariza de verdad: dos nombres distintos para el mismo
-- movimiento («Pec deck en cabina», «Aperturas en máquina») apuntan al mismo
-- `dataset_id` y por lo tanto son el mismo ejercicio, aunque cada fase del
-- entrenador lo bautice distinto. También es lo que permite volver a generar la
-- ilustración y los pasos sin tener que adivinar de nuevo a qué corresponde
-- cada fila.
--
-- Queda nullable a propósito: un ejercicio sin equivalente en el dataset (o uno
-- que todavía no se vinculó) sigue siendo un ejercicio válido, sólo que sin
-- guía. La pantalla ya sabe pintarse sin ella.
alter table public.exercises
  add column if not exists dataset_id text;

-- ── 2) Los pasos, ya en español y ya resueltos ───────────────────────────────
-- Se copian en vez de referenciarse. El dataset completo son 17 MB por las diez
-- traducciones que no se usan, y traerlo entero para leer cinco renglones sería
-- pagar un catálogo para consultar 24 filas. Copiados viajan gratis: la
-- pantalla del día ya hace `select *, exercises(*)`, así que los pasos llegan
-- en la misma consulta que ya se hacía, sin un round-trip extra ni una tabla
-- nueva que mantener.
--
-- `text[]` y no `text`: son pasos numerados y se pintan como lista. Guardarlos
-- como un párrafo obligaría a partirlos por heurística en el cliente.
alter table public.exercises
  add column if not exists instructions text[];

comment on column public.exercises.dataset_id is
  'Id del movimiento en el dataset de referencia (exercises-dataset), 4 dígitos. Es el vínculo que permite regenerar ilustración y pasos. Null = ejercicio sin equivalente o todavía sin vincular.';
comment on column public.exercises.instructions is
  'Pasos de ejecución en español, copiados del dataset. Se copian y no se referencian para que viajen en la misma consulta que ya trae el ejercicio.';
comment on column public.exercises.image_url is
  'URL pública de la ilustración animada (WebP 180x180) en el bucket `exercises`. La media es © Gym visual y la app la muestra con esa atribución a la vista.';

-- ── 3) Un músculo, un nombre ─────────────────────────────────────────────────
-- El catálogo venía divergiendo en silencio: los seeds del entrenador escriben
-- «Isquiotibiales» y el desplegable de la app ofrecía «Femorales». Son el mismo
-- músculo, así que «Peso muerto» —creado a mano desde la app— quedó en un grupo
-- propio y el balance por grupo de Estadísticas lo pintaba como una barra
-- aparte, compitiendo con la de sus dos compañeros de músculo.
--
-- No es un caso aislado: el desplegable decía Glúteos/Pantorrillas/Abdominales
-- donde los seeds dicen Glúteo/Pantorrilla/Core, y le faltaban tres grupos que
-- el entrenador sí usa (Deltoide posterior, Glúteo medio, Lumbares). Desde acá
-- la lista canónica vive en `lib/muscle-groups.ts` y es la que alimenta el
-- desplegable, así que la divergencia no se puede volver a introducir desde la
-- app. Los seeds tienen que escribir esos mismos nombres.
--
-- Sin constraint en la base a propósito: una fase nueva puede traer un grupo
-- que todavía no está en la lista, y que el seed falle por eso sería peor que
-- tener un grupo suelto. La lista es la convención; la base no la impone.
update public.exercises
   set muscle_group = 'Isquiotibiales'
 where muscle_group = 'Femorales';

-- ── 4) Dónde vive la ilustración ─────────────────────────────────────────────
-- Bucket público, a diferencia del de nutrición. Ahí las fotos son de productos
-- que fotografió el usuario y la ruta empieza por su uuid; acá son 24 archivos
-- de referencia, iguales para cualquiera que use la app, y sin dato personal
-- adentro. Público además evita la URL firmada, que caduca: `expo-image`
-- cachea por URL, y una que cambia en cada carga vuelve a bajar la animación
-- cada vez en lugar de leerla del disco. En el gimnasio, con media barra de
-- señal, esa diferencia se nota.
--
-- El nombre del archivo es el `dataset_id` (`0599.webp`), no un uuid: la misma
-- ilustración sirve para todos los usuarios y para todas las fases, así que
-- volver a subirla es un upsert sobre la misma ruta y no un archivo huérfano.
--
-- 512 KB de tope: el original pesa ~94 KB en GIF y ~31 KB convertido a WebP.
-- El límite no aprieta nada real y frena una subida equivocada.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercises', 'exercises', true, 524288, array['image/webp', 'image/gif', 'image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- La lectura no necesita política: en un bucket público la sirve el CDN sin
-- pasar por RLS. Lo que sí hace falta es poder escribir, y eso queda para
-- usuarios autenticados: es un catálogo de referencia compartido, igual que
-- `food_products`, no un archivo por dueño.
drop policy if exists "Authenticated uploads exercise media" on storage.objects;
create policy "Authenticated uploads exercise media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exercises');

drop policy if exists "Authenticated updates exercise media" on storage.objects;
create policy "Authenticated updates exercise media" on storage.objects
  for update to authenticated
  using      (bucket_id = 'exercises')
  with check (bucket_id = 'exercises');
