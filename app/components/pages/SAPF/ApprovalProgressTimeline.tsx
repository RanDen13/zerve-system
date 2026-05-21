"use client";

import ModalBase from "@/app/components/Popup/ModalBase";
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
import { format } from "date-fns";
import {
  Check,
  Clock,
  GitCompareArrows,
  History,
  Minus,
  RefreshCcw,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";

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

function parseActivityMetadata(metadata?: string | null) {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}

function changeRequestStatusClass(status: string) {
  if (status === "APPROVED") return "bg-emerald-600 text-white";
  if (status === "REJECTED") return "bg-red-600 text-white";
  if (status === "PENDING") return "bg-amber-500 text-white";
  return "bg-muted text-muted-foreground";
}

function changeRequestTypeLabel(type: string) {
  return type === "CANCEL" ? "Cancellation" : "Edit";
}

function FlowHistoryModal({
  request,
  steps,
  onClose,
}: {
  request: any;
  steps: any[];
  onClose: () => void;
}) {
  const logs = Array.isArray(request.activityLogs)
    ? request.activityLogs
    : [];
  const changeRequests = Array.isArray(request.changeRequests)
    ? request.changeRequests
    : [];

  return (
    <ModalBase onClose={onClose} ariaLabel="Routing and decision history">
      <Card className="w-[min(94vw,920px)] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Routing & Decision History
              </CardTitle>
              <CardDescription>
                {request.requestNumber} - every approval, route, return, edit,
                and system event recorded while the booking moved through SDS
                routing.
              </CardDescription>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="max-h-[76vh] space-y-5 overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {steps.map((step) => (
              <div key={step.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{stepLabel(step)}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.reviewer?.name || "No reviewer"}
                    </p>
                  </div>
                  <Badge variant="outline">{statusLabel(step.status)}</Badge>
                </div>
                {step.comment && (
                  <p className="mt-3 rounded-md bg-background p-2 text-xs text-muted-foreground">
                    {step.comment}
                  </p>
                )}
                {step.actedAt && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Acted {format(new Date(step.actedAt), "MMM d, yyyy h:mm a")}
                  </p>
                )}
              </div>
            ))}
          </div>

          {changeRequests.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {changeRequests.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-lg border bg-muted/40 p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <ShieldCheck className="h-4 w-4" />
                        {changeRequestTypeLabel(item.type)} request
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested by {item.requestedBy?.name || "Officer"} on{" "}
                        {format(new Date(item.createdAt), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <Badge className={changeRequestStatusClass(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-foreground">{item.reason}</p>
                  {item.resolutionComment && (
                    <p className="mt-3 rounded-md bg-background p-3 text-sm text-muted-foreground">
                      {item.resolutionComment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {logs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No activity has been logged yet.
            </div>
          ) : (
            <div className="relative space-y-4 before:absolute before:bottom-0 before:left-4 before:top-2 before:w-px before:bg-border">
              {logs.map((log: any) => {
                const metadata = parseActivityMetadata(log.metadata);
                const changes = Array.isArray(metadata?.changes)
                  ? metadata.changes
                  : [];

                return (
                  <div key={log.id} className="relative pl-10">
                    <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm">
                      {changes.length > 0 ? (
                        <GitCompareArrows className="h-4 w-4 text-primary" />
                      ) : log.action.includes("REQUEST") ? (
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold text-foreground">
                            {log.title}
                          </p>
                          {log.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {log.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <UserRound className="h-3.5 w-3.5" />
                          <span>{log.actor?.name || "System"}</span>
                          <span>-</span>
                          <span>
                            {format(new Date(log.createdAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                      </div>

                      {changes.length > 0 && (
                        <div className="mt-4 overflow-hidden rounded-md border">
                          <div className="grid grid-cols-2 bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground md:grid-cols-[0.8fr_1fr_1fr]">
                            <span className="hidden md:block">Field</span>
                            <span>Before</span>
                            <span>After</span>
                          </div>
                          <div className="divide-y">
                            {changes.map((change: any, index: number) => (
                              <div
                                key={`${log.id}-${change.field || index}`}
                                className="grid gap-2 px-3 py-3 text-sm md:grid-cols-[0.8fr_1fr_1fr]"
                              >
                                <p className="font-medium text-foreground">
                                  {change.label || change.field}
                                </p>
                                <p className="break-words text-muted-foreground">
                                  {change.before}
                                </p>
                                <p className="break-words text-foreground">
                                  {change.after}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {metadata?.reason && (
                        <p className="mt-3 rounded-md bg-muted/70 p-3 text-sm text-muted-foreground">
                          {metadata.reason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </ModalBase>
  );
}

export default function ApprovalProgressTimeline({
  request,
  compact = false,
}: {
  request: any;
  compact?: boolean;
}) {
  const [showHistory, setShowHistory] = useState(false);
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
    <>
      <button
        type="button"
        onClick={() => setShowHistory(true)}
        className={cn(
          "block w-full overflow-x-auto rounded-md border bg-card text-left transition hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-[3px] focus-visible:ring-ring/50",
          compact ? "p-3" : "p-4",
        )}
        aria-label="Open routing and decision history"
      >
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="font-medium">Routing & decisions</span>
          <span className="font-semibold text-primary">Click to view history</span>
        </div>
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
      </button>
      {showHistory && (
        <FlowHistoryModal
          request={request}
          steps={steps}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}
