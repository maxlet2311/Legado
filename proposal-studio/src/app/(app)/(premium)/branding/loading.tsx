import { ContentContainer } from "@/components/layout/content-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function BrandingLoading() {
  return (
    <ContentContainer className="max-w-240">
      <Skeleton className="h-12 w-64 rounded-md" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </ContentContainer>
  );
}
