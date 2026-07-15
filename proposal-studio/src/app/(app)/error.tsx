"use client";

import { TriangleAlert } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ContentContainer>
      <EmptyState
        icon={TriangleAlert}
        title="Ocurrió un error inesperado"
        description="Algo falló al cargar esta página. Podés intentar de nuevo."
        action={<Button onClick={reset}>Reintentar</Button>}
      />
    </ContentContainer>
  );
}
