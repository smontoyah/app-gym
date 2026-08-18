-- =============================================================================
--  Cuota diaria de escaneos
--
--  La API key de Gemini es una sola para toda la app: su límite diario se
--  reparte entre todos los usuarios. Sin este freno, un bucle de reintentos en
--  un cliente deja a los demás sin poder escanear el resto del día.
--
--  El incremento y la verificación van en la MISMA sentencia. Hacerlo en dos
--  pasos (leer, comparar, escribir) abre una ventana en la que dos peticiones
--  simultáneas leen el mismo valor y ambas pasan el límite.
-- =============================================================================

create or replace function public.bump_ocr_usage(p_user uuid, p_limit integer)
returns integer
language plpgsql
security invoker            -- la llama la Edge Function con service_role
set search_path = ''
as $$
declare
  v_scans integer;
begin
  insert into public.ocr_usage as u (user_id, used_on, scans)
  values (p_user, current_date, 1)
  on conflict (user_id, used_on) do update
    set scans = u.scans + 1
    where u.scans < p_limit     -- si ya llegó al tope, el update no ocurre…
  returning u.scans into v_scans;

  -- …y sin fila devuelta, v_scans queda null: cuota agotada.
  if v_scans is null then
    return -1;
  end if;
  return v_scans;
end;
$$;

comment on function public.bump_ocr_usage is
  'Suma un escaneo al contador diario del usuario y devuelve el total, o -1 si ya superó p_limit.';
