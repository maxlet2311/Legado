import { redirect } from "next/navigation";

/**
 * `/admin` no tiene una pantalla de resumen propia (Lote A). En vez de un
 * 404 al entrar por el link "Administración" del sidebar, redirige a la
 * pantalla admin más completa hoy (`/admin/memberships`) — mismo criterio
 * documentado en `docs/ADMIN_UI_MAP.md` sección 4.1.
 */
export default function AdminIndexPage() {
  redirect("/admin/memberships");
}
