-- =============================================================================
--  La subida de ilustraciones al bucket `exercises` fallaba con
--  «new row violates row-level security policy» en los 42 archivos, aunque la
--  política de INSERT existía y era correcta.
--
--  El diagnóstico: `exercise_guide` dejó el bucket sin política de SELECT a
--  propósito, razonando que «en un bucket público la lectura la sirve el CDN
--  sin pasar por RLS». Eso es cierto para *servir* el archivo, pero no para
--  *subirlo*: la Storage API inserta la fila con `INSERT … RETURNING`, y con
--  RLS activa un RETURNING necesita también permiso de SELECT sobre la fila
--  nueva. Sin política de lectura, Postgres rechaza el insert entero y el
--  error que devuelve es —confusamente— el de la política de inserción.
--
--  Se comprobó en la base: el mismo INSERT como `authenticated` pasa sin
--  RETURNING y falla con RETURNING. Y es exactamente por esto que el bucket
--  `nutrition` nunca tuvo el problema: tiene su política de SELECT desde el
--  día uno («Anyone reads nutrition photos»).
--
--  No abre nada que no estuviera abierto: el bucket es público, así que estos
--  bytes ya los sirve el CDN a cualquiera con la URL. La política solo habilita
--  el camino de la API, que es el que usa `scripts/vincular-ejercicios.mjs`.
-- =============================================================================

drop policy if exists "Authenticated reads exercise media" on storage.objects;
create policy "Authenticated reads exercise media" on storage.objects
  for select to authenticated
  using (bucket_id = 'exercises');
