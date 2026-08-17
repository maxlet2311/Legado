import { ContentContainer } from "@/components/layout/content-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <ContentContainer className="max-w-[1560px] space-y-7">
      <div className="flex items-end justify-between gap-5">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-11 w-72 rounded-lg" />
          <Skeleton className="h-5 w-[30rem] max-w-full rounded-md" />
        </div>
        <Skeleton className="hidden h-10 w-44 rounded-lg sm:block" />
      </div>
      {/* key={index} es intencional: placeholders estáticos sin identidad ni reordenamiento. */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-[28rem] w-full rounded-xl" />
        <div className="space-y-6">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      </div>
    </ContentContainer>
  );
}
