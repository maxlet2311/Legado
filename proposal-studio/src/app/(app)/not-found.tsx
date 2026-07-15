import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { ContentContainer } from "@/components/layout/content-container";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <ContentContainer>
      <EmptyState
        icon={FileQuestion}
        title="No encontramos lo que buscabas"
        description="El recurso no existe o no tenés acceso a él."
        action={
          <Button asChild>
            <Link href="/dashboard">Volver al Panel de Control</Link>
          </Button>
        }
      />
    </ContentContainer>
  );
}
