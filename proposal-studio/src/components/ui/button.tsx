import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-small font-semibold transition-all duration-base ease-premium disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:opacity-90 active:scale-press",
        secondary:
          "bg-surface text-on-surface border border-outline-variant hover:bg-surface-container-low active:scale-press",
        ghost: "text-on-surface-variant hover:bg-surface-container-low active:scale-press",
        danger: "bg-error text-on-error hover:opacity-90 active:scale-press",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-9 px-4",
        icon: "h-10 w-10",
        "icon-lg": "h-auto w-auto p-1.5 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
