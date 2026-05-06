import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type RouteSkeletonVariant =
  | "generic"
  | "auth"
  | "dashboard"
  | "bookings"
  | "approvals"
  | "detail"
  | "accounts"
  | "settings"
  | "spaces"
  | "venue-detail"
  | "calendar"
  | "booking-form";

type RouteLoadingSkeletonProps = {
  fullScreen?: boolean;
  className?: string;
  variant?: RouteSkeletonVariant;
};

function PageShell({
  children,
  className,
  fullScreen,
}: {
  children: React.ReactNode;
  className?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-6 p-4 lg:p-8",
        fullScreen && "min-h-screen bg-background",
        className,
      )}
    >
      {children}
    </div>
  );
}

function HeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-3">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: actions }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-32" />
        ))}
      </div>
    </div>
  );
}

function CardShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card/80 p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

function StatCards({ count = 4 }: { count?: number }) {
  return (
    <div className={cn("grid gap-4", count === 3 ? "md:grid-cols-3" : "md:grid-cols-4")}>
      {Array.from({ length: count }).map((_, index) => (
        <CardShell key={index} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardShell>
      ))}
    </div>
  );
}

function RequestSummarySkeleton() {
  return (
    <CardShell className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-72 max-w-full" />
          <Skeleton className="h-4 w-48 max-w-full" />
          <Skeleton className="h-4 w-[32rem] max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 rounded-md" />
        ))}
      </div>
    </CardShell>
  );
}

function SectionCardSkeleton({
  rows = 3,
  grid = false,
}: {
  rows?: number;
  grid?: boolean;
}) {
  return (
    <CardShell className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className={cn("gap-3", grid ? "grid md:grid-cols-2" : "space-y-3")}>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </CardShell>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <StatCards />
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCardSkeleton rows={1} />
        <SectionCardSkeleton rows={1} />
      </div>
      <SectionCardSkeleton rows={2} />
    </>
  );
}

function ListPageSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <>
      <HeaderSkeleton />
      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <CardShell key={sectionIndex} className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <RequestSummarySkeleton />
          <RequestSummarySkeleton />
        </CardShell>
      ))}
    </>
  );
}

function DetailSkeleton() {
  return (
    <>
      <HeaderSkeleton actions={4} />
      <Skeleton className="h-10 w-56" />
      <RequestSummarySkeleton />
      <SectionCardSkeleton rows={3} grid />
      <SectionCardSkeleton rows={12} grid />
      <SectionCardSkeleton rows={5} grid />
    </>
  );
}

function AccountsSkeleton() {
  return (
    <>
      <HeaderSkeleton actions={2} />
      <CardShell className="space-y-4 overflow-hidden">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-60" />
        </div>
        <div className="min-w-[760px] space-y-2">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 rounded-md bg-muted/50 p-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-4" />
            ))}
          </div>
          {Array.from({ length: 7 }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 border-t p-3"
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-9" />
              ))}
            </div>
          ))}
        </div>
      </CardShell>
    </>
  );
}

function SettingsSkeleton() {
  return (
    <>
      <HeaderSkeleton actions={0} />
      <SectionCardSkeleton rows={1} />
      <SectionCardSkeleton rows={7} grid />
    </>
  );
}

function SpacesSkeleton() {
  return (
    <>
      <HeaderSkeleton actions={1} />
      <SectionCardSkeleton rows={2} grid />
      <SectionCardSkeleton rows={2} />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <CardShell key={index} className="space-y-4 overflow-hidden p-0">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="space-y-3 p-5 pt-0">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-9 w-full" />
            </div>
          </CardShell>
        ))}
      </div>
    </>
  );
}

function VenueDetailSkeleton() {
  return (
    <>
      <HeaderSkeleton actions={2} />
      <Skeleton className="h-80 w-full rounded-lg lg:h-[32rem]" />
      <div className="space-y-3">
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-4 w-[42rem] max-w-full" />
      </div>
      <Skeleton className="h-10 w-72" />
      <StatCards count={3} />
    </>
  );
}

function CalendarSkeleton() {
  return (
    <>
      <CardShell className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
          {Array.from({ length: 42 }).map((_, index) => (
            <div key={index} className="min-h-28 space-y-2 bg-card p-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              {index % 3 === 0 && <Skeleton className="h-6 w-full" />}
              {index % 5 === 0 && <Skeleton className="h-6 w-4/5" />}
            </div>
          ))}
        </div>
      </CardShell>
    </>
  );
}

function BookingFormSkeleton() {
  return (
    <>
      <HeaderSkeleton actions={0} />
      <Skeleton className="h-16 w-full" />
      <CardShell className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className={cn("h-12", index > 5 && "md:col-span-2")} />
          ))}
        </div>
      </CardShell>
      <SectionCardSkeleton rows={6} grid />
    </>
  );
}

function AuthSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <CardShell className="w-full max-w-md space-y-6">
        <div className="mx-auto space-y-4 text-center">
          <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
          <Skeleton className="mx-auto h-8 w-56" />
          <Skeleton className="mx-auto h-4 w-72 max-w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </CardShell>
    </div>
  );
}

function GenericSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <StatCards count={3} />
      <SectionCardSkeleton rows={4} />
    </>
  );
}

export default function RouteLoadingSkeleton({
  fullScreen = false,
  className,
  variant = "generic",
}: RouteLoadingSkeletonProps) {
  if (variant === "auth") return <AuthSkeleton />;

  const content = {
    generic: <GenericSkeleton />,
    auth: null,
    dashboard: <DashboardSkeleton />,
    bookings: <ListPageSkeleton sections={3} />,
    approvals: <ListPageSkeleton sections={2} />,
    detail: <DetailSkeleton />,
    accounts: <AccountsSkeleton />,
    settings: <SettingsSkeleton />,
    spaces: <SpacesSkeleton />,
    "venue-detail": <VenueDetailSkeleton />,
    calendar: <CalendarSkeleton />,
    "booking-form": <BookingFormSkeleton />,
  }[variant];

  return (
    <PageShell className={className} fullScreen={fullScreen}>
      {content}
    </PageShell>
  );
}

