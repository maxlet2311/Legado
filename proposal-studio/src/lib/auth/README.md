# `src/lib/auth`

- `session.ts` — resuelve usuario + perfil una vez por request (`requireSession`), cacheado con `React.cache`. No expone un helper que solo valide autenticación sin `is_active`: usar siempre `requireActiveUser`.
- `actions.ts` — Server Actions de login/logout/recuperación de contraseña.
- `authorization.ts` — helpers puros de autorización (`isAdmin`, `isPlatformOwner`, `canAccessAdminArea`). Sin dependencias de servidor: se pueden importar desde componentes cliente.
- `authorization-guards.ts` — guards server-only:
  - `requireActiveUser()` — guard base: exige sesión válida + `profile.is_active === true`. Reutiliza la caché de `requireSession` (sin llamadas duplicadas a Supabase Auth). Debe llamarse en toda Server Action, Route Handler o página que lea o mute datos privados — el middleware ya revalida `is_active` para rutas de página, pero no cubre `/api/**` ni reemplaza el chequeo dentro de la propia mutación (defensa en profundidad).
  - `requireAdmin()` — `requireActiveUser()` + `role === 'admin'`. Lanza `ForbiddenError` si no se cumple.
  - `requirePlatformOwner()` — `requireActiveUser()` + `is_platform_owner === true`. Lanza `ForbiddenError` si no se cumple.

Ninguno de los tres guards confía en el cliente: todos vuelven a resolver la sesión contra el servidor de Supabase Auth (`supabase.auth.getUser()`, nunca solo cookies). **Ocultar un botón en la UI no reemplaza llamar al guard correspondiente antes de ejecutar la acción en el servidor.**

Ver `docs/AUTH_AND_ROLES.md` para la documentación completa de roles, RLS de `profiles` y la matriz de permisos.
