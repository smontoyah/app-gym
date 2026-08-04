-- Prescripción del entrenador: columnas nullable, 100% retrocompatible.
alter table public.routines
  add column if not exists target_reps    text,
  add column if not exists rest_seconds   integer,
  add column if not exists cadence        text,
  add column if not exists superset_group text,
  add column if not exists notes          text;

comment on column public.routines.target_reps    is 'Repeticiones objetivo prescritas por el entrenador';
comment on column public.routines.rest_seconds   is 'Descanso prescrito entre series; 0 = super serie encadenada';
comment on column public.routines.cadence        is 'Cadencia concentrica-isometrica-excentrica';
comment on column public.routines.superset_group is 'Misma etiqueta = misma super serie';
