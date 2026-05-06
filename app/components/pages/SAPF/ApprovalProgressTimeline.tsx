"use client";

import { cn } from "@/lib/utils";
import { Check, Clock, Minus, RefreshCcw, X } from "lucide-react";

const completedStatuses = new Set(["APPROVED"]);

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function stepLabel(step: any) {
  if (step.position === "SAS") return "SAS";
  if (step.position === "VPAA_ASSISTANT") return "VPAA Assistant";
  if (step.position === "VPAA") return "VPAA";
  if (step.position === "UNIVERSITY_PRESIDENT") return "University President";
  if (step.position === "ADDITIONAL_SIGNATORY") {
    const title =
      step.reviewer?.accounts?.[0]?.title || step.reviewer?.title || "";
    return title || "Additional Signatory";
  }

  return String(step.label || "")
    .replace(/^Sas$/i, "SAS")
    .replace(/^Vpaa assistant$/i, "VPAA Assistant")
    .replace(/^Vpaa$/i, "VPAA")
    .replace(/^University president$/i, "University President");
}

function StepIcon({ status }: { status: string }) {
  if (status === "REJECTED") return <X className="h-3.5 w-3.5" />;
  if (status === "RETURNED") return <RefreshCcw className="h-3.5 w-3.5" />;
  if (status === "ACTIVE") return <Clock className="h-3.5 w-3.5" />;
  if (status === "SKIPPED") return <Minus className="h-3.5 w-3.5" />;
  if (completedStatuses.has(status)) return <Check className="h-3.5 w-3.5" />;
  return <span className="h-2 w-2 rounded-full bg-current" />;
}

function dotClass(status: string) {
  if (status === "REJECTED") return "border-red-600 bg-red-600 text-white";
  if (status === "RETURNED")
    return "border-orange-500 bg-orange-500 text-white";
  if (status === "ACTIVE") return "border-blue-600 bg-blue-600 text-white";
  if (status === "SKIPPED")
    return "border-border bg-muted text-muted-foreground";
  if (completedStatuses.has(status))
    return "border-foreground bg-foreground text-background";
  return "border-border bg-card text-muted-foreground";
}

function connectorClass(done: boolean) {
  return done ? "bg-foreground" : "bg-muted";
}

export default function ApprovalProgressTimeline({
  request,
  compact = false,
}: {
  request: any;
  compact?: boolean;
}) {
  const steps = [...(request.approvalSteps || [])].sort(
    (a, b) => a.stepOrder - b.stepOrder,
  );

  if (steps.length === 0) return null;

  const timelineSteps = [
    ...steps,
    {
      id: `${request.id || "sapf"}-complete`,
      label: "Complete",
      status: request.status === "APPROVED" ? "APPROVED" : "PENDING",
    },
  ];
  const minWidth = Math.max(timelineSteps.length * 112, 420);
  const isReached = (step: any) =>
    step.status !== "PENDING" && step.status !== "SKIPPED";
  const segmentDone = (index: number) =>
    isReached(timelineSteps[index]) && isReached(timelineSteps[index + 1]);

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-md border bg-card",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex w-full" style={{ minWidth }}>
        {timelineSteps.map((step, index) => (
          <div
            key={step.id}
            className="flex min-w-28 flex-1 flex-col items-center gap-2 text-center"
          >
            <p
              className="h-5 max-w-28 truncate px-2 text-xs font-semibold text-foreground"
              title={stepLabel(step)}
            >
              {stepLabel(step)}
            </p>
            <div className="flex w-full items-center">
              <div
                className={cn(
                  "h-1 flex-1 rounded-l-full",
                  index === 0
                    ? "bg-transparent"
                    : connectorClass(segmentDone(index - 1)),
                )}
              />
              <div
                className={cn(
                  "z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] shadow-sm",
                  dotClass(step.status),
                )}
                title={`${stepLabel(step)}: ${statusLabel(step.status)}`}
              >
                <StepIcon status={step.status} />
              </div>
              <div
                className={cn(
                  "h-1 flex-1 rounded-r-full",
                  index === timelineSteps.length - 1
                    ? "bg-transparent"
                    : connectorClass(segmentDone(index)),
                )}
              />
            </div>
            {!compact && (
              <p className="h-4 text-[11px] font-medium text-muted-foreground">
                {statusLabel(step.status)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
