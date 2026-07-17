import { ContentContainer } from "@/components/layout/content-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProposalDetailLoading() {
  return (
    <ContentContainer className="max-w-240">
      <Skeleton className="h-12 w-96 rounded-md" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </ContentContainer>
  );
}
