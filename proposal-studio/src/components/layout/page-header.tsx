import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}

function PageHeader({ title, description, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav className="flex items-center gap-1 text-small text-on-surface-variant">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-primary">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-on-surface">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-bold tracking-tight text-on-surface">{title}</h1>
          {description ? (
            <p className="mt-1 text-body text-on-surface-variant">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}

export { PageHeader };
