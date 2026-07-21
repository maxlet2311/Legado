import { ContentContainer } from "@/components/layout/content-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function MembershipLoading() {
  return (
    <ContentContainer>
      <Skeleton className="h-12 w-64 rounded-md" />
      <Skeleton className="h-80 max-w-md rounded-xl" />
    </ContentContainer>
  );
}
