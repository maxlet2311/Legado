"use client";

import { useId } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

interface RichTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  hint?: string;
  required?: boolean;
  className?: string;
}

function RichTextarea({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 8000,
  rows = 6,
  hint,
  required,
  className,
}: RichTextareaProps) {
  const id = useId();

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-error"> *</span>}
        </Label>
        <span className="text-caption text-outline">
          {value.length}/{maxLength}
        </span>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        rows={rows}
      />
      {hint && <p className="text-caption text-on-surface-variant">{hint}</p>}
    </div>
  );
}

export { RichTextarea };
