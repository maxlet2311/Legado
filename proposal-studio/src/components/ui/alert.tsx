import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 text-small transition-all duration-base ease-premium flex items-start gap-3.5",
  {
    variants: {
      variant: {
        info: "bg-surface-container-low border-primary/20 text-on-surface [&>svg]:text-primary",
        success: "bg-secondary-container/30 border-secondary/30 text-on-surface [&>svg]:text-secondary",
        warning: "bg-warning/10 border-warning/30 text-on-surface [&>svg]:text-warning",
        error: "bg-error-container/40 border-error/30 text-on-surface [&>svg]:text-error",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  onClose?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", title, children, onClose, ...props }, ref) => {
    const Icon = iconMap[variant ?? "info"];
    const role = variant === "error" || variant === "warning" ? "alert" : "status";

    return (
      <div
        ref={ref}
        role={role}
        aria-live={role === "alert" ? "assertive" : "polite"}
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 space-y-1">
          {title && <h5 className="font-semibold leading-tight text-on-surface">{title}</h5>}
          <div className="text-small text-on-surface-variant leading-relaxed">{children}</div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar notificación"
            className="text-on-surface-variant hover:text-on-surface rounded p-1 hover:bg-surface-container-high transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
Alert.displayName = "Alert";

export { Alert, alertVariants };
