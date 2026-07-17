import { ContentContainer } from "@/components/layout/content-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <ContentContainer>
      <Skeleton className="h-56 w-full rounded-xl" />
      {/* key={index} es intencional: placeholders estáticos sin identidad ni reordenamiento. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </ContentContainer>
  );
}
