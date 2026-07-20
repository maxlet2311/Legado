import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  className?: string;
}

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label="Cargando"
      className={cn("h-4 w-4 animate-spin text-on-surface-variant", className)}
      {...props}
    />
  );
}

export { Spinner };
