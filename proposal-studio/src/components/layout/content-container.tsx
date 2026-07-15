import { cn } from "@/lib/utils/cn";

function ContentContainer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-360 space-y-12", className)} {...props} />;
}

export { ContentContainer };
