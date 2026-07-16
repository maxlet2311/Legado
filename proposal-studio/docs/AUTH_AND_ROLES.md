# Auth y roles

## `role` vs. `is_platform_owner`

`public.profiles` separa dos conceptos distintos:

| Campo | Qué es | Valores | Quién lo puede tener |
|---|---|---|---|
| `role` | Función operativa dentro del producto. | `'admin'` \| `'advisor'` (CHECK constraint) | Cualquier usuario |
| `is_platform_owner` | Propiedad máxima de la plataforma. No es un rol operativo — es una bandera ortogonal a `role`. | `boolean`, default `false` | **Como máximo un usuario a la vez** (índice único parcial `profiles_single_platform_owner_idx`) |

Un usuario con `role = 'admin'` **no** es automáticamente el platform owner. El platform owner, en esta V1, siempre tiene además `role = 'admin'` (ver `isPlatformOwner()` en `src/lib/auth/authorization.ts`), pero no todo admin es owner.

## Alta de usuarios nuevos

El trigger `handle_new_user()` (dispara al insertarse en `auth.users`) crea el perfil con valores explícitos, **ignorando cualquier campo privilegiado que venga en `raw_user_meta_data`**:

- `role`: siempre `'advisor'`.
- `is_active`: siempre `true`.
- `is_platform_owner`: siempre `false`.
- `full_name`: única excepción — se toma de `raw_user_meta_data->>'full_name'` (o el email como fallback) porque no es un campo privilegiado.

Un usuario nunca puede autoasignarse `admin` ni `is_platform_owner = true` durante el signup, sin importar qué metadata envíe el cliente al crear la cuenta.

## RLS de `profiles`

- `profiles_select_own` (`SELECT`): un usuario solo ve su propia fila.
- `profiles_insert_own` (`INSERT`): solo permite insertar la fila propia (en la práctica la crea el trigger `handle_new_user`, que corre `SECURITY DEFINER`).
- **No existe policy de `UPDATE` para `authenticated`.** Se eliminó deliberadamente (`profiles_update_own` original permitía actualizar la fila propia sin restricción de columnas: un usuario podía escribir su propio `role`, `is_active`, `is_platform_owner` o `user_id`). Postgres RLS no puede acotar columnas específicas dentro de una misma policy de `UPDATE` de forma simple.

En su lugar, la única forma de que un usuario edite su propio perfil es la RPC `update_own_profile(p_full_name)`:
- valida `auth.uid()` internamente;
- solo puede tocar `full_name` (y `updated_at`);
- es `SECURITY DEFINER` (necesario para poder ejecutar el `UPDATE` ya que no hay policy de RLS que lo permita) pero está armada para no aceptar ni exponer ningún campo privilegiado como parámetro.
- Hoy (2026-07-16) **no hay ninguna pantalla que la use** — quedó preparada para cuando exista edición de perfil desde el frontend.

Cambiar `role`, `is_active` o `is_platform_owner` de cualquier usuario solo puede hacerse hoy vía SQL administrativo (migración o consola de Supabase) — no hay, ni debe agregarse sin pedido explícito, una RPC de cambio de rol callable por usuarios comunes.

## Helpers de autorización (TypeScript)

- `src/lib/auth/authorization.ts` — funciones **puras**, sin dependencias de servidor (se pueden importar desde componentes cliente para mostrar una etiqueta, por ejemplo):
  - `isAdmin(profile)`
  - `isPlatformOwner(profile)`
  - `canAccessAdminArea(profile)` (`is_active && role === 'admin'`)
- `src/lib/auth/authorization-guards.ts` — guards **server-only** (importan `requireSession`, que a su vez usa `server-only`; no se pueden usar desde un componente cliente):
  - `requireActiveUser()` — guard central: exige sesión válida (usuario + profile) con `is_active === true`. Devuelve `{ user, profile }`. Es la base de los otros dos guards, pero también **debe llamarse directamente en cualquier Server Action, Route Handler o página que lea o mute datos privados** — no solo en las rutas de admin/owner.
  - `requireAdmin()` — `requireActiveUser()` + `role === 'admin'`. Lanza `ForbiddenError` si no se cumple.
  - `requirePlatformOwner()` — `requireActiveUser()` + `isPlatformOwner`. Lanza `ForbiddenError` si no se cumple.

Ninguno de los tres guards confía en el cliente: todos vuelven a resolver la sesión contra el servidor de Supabase Auth (`supabase.auth.getUser()`, nunca solo cookies) en cada invocación, reutilizando la memoización por request de `requireSession` (no hay llamadas duplicadas). **Ocultar un botón en la UI no reemplaza llamar al guard correspondiente antes de ejecutar la acción en el servidor.**

Hoy no existe ningún panel administrativo ni Server Action exclusiva de admin/owner en el producto — `requireAdmin`/`requirePlatformOwner` quedan preparados y documentados para cuando se agregue uno. `requireActiveUser()` sí está en uso activo: todas las Server Actions y Route Handlers privados del producto (clientes, branding, propuestas, wizard, emisión de versiones, PDF, descarga) lo llaman antes de tocar datos.

### Por qué no alcanza con el middleware

`middleware.ts` revalida `is_active` para navegación de página (redirige a `/login?error=inactive` si cambió a `false` a mitad de sesión), pero solo cubre los prefijos listados en `PROTECTED_PREFIXES` — **no cubre `/api/**`**. Los Route Handlers bajo `src/app/api/` (descarga y generación de PDF) no pasan por ese chequeo del middleware, así que dependen enteramente de `requireActiveUser()` dentro del propio handler. Esto es intencional: es la razón por la que el guard debe llamarse en cada mutación/lectura privada y no asumirse cubierto por una capa anterior.

## Matriz de permisos (V1)

| | Platform owner | Admin operativo | Advisor |
|---|---|---|---|
| Dashboard, clientes propios, propuestas propias, branding propio, biblioteca | ✅ | ✅ | ✅ |
| Gestión global de usuarios / asignación de roles / activar-desactivar cuentas | ✅ (futuro) | ❌ | ❌ |
| Configuración global / feature flags / mantenimiento | ✅ (futuro) | ❌ | ❌ |
| Templates de sistema / auditoría global | ✅ (futuro) | ❌ | ❌ |
| Leer propuestas/clientes de **otros** usuarios | ❌ (salvo función de soporte explícita, no existe hoy) | ❌ | ❌ |

El platform owner **no** se salta el aislamiento de datos (RLS) de otros usuarios por el solo hecho de ser el owner. Ser dueño de la plataforma no implica acceso a datos privados ajenos salvo que en el futuro se implemente una función de soporte/auditoría explícita y separada.

## Usuario inactivo

`is_active = false` bloquea el acceso sin importar `role` ni `is_platform_owner`:
- `signInAction` cierra la sesión inmediatamente si `is_active === false`.
- El middleware revalida `is_active` en cada request a una ruta protegida (`PROTECTED_PREFIXES`) y redirige a `/login?error=inactive` si cambió a `false` a mitad de sesión.
- `requireActiveUser()` (y por lo tanto `requireAdmin()`/`requirePlatformOwner()`) también lo exige explícitamente, incluyendo en Route Handlers bajo `/api/**` que el middleware no cubre.

## Transferencia de propiedad (procedimiento, no implementado como UI)

No existe pantalla para esto en esta V1. El procedimiento SQL transaccional para transferir `is_platform_owner` a otro usuario:

```sql
BEGIN;

-- Verificar primero que el nuevo owner exista y esté activo:
-- SELECT id FROM public.profiles WHERE user_id = '<NEW_OWNER_USER_ID>' AND is_active = true;
-- Si no existe o no está activo, ABORTAR y no continuar.

UPDATE public.profiles
SET is_platform_owner = false, updated_at = now()
WHERE is_platform_owner = true;

UPDATE public.profiles
SET role = 'admin', is_platform_owner = true, is_active = true, updated_at = now()
WHERE user_id = '<NEW_OWNER_USER_ID>';

COMMIT;
```

Importante: quitar al owner actual y asignar al nuevo debe hacerse en la misma transacción, y **siempre** validar que el nuevo perfil existe antes de quitarle la propiedad al actual — de lo contrario la plataforma queda sin owner. Si en el futuro se agrega una UI para esto, debe implementarse como una única función `transfer_platform_owner(p_new_owner_user_id uuid)` (`SECURITY DEFINER`, invocable únicamente por el owner actual vía `requirePlatformOwner()`) que haga ambas validaciones y ambos `UPDATE` atómicamente — no se implementa ahora por no ser necesaria todavía.

## Migraciones relevantes

- `20260716010000_platform_owner.sql` — agrega `is_platform_owner`, asigna al owner inicial, crea el índice único parcial, actualiza `handle_new_user`, revoca el `UPDATE` amplio de `profiles` y crea `update_own_profile`.
- `20260716010100_drop_redundant_platform_owner_index.sql` — limpieza de un índice booleano completo (no parcial) que quedó de un intento anterior de la migración anterior; no aportaba nada sobre el índice único parcial ya existente.
