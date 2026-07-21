import { ContentContainer } from "@/components/layout/content-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewProposalLoading() {
  return (
    <ContentContainer className="max-w-240">
      <Skeleton className="h-16 w-96 rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </ContentContainer>
  );
}
