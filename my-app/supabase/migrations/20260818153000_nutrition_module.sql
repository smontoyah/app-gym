-- =============================================================================
--  Módulo de nutrición
--  · food_products  : catálogo de productos escaneados (una foto por producto,
--                     no por comida: se escanea una vez y se reutiliza siempre)
--  · nutrition_logs : qué se comió, cuánto y cuándo
--  · ocr_usage      : contador diario de escaneos por usuario
--
--  Las macros canónicas se guardan SIEMPRE POR 100 G. Es la única base que
--  permite sumar productos distintos entre sí y escalar por gramos consumidos.
--  Lo que la etiqueta traía por porción no se pierde: la respuesta completa del
--  OCR queda en ocr_raw, así se puede auditar o reprocesar con un modelo mejor
--  sin volver a fotografiar el producto.
-- =============================================================================

-- ── Catálogo de productos ────────────────────────────────────────────────────
create table if not exists public.food_products (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,

  name                 text not null,
  brand                text,
  package_size_g       numeric(8,2),
  serving_size_g       numeric(8,2),
  serving_label        text,           -- literal: "1 cucharada (15 g)"
  servings_per_package numeric(6,2),

  -- Macros por 100 g
  energy_kcal          numeric(7,2),
  protein_g            numeric(7,2),
  carbs_g              numeric(7,2),
  sugars_g             numeric(7,2),
  added_sugars_g       numeric(7,2),
  fiber_g              numeric(7,2),
  fat_g                numeric(7,2),
  saturated_fat_g      numeric(7,2),
  trans_fat_mg         numeric(8,2),
  sodium_mg            numeric(8,2),

  -- Rutas dentro del bucket 'nutrition', no URLs: las firmadas caducan
  label_photo_path     text,
  front_photo_path     text,

  ocr_raw              jsonb,          -- respuesta cruda del modelo
  ocr_model            text,           -- qué modelo la produjo
  ocr_confidence       numeric(3,2),
  verified             boolean not null default false,  -- el usuario la revisó

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint food_products_name_not_blank
    check (length(trim(name)) > 0),
  -- Ningún alimento supera las 900 kcal/100 g (grasa pura = 900). Un valor por
  -- encima significa que se guardó por porción o que el OCR se equivocó.
  constraint food_products_energy_sane
    check (energy_kcal is null or (energy_kcal >= 0 and energy_kcal <= 900)),
  constraint food_products_serving_positive
    check (serving_size_g is null or serving_size_g > 0)
);

create index if not exists idx_food_products_user on public.food_products(user_id);
create index if not exists idx_food_products_name on public.food_products(user_id, lower(name));

alter table public.food_products enable row level security;
drop policy if exists "Users manage own food_products" on public.food_products;
create policy "Users manage own food_products" on public.food_products
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists food_products_touch_updated_at on public.food_products;
create trigger food_products_touch_updated_at
  before update on public.food_products
  for each row execute function public.touch_updated_at();

-- ── Registro diario ──────────────────────────────────────────────────────────
create table if not exists public.nutrition_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- restrict, no cascade: borrar un producto no puede vaciar el historial en
  -- silencio. La app avisa cuántos registros lo usan antes de dejar borrarlo.
  product_id uuid not null references public.food_products(id) on delete restrict,

  logged_on  date not null,            -- fecha local del usuario, no UTC
  meal       text not null check (meal in ('desayuno','almuerzo','cena','snack')),
  quantity_g numeric(8,2) not null check (quantity_g > 0 and quantity_g <= 5000),
  note       text,

  created_at timestamptz not null default now()
);

create index if not exists idx_nutrition_logs_user on public.nutrition_logs(user_id);
create index if not exists idx_nutrition_logs_day  on public.nutrition_logs(user_id, logged_on);

alter table public.nutrition_logs enable row level security;
drop policy if exists "Users manage own nutrition_logs" on public.nutrition_logs;
create policy "Users manage own nutrition_logs" on public.nutrition_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── Cuota de escaneos ────────────────────────────────────────────────────────
-- La API key de Gemini es una sola para toda la app: su cuota diaria se reparte
-- entre todos los usuarios. Sin este contador, un bucle de reintentos en un
-- cliente deja a los demás sin escanear.
create table if not exists public.ocr_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  used_on date not null,
  scans   integer not null default 0 check (scans >= 0),
  primary key (user_id, used_on)
);

alter table public.ocr_usage enable row level security;
drop policy if exists "Users read own ocr_usage" on public.ocr_usage;
create policy "Users read own ocr_usage" on public.ocr_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);
-- Escribe solo la Edge Function con service_role: si el cliente pudiera
-- actualizar su propio contador, el límite no limitaría nada.

-- ── Bucket de fotos ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nutrition', 'nutrition', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Ruta: nutrition/{user_id}/{product_id}/{label|front}.jpg
-- El primer segmento de la ruta es el dueño, y eso es lo que valida la política.
drop policy if exists "Users manage own nutrition photos" on storage.objects;
create policy "Users manage own nutrition photos" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'nutrition'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'nutrition'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
