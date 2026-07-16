-- `idx_profiles_platform_owner` quedó de un intento anterior de esta misma
-- migración (columna completa, sin WHERE, sin unicidad): no aporta nada que
-- `profiles_single_platform_owner_idx` (parcial, único, y es la restricción
-- real de negocio) no cubra ya. Tabla chica, sin ninguna consulta real que lo
-- necesite — lo confirma el advisor de performance de Supabase (unused_index).
drop index if exists public.idx_profiles_platform_owner;
