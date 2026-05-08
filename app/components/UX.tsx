import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Info,
  Loader2,
  SearchX,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "default" | "info" | "success" | "warning" | "danger" | "muted";

const toneClasses: Record<Tone, string> = {
  default: "border-border bg-card text-card-foreground",
  info: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-200",
  success:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  danger:
    "border-destructive/30 bg-destructive/10 text-destructive dark:text-red-200",
  muted: "border-border bg-muted/50 text-muted-foreground",
};

const iconToneClasses: Record<Tone, string> = {
  default: "bg-primary/10 text-primary",
  info: "bg-sky-500/12 text-sky-600 dark:text-sky-300",
  success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
  warning: "bg-amber-500/14 text-amber-700 dark:text-amber-300",
  danger: "bg-destructive/12 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

export function formatStatusLabel(status?: string | null) {
  return String(status || "Unknown")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function statusTone(status?: string | null): Tone {
  const value = String(status || "").toUpperCase();
  if (
    [
      "APPROVED",
      "ACTIVE",
      "PROVIDED",
      "RETURNED",
      "COMPLETED",
      "SUCCESS",
    ].includes(value)
  ) {
    return "success";
  }
  if (
    [
      "REJECTED",
      "CANCELLED",
      "INACTIVE",
      "DELETE",
      "DELETED",
      "FAILED",
    ].includes(value)
  ) {
    return "danger";
  }
  if (
    [
      "PENDING",
      "SUBMITTED",
      "IN_REVIEW",
      "REQUESTED",
      "READY",
      "RETURN_REQUESTED",
    ].includes(value)
  ) {
    return "info";
  }
  if (
    [
      "DRAFT",
      "RETURNED_FOR_REVISION",
      "RETURNED",
      "UNDER_MAINTENANCE",
      "WARNING",
    ].includes(value)
  ) {
    return "warning";
  }
  return "muted";
}

export function StatusBadge({
  status,
  label,
  tone,
  className,
}: {
  status?: string | null;
  label?: string;
  tone?: Tone;
  className?: string;
}) {
  const resolvedTone = tone || statusTone(status);

  return (
    <Badge
      variant="outline"
      className={cn(
        "border px-2.5 py-1 font-semibold",
        toneClasses[resolvedTone],
        className,
      )}
    >
      {label || formatStatusLabel(status)}
    </Badge>
  );
}

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1500px] space-y-6 p-4 lg:p-8", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  backHref,
  backLabel = "Back",
  icon,
  className,
}: {
  title: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {backHref && (
          <Button asChild variant="outline" size="sm" className="mb-1 w-fit">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        )}
        {eyebrow && (
          <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-normal text-foreground sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 md:justify-end">{actions}</div>}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed bg-muted/25 p-8 text-center",
        className,
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-sm">
        {icon || <SearchX className="h-6 w-6" />}
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorStateCard({
  title = "Something went wrong",
  description,
  action,
  className,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-destructive/30", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {action && <CardContent>{action}</CardContent>}
    </Card>
  );
}

export function InlineLoadingState({
  label = "Loading",
  description,
  className,
}: {
  label?: string;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <div>
        <p className="font-medium text-foreground">{label}</p>
        {description && <p className="text-xs">{description}</p>}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  description,
  icon,
  tone = "default",
  href,
  actionLabel,
  className,
  valueClassName,
}: {
  label: string;
  value?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  href?: string;
  actionLabel?: string;
  className?: string;
  valueClassName?: string;
}) {
  const content = (
    <Card
      className={cn(
        "panel-hover h-full overflow-hidden",
        href && "cursor-pointer",
        className,
      )}
    >
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {value !== undefined && value !== null && value !== "" && (
              <p
                className={cn(
                  "mt-2 text-3xl font-bold text-foreground",
                  valueClassName,
                )}
              >
                {value}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              iconToneClasses[tone],
            )}
          >
            {icon || <CircleDashed className="h-5 w-5" />}
          </div>
        </div>
        {(description || actionLabel) && (
          <div className="mt-auto flex items-center justify-between gap-3 text-sm">
            {description && (
              <p className="line-clamp-2 text-muted-foreground">{description}</p>
            )}
            {actionLabel && (
              <span className="ml-auto inline-flex items-center gap-1 font-semibold text-primary">
                {actionLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return href ? (
    <Link
      href={href}
      className="block h-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {content}
    </Link>
  ) : (
    content
  );
}

export function FormSection({
  title,
  description,
  icon,
  children,
  aside,
  className,
  contentClassName,
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
              </div>
            )}
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription className="mt-1">{description}</CardDescription>}
            </div>
          </div>
          {aside}
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
  icon,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const defaultIcon =
    tone === "success" ? (
      <CheckCircle2 className="h-4 w-4" />
    ) : tone === "danger" ? (
      <XCircle className="h-4 w-4" />
    ) : tone === "warning" ? (
      <AlertTriangle className="h-4 w-4" />
    ) : (
      <Info className="h-4 w-4" />
    );

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 text-sm",
        toneClasses[tone],
        className,
      )}
    >
      <div className="mt-0.5 shrink-0">{icon || defaultIcon}</div>
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn("leading-6", title && "mt-1")}>{children}</div>}
      </div>
    </div>
  );
}
