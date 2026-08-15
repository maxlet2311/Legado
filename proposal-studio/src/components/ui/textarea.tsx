import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-32 w-full rounded-md border border-outline-variant bg-surface px-4 py-3 text-body text-on-surface placeholder:text-outline transition-colors duration-base ease-premium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "read-only:cursor-default read-only:border-outline-variant/40 read-only:bg-surface-container-low read-only:focus-visible:ring-0 read-only:focus-visible:border-outline-variant/40",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
