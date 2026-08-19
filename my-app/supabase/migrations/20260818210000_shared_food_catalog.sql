-- =============================================================================
--  Catálogo de productos compartido
--
--  Un producto es un hecho del mundo: la etiqueta del arroz Diana dice lo mismo
--  para todos. Que cada usuario tuviera que volver a escanearla era trabajo
--  repetido y, peor, macros distintas para el mismo alimento según quién lo
--  cargó. Desde acá el catálogo se LEE completo: cualquier usuario autenticado
--  ve todos los productos, los haya creado él o no.
--
--  Lo que NO se comparte es la escritura. Solo quien lo cargó puede editar o
--  borrar un producto, porque en cuanto es visible para todos queda referenciado
--  en el diario de otra gente: cambiarle las macros les reescribe el historial
--  hacia atrás sin que se enteren, y borrarlo se lo rompe. `user_id` deja de
--  significar "el dueño de la fila" y pasa a significar "quién la cargó".
--
--  El diario, las recetas y los objetivos siguen siendo privados: ninguna de sus
--  políticas se toca acá.
-- =============================================================================

-- ── Lectura común, escritura del autor ───────────────────────────────────────
-- La política única `for all` no alcanza: hay que separar el SELECT (abierto)
-- de las tres sentencias de escritura (acotadas al autor).
drop policy if exists "Users manage own food_products"      on public.food_products;
drop policy if exists "Anyone reads food_products"          on public.food_products;
drop policy if exists "Users insert own food_products"      on public.food_products;
drop policy if exists "Users update own food_products"      on public.food_products;
drop policy if exists "Users delete own food_products"      on public.food_products;

create policy "Anyone reads food_products" on public.food_products
  for select to authenticated
  using (true);

-- Se puede crear solo a nombre propio: sin esto, un cliente podría insertar
-- filas atribuidas a otro usuario y quedarse sin poder editarlas después.
create policy "Users insert own food_products" on public.food_products
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- El `with check` además impide regalar un producto ajeno cambiándole el
-- user_id, que sería una forma indirecta de perder el control de la fila.
create policy "Users update own food_products" on public.food_products
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own food_products" on public.food_products
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── El índice de búsqueda ya no arranca por usuario ──────────────────────────
-- El catálogo se busca entero, así que un índice cuya primera columna es
-- user_id no se usa para buscar por nombre. El de user_id solo sigue existiendo
-- aparte (idx_food_products_user) para resolver "¿este producto es mío?".
drop index if exists public.idx_food_products_name;
create index if not exists idx_food_products_name
  on public.food_products (lower(name));

-- ── Las fotos son parte del producto ─────────────────────────────────────────
-- Si el catálogo se ve completo, sus fotos también: un producto ajeno sin
-- miniatura se ve roto y la tabla nutricional es justamente lo que permite
-- auditar las macros que uno no cargó. La ruta sigue siendo
-- {autor}/{producto}/{label|front}.jpg, pero ese primer segmento ahora solo
-- gobierna quién ESCRIBE.
drop policy if exists "Users manage own nutrition photos"   on storage.objects;
drop policy if exists "Anyone reads nutrition photos"       on storage.objects;
drop policy if exists "Users upload own nutrition photos"   on storage.objects;
drop policy if exists "Users update own nutrition photos"   on storage.objects;
drop policy if exists "Users delete own nutrition photos"   on storage.objects;

create policy "Anyone reads nutrition photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'nutrition');

create policy "Users upload own nutrition photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'nutrition'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- La app sube con upsert: reemplazar una foto es un UPDATE, no un INSERT.
create policy "Users update own nutrition photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'nutrition'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'nutrition'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete own nutrition photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'nutrition'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ── Quién está usando un producto ────────────────────────────────────────────
-- Las FK hacia food_products son ON DELETE RESTRICT a propósito: borrar un
-- producto no puede vaciar el historial de nadie en silencio. Con el catálogo
-- compartido, quien bloquea el borrado puede ser el diario de OTRO usuario, y
-- esas filas la RLS no las deja contar desde el cliente: sin esta función la app
-- diría "usado en 0 registros" justo cuando Postgres acaba de negarse a borrar.
--
-- security definer para poder contar filas ajenas, y devuelve solo números:
-- nunca de quién son ni qué comió.
create or replace function public.food_product_usage(p_product_id uuid)
returns table (
  own_logs     bigint,
  other_logs   bigint,
  own_items    bigint,
  other_items  bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.nutrition_logs l
      where l.product_id = p_product_id and l.user_id =  (select auth.uid())),
    (select count(*) from public.nutrition_logs l
      where l.product_id = p_product_id and l.user_id <> (select auth.uid())),
    (select count(*) from public.recipe_items ri
      where ri.product_id = p_product_id and ri.user_id =  (select auth.uid())),
    (select count(*) from public.recipe_items ri
      where ri.product_id = p_product_id and ri.user_id <> (select auth.uid()));
$$;

comment on function public.food_product_usage is
  'Cuántos registros del diario y de recetas usan un producto, separando los del usuario actual de los ajenos. Security definer: los ajenos no son visibles por RLS.';

revoke all on function public.food_product_usage(uuid) from public;
-- Supabase le concede EXECUTE a `anon` por privilegios por defecto, y una
-- función security definer no tiene nada que hacer del lado sin sesión: sin
-- auth.uid() todo uso se contaría como "de otros" y quedaría legible con solo
-- la clave publicable.
revoke all on function public.food_product_usage(uuid) from anon;
grant execute on function public.food_product_usage(uuid) to authenticated;
