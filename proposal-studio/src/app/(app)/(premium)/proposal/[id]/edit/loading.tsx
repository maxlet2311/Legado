import { Skeleton } from "@/components/ui/skeleton";

/**
 * Evita el parpateo en blanco al entrar al editor mientras hidrata el store
 * (auditoría del editor, hallazgo de "Autosave"). El esqueleto refleja la
 * forma real del layout (outline + tarjeta + footer) para que no haya salto
 * de layout cuando el contenido real reemplaza esto.
 */
export default function ProposalEditLoading() {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col">
      <div className="flex items-center justify-end border-b border-outline-variant bg-surface px-4 py-2 sm:px-8">
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-8 sm:px-8 lg:flex-row lg:gap-10">
        <div className="w-full space-y-2 lg:w-64 lg:shrink-0">
          <Skeleton className="h-1.5 w-full rounded-full" />
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-md" />
          ))}
        </div>
        <div className="mx-auto w-full max-w-240 space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
      <div className="sticky bottom-0 border-t border-outline-variant bg-surface px-4 py-4 sm:px-8">
        <Skeleton className="h-10 w-full max-w-240 rounded-md" />
      </div>
    </div>
  );
}
