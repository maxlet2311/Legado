import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  description?: string;
  href?: string;
  tone?: "default" | "warning" | "error";
}

const TONE_CLASSES: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "text-on-surface",
  warning: "text-warning",
  error: "text-error",
};

function MetricCard({ icon: Icon, label, value, description, href, tone = "default" }: MetricCardProps) {
  const content = (
    <div className="flex h-full flex-col gap-2 rounded-xl border border-outline-variant bg-surface p-5">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Icon className="h-4 w-4" />
        <p className="text-caption font-semibold uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-h2 font-bold ${TONE_CLASSES[tone]}`}>{value}</p>
      {description ? <p className="text-caption text-on-surface-variant">{description}</p> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}

export { MetricCard };
