import { Skeleton } from "@/components/ui/skeleton";

/**
 * Cubre todas las subrutas de `/admin/**` que no tienen su propio
 * `loading.tsx` (Next.js solo envuelve `page.tsx` y sus hijos en el
 * Suspense boundary — la nav de `admin/layout.tsx` ya renderizó antes de
 * llegar acá, así que la barra de navegación admin nunca parpadea).
 */
export default function AdminSectionLoading() {
  return (
    <div className="mx-auto max-w-360 space-y-6">
      <Skeleton className="h-10 w-64 rounded-md" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
