import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-caption font-semibold",
  {
    variants: {
      variant: {
        draft: "bg-surface-container-highest text-on-surface-variant",
        completed: "bg-secondary-container text-on-secondary-container",
        exported: "bg-primary-fixed text-on-primary-fixed",
        archived: "bg-surface-variant text-on-surface-variant",
        featured: "bg-tertiary-container text-on-tertiary-container",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        error: "bg-error-container text-on-error-container",
      },
    },
    defaultVariants: {
      variant: "draft",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
