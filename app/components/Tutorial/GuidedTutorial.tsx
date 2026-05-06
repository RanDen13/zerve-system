"use client";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Map,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  saveTutorialProgress,
  startTutorialProgress,
  type TutorialProgressStatus,
} from "./TutorialActions";

type AppRole = "OFFICER" | "APPROVER" | "ADMIN" | "SUPER_ADMIN";

type TutorialStep = {
  id: string;
  title: string;
  body: string;
  selector?: string;
  href?: string;
  actionLabel?: string;
};

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const TERMS_VERSION = "2026-05";
const START_EVENT = "zerve:start-tutorial";

const commonClosingSteps: TutorialStep[] = [
  {
    id: "settings",
    title: "Settings",
    body: "Open Settings to change your password and choose whether workflow updates are sent to your email.",
    selector: '[data-tour="nav-settings"]',
    href: "/user/settings",
    actionLabel: "Open Settings",
  },
  {
    id: "retry",
    title: "Replay the guide",
    body: "This Settings area starts the tutorial again for your current role. Finishing or cancelling it will be saved to your account.",
    selector: '[data-tour="settings-tutorial"]',
    href: "/user/settings",
    actionLabel: "Open Settings",
  },
];

const roleSteps: Record<Exclude<AppRole, "SUPER_ADMIN">, TutorialStep[]> = {
  OFFICER: [
    {
      id: "dashboard-nav",
      title: "Dashboard",
      body: "Use Dashboard as your home tab. It summarizes your reservations, messages, approval progress, and recent notifications.",
      selector: '[data-tour="nav-dashboard"]',
      href: "/user/dashboard",
      actionLabel: "Open Dashboard",
    },
    {
      id: "dashboard-summary",
      title: "Your activity at a glance",
      body: "These counters show current requests, old records, approved bookings, and private threads connected to your submissions.",
      selector: '[data-tour="dashboard-summary"]',
      href: "/user/dashboard",
      actionLabel: "Open Dashboard",
    },
    {
      id: "bookings-nav",
      title: "Bookings",
      body: "Click Bookings to work on drafts, track submitted requests, and reopen old reservation records.",
      selector: '[data-tour="nav-bookings"]',
      href: "/user/bookings",
      actionLabel: "Open Bookings",
    },
    {
      id: "bookings-tabs",
      title: "Booking tabs",
      body: "Pending keeps drafts, submitted requests, and revisions. Old keeps approved, rejected, and cancelled requests.",
      selector: '[data-tour="bookings-tabs"]',
      href: "/user/bookings",
      actionLabel: "Open Bookings",
    },
    {
      id: "venues-nav",
      title: "Venues",
      body: "Click Venues to browse spaces, compare capacity, check blocks, and open venue details before you reserve.",
      selector: '[data-tour="nav-spaces"]',
      href: "/user/spaces",
      actionLabel: "Open Venues",
    },
    {
      id: "create-booking",
      title: "Create a booking",
      body: "Click Create Booking to start the SAPF form. Pick venues and schedules, fill the activity parts, choose approvers, then save or submit.",
      selector: '[data-tour="spaces-create-booking"]',
      href: "/user/spaces",
      actionLabel: "Open Venues",
    },
    {
      id: "calendar-nav",
      title: "Calendar",
      body: "Click Calendar before choosing dates. It shows approved reservations, pending reservations, and blocked venue times.",
      selector: '[data-tour="nav-calendar"]',
      href: "/user/calendar",
      actionLabel: "Open Calendar",
    },
    {
      id: "calendar-main",
      title: "Calendar view",
      body: "Use the calendar controls to move through months or days and spot schedule conflicts before submitting a request.",
      selector: '[data-tour="calendar-main"]',
      href: "/user/calendar",
      actionLabel: "Open Calendar",
    },
    ...commonClosingSteps,
  ],
  APPROVER: [
    {
      id: "dashboard-nav",
      title: "Dashboard",
      body: "Use Dashboard as your review home. It summarizes requests connected to you, pending approvals, and recent notifications.",
      selector: '[data-tour="nav-dashboard"]',
      href: "/user/dashboard",
      actionLabel: "Open Dashboard",
    },
    {
      id: "dashboard-summary",
      title: "Review workload",
      body: "These counters help you scan active requests, old records, approved activities, and private concern threads.",
      selector: '[data-tour="dashboard-summary"]',
      href: "/user/dashboard",
      actionLabel: "Open Dashboard",
    },
    {
      id: "bookings-nav",
      title: "Bookings",
      body: "Click Bookings to open your approval queue and requests you are following through the workflow.",
      selector: '[data-tour="nav-bookings"]',
      href: "/user/bookings",
      actionLabel: "Open Bookings",
    },
    {
      id: "review-tabs",
      title: "Review tabs",
      body: "Pending is for items waiting on you. Following tracks requests where you are in the chain. Old keeps closed records.",
      selector: '[data-tour="bookings-tabs"]',
      href: "/user/bookings",
      actionLabel: "Open Bookings",
    },
    {
      id: "request-view",
      title: "Open a request",
      body: "Click View on a request to inspect details, activity, concern threads, and the approve or return controls when it is your turn.",
      selector: '[data-tour="bookings-tabs"]',
      href: "/user/bookings",
      actionLabel: "Open Bookings",
    },
    {
      id: "calendar-nav",
      title: "Calendar",
      body: "Click Calendar to see venue schedules while reviewing whether a request fits the available dates and times.",
      selector: '[data-tour="nav-calendar"]',
      href: "/user/calendar",
      actionLabel: "Open Calendar",
    },
    {
      id: "venues-nav",
      title: "Venues",
      body: "Click Venues to check venue details, capacity, availability, and university-wide blocked schedules.",
      selector: '[data-tour="nav-spaces"]',
      href: "/user/spaces",
      actionLabel: "Open Venues",
    },
    ...commonClosingSteps,
  ],
  ADMIN: [
    {
      id: "dashboard-nav",
      title: "Dashboard",
      body: "Use Dashboard as your operational home for requests, review progress, notifications, and recent workflow activity.",
      selector: '[data-tour="nav-dashboard"]',
      href: "/user/dashboard",
      actionLabel: "Open Dashboard",
    },
    {
      id: "dashboard-summary",
      title: "System workload",
      body: "These counters summarize active requests, old records, approved bookings, and private threads connected to your account.",
      selector: '[data-tour="dashboard-summary"]',
      href: "/user/dashboard",
      actionLabel: "Open Dashboard",
    },
    {
      id: "bookings-nav",
      title: "Bookings",
      body: "Click Bookings to review pending items, follow active workflows, and inspect old reservation records.",
      selector: '[data-tour="nav-bookings"]',
      href: "/user/bookings",
      actionLabel: "Open Bookings",
    },
    {
      id: "admin-tabs",
      title: "Admin review tabs",
      body: "Pending shows items ready for review. Following keeps active requests you are connected to. Old keeps final records.",
      selector: '[data-tour="bookings-tabs"]',
      href: "/user/bookings",
      actionLabel: "Open Bookings",
    },
    {
      id: "calendar-nav",
      title: "Calendar",
      body: "Click Calendar to watch campus-wide venue usage, pending reservations, and blocked schedules.",
      selector: '[data-tour="nav-calendar"]',
      href: "/user/calendar",
      actionLabel: "Open Calendar",
    },
    {
      id: "venues-nav",
      title: "Venues",
      body: "Click Venues to browse spaces, check capacity, and confirm university-wide blocks. Super admins handle venue record management.",
      selector: '[data-tour="nav-spaces"]',
      href: "/user/spaces",
      actionLabel: "Open Venues",
    },
    ...commonClosingSteps,
  ],
};

function isVisible(element: Element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity) !== 0
  );
}

function findVisibleTarget(selector?: string) {
  if (!selector || typeof document === "undefined") return null;
  return Array.from(document.querySelectorAll(selector)).find(isVisible) ?? null;
}

function rectFromElement(element: Element): TargetRect {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function isOnHref(pathname: string, href?: string) {
  if (!href) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function panelPosition(rect: TargetRect | null) {
  if (!rect || typeof window === "undefined") {
    return {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const margin = 16;
  const width = Math.min(380, window.innerWidth - margin * 2);
  const estimatedHeight = 300;
  let left = rect.left + rect.width + margin;
  let top = rect.top;

  if (left + width > window.innerWidth - margin) {
    left = rect.left - width - margin;
  }

  if (left < margin) {
    left = Math.min(
      Math.max(rect.left, margin),
      window.innerWidth - width - margin,
    );
    top = rect.top + rect.height + margin;
  }

  top = Math.min(
    Math.max(top, margin),
    Math.max(margin, window.innerHeight - estimatedHeight - margin),
  );

  return {
    left,
    top,
    transform: "none",
  };
}

export default function GuidedTutorial({
  userRole,
  initialStatus,
  sessionId,
}: {
  userRole: AppRole;
  initialStatus: TutorialProgressStatus | null;
  sessionId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const autoStartedRef = useRef(false);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [saving, setSaving] = useState(false);

  const steps = useMemo(() => {
    if (userRole === "SUPER_ADMIN") return [];
    return roleSteps[userRole] ?? [];
  }, [userRole]);
  const step = steps[stepIndex];
  const shouldAutoStart =
    userRole !== "SUPER_ADMIN" &&
    initialStatus !== "COMPLETED" &&
    initialStatus !== "CANCELLED";

  const updateTargetRect = useCallback(() => {
    if (!active || !step?.selector) {
      setTargetRect(null);
      return;
    }

    const target = findVisibleTarget(step.selector);
    if (!target) {
      if (window.innerWidth < 1024) {
        window.dispatchEvent(new Event("zerve:open-sidebar"));
      }
      setTargetRect(null);
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });

    setTargetRect(rectFromElement(target));
  }, [active, step]);

  const beginTutorial = useCallback(() => {
    if (userRole === "SUPER_ADMIN" || steps.length === 0) return;
    setStepIndex(0);
    setActive(true);
    void startTutorialProgress();
  }, [steps.length, userRole]);

  useEffect(() => {
    const onStart = () => beginTutorial();
    window.addEventListener(START_EVENT, onStart);

    return () => window.removeEventListener(START_EVENT, onStart);
  }, [beginTutorial]);

  useEffect(() => {
    if (!shouldAutoStart || autoStartedRef.current) return;

    const storageKey = `zerve:terms-accepted:${TERMS_VERSION}:${sessionId}`;
    const startWhenReady = () => {
      let accepted = true;
      try {
        accepted = localStorage.getItem(storageKey) === "true";
      } catch {
        accepted = true;
      }

      if (!accepted || autoStartedRef.current) return;
      autoStartedRef.current = true;
      window.setTimeout(beginTutorial, 650);
    };

    startWhenReady();
    window.addEventListener("zerve-terms-accepted", startWhenReady);

    return () =>
      window.removeEventListener("zerve-terms-accepted", startWhenReady);
  }, [beginTutorial, sessionId, shouldAutoStart]);

  useEffect(() => {
    if (!active) return;

    const firstMeasure = window.setTimeout(updateTargetRect, 0);
    const secondMeasure = window.setTimeout(updateTargetRect, 280);

    window.addEventListener("resize", updateTargetRect);
    document.addEventListener("scroll", updateTargetRect, true);

    return () => {
      window.clearTimeout(firstMeasure);
      window.clearTimeout(secondMeasure);
      window.removeEventListener("resize", updateTargetRect);
      document.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [active, pathname, stepIndex, updateTargetRect]);

  const saveAndClose = async (
    status: Exclude<TutorialProgressStatus, "STARTED">,
  ) => {
    setSaving(true);
    const result = await saveTutorialProgress(status);
    setSaving(false);
    if (!result.success) {
      console.error(result.message);
    }
    setActive(false);
  };

  if (!active || !step) return null;

  const lastStep = stepIndex === steps.length - 1;
  const openTarget = () => {
    if (!step.href) return;
    router.push(step.href);
    window.setTimeout(updateTargetRect, 450);
  };
  const showOpenAction = Boolean(step.href) && !isOnHref(pathname, step.href);
  const position = panelPosition(targetRect);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[9998] bg-black/45 backdrop-blur-[1px]" />
      {targetRect && (
        <div
          className="pointer-events-none fixed z-[9999] rounded-lg border-2 border-primary bg-primary/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.18),0_0_0_6px_rgba(255,255,255,0.38)]"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}
      <div
        className="fixed z-[10000] w-[min(92vw,380px)]"
        style={position}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tutorial-title"
      >
        <div className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b bg-muted/40 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Map className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Step {stepIndex + 1} of {steps.length}
                </p>
                <h2
                  id="guided-tutorial-title"
                  className="text-lg font-semibold leading-tight"
                >
                  {step.title}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void saveAndClose("CANCELLED")}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Cancel tutorial"
              disabled={saving}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              {step.body}
            </p>

            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${((stepIndex + 1) / steps.length) * 100}%`,
                }}
              />
            </div>

            <div
              className={cn(
                "flex flex-col gap-2",
                showOpenAction ? "sm:flex-row sm:items-center" : "",
              )}
            >
              {showOpenAction && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={openTarget}
                  className="justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  {step.actionLabel || "Open page"}
                </Button>
              )}
              <div className="flex flex-1 items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStepIndex((current) => current - 1)}
                  disabled={stepIndex === 0 || saving}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (lastStep) {
                      void saveAndClose("COMPLETED");
                      return;
                    }
                    setStepIndex((current) => current + 1);
                  }}
                  disabled={saving}
                  className="gap-2"
                >
                  {lastStep ? (
                    <>
                      <Check className="h-4 w-4" />
                      Finish
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
