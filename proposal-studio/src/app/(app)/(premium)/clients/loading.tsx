import { ContentContainer } from "@/components/layout/content-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientsLoading() {
  return (
    <ContentContainer className="max-w-240">
      <Skeleton className="h-12 w-64 rounded-md" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </ContentContainer>
  );
}
