"use client";

import { StatusBadge } from "@/app/components/UX";
import { usePopup } from "@/app/components/Popup/PopupProvider";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import {
  MotionPage,
  MotionSection,
} from "@/app/components/ui/motion";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  GitCompareArrows,
  FileDown,
  History,
  Loader2,
  MessageSquare,
  Paperclip,
  RefreshCcw,
  ShieldCheck,
  Sun,
  UserRound,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import ModalBase from "../../Popup/ModalBase";
import ApprovalProgressTimeline from "./ApprovalProgressTimeline";
import {
  addConcernMessage,
  reviewSapfChangeRequest,
  reviewSapfRequest,
  updateSdsClearance,
  updateSdsEvaluation,
} from "./SapfActions";
import SapfReadonlyDetails from "./SapfReadonlyDetails";
import {
  deriveSapfOperationalStatus,
  operationalStatusLabel,
} from "./sapfLifecycle";
import { formatSapfDate, formatSapfTime } from "./sapfSchedule";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const APPROVAL_TIMEOUT_DAYS = 3;
const ROUTE_TARGET_OPTIONS = [
  { value: "DEAN", label: "Dean" },
  { value: "SAS", label: "SAS" },
  { value: "ADDITIONAL_SIGNATORY", label: "Additional Signatory" },
  { value: "VPAA_ASSISTANT", label: "VPAA Assistant" },
  { value: "VPAA", label: "VPAA" },
  { value: "UNIVERSITY_PRESIDENT", label: "University President" },
] as const;

type SapfWeatherDay = {
  date: string;
  weatherCode: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationProbability: number | null;
  precipitationSum: number | null;
};

let weatherForecastCache: Promise<SapfWeatherDay[]> | null = null;

async function loadWeatherForecast() {
  if (!weatherForecastCache) {
    weatherForecastCache = fetch("/api/weather/forecast")
      .then((response) => (response.ok ? response.json() : { days: [] }))
      .then((payload) => (Array.isArray(payload.days) ? payload.days : []))
      .catch(() => []);
  }

  return weatherForecastCache;
}

function ButtonSpinner() {
  return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function routePositionLabel(position?: string | null) {
  return (
    ROUTE_TARGET_OPTIONS.find((option) => option.value === position)?.label ||
    String(position || "")
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function formatDateRange(request: any) {
  const schedules = Array.isArray(request.schedules) ? request.schedules : [];
  if (schedules.length === 0) return "No schedule";
  if (schedules.length === 1) {
    const schedule = schedules[0];
    return `${formatSapfDate(schedule.startAt)} - ${formatSapfTime(
      schedule.startAt,
    )} to ${formatSapfTime(schedule.endAt)}`;
  }

  return `${schedules.length} days, ${formatSapfDate(
    schedules[0].startAt,
  )} to ${formatSapfDate(schedules[schedules.length - 1].startAt)}`;
}

function venueLabel(request: any) {
  const names = (request.venues || [])
    .map((item: any) => item?.eventSpace?.name || item?.name)
    .filter(Boolean);

  return names.length ? names.join(", ") : request.venue || "No venue";
}

function firstScheduleDateKey(request: any) {
  const schedule = Array.isArray(request.schedules) ? request.schedules[0] : null;
  if (!schedule?.startAt) return "";
  return format(new Date(schedule.startAt), "yyyy-MM-dd");
}

function weatherSummary(code: number | null) {
  if (code === null || code === undefined) return "Forecast";
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Forecast";
}

function WeatherIcon({
  code,
  className,
}: {
  code: number | null;
  className?: string;
}) {
  if (code === 0) return <Sun className={className} />;
  if ([1, 2].includes(code ?? -1)) return <CloudSun className={className} />;
  if (code === 3) return <Cloud className={className} />;
  if ([45, 48].includes(code ?? -1)) return <CloudFog className={className} />;
  if ([51, 53, 55, 56, 57].includes(code ?? -1)) {
    return <CloudDrizzle className={className} />;
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) {
    return <CloudRain className={className} />;
  }
  if ([95, 96, 99].includes(code ?? -1)) {
    return <CloudLightning className={className} />;
  }
  return <CloudSun className={className} />;
}

function temperatureLabel(weather: SapfWeatherDay) {
  const max =
    typeof weather.temperatureMax === "number"
      ? `${Math.round(weather.temperatureMax)}`
      : "";
  const min =
    typeof weather.temperatureMin === "number"
      ? `${Math.round(weather.temperatureMin)}`
      : "";
  if (max && min) return `${min}-${max} C`;
  if (max) return `${max} C`;
  if (min) return `${min} C`;
  return "";
}

function rainLabel(weather: SapfWeatherDay) {
  if (typeof weather.precipitationProbability === "number") {
    return `${Math.round(weather.precipitationProbability)}% rain`;
  }
  if (typeof weather.precipitationSum === "number") {
    return `${weather.precipitationSum.toFixed(1)} mm`;
  }
  return "";
}

function RequestWeather({ request }: { request: any }) {
  const scheduleDate = firstScheduleDateKey(request);
  const [weatherDays, setWeatherDays] = useState<SapfWeatherDay[]>([]);

  useEffect(() => {
    if (!scheduleDate) return;
    let cancelled = false;

    async function loadWeather() {
      const days = await loadWeatherForecast();
      if (!cancelled) {
        setWeatherDays(days);
      }
    }

    void loadWeather();

    return () => {
      cancelled = true;
    };
  }, [scheduleDate]);

  const weather = useMemo(
    () => weatherDays.find((day) => day.date === scheduleDate),
    [scheduleDate, weatherDays],
  );

  if (!weather) return null;

  return (
    <div className="mt-3 flex w-fit flex-wrap items-center gap-2 rounded-md border bg-sky-500/5 px-3 py-2 text-sm">
      <WeatherIcon
        code={weather.weatherCode}
        className="h-4 w-4 text-sky-600"
      />
      <span className="font-semibold text-foreground">
        {weatherSummary(weather.weatherCode)}
      </span>
      {temperatureLabel(weather) && (
        <span className="text-muted-foreground">
          {temperatureLabel(weather)}
        </span>
      )}
      {rainLabel(weather) && (
        <span className="text-muted-foreground">{rainLabel(weather)}</span>
      )}
      <span className="text-xs text-muted-foreground">Open-Meteo</span>
    </div>
  );
}

function parseActivityMetadata(metadata?: string | null) {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}

function changeRequestTypeLabel(type: string) {
  return type === "EDIT" ? "Edit" : "Cancellation";
}

function changeRequestStatusClass(status: string) {
  if (status === "APPROVED")
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (status === "REJECTED")
    return "bg-red-500/15 text-red-700 dark:text-red-400";
  return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
}

export function RequestSummary({
  request,
  showBadges = true,
  showConflict = true,
  showPdf = true,
  showProgress = true,
  action,
}: {
  request: any;
  showBadges?: boolean;
  showConflict?: boolean;
  showPdf?: boolean;
  showProgress?: boolean;
  action?: ReactNode;
}) {
  const waitingSince = request.approvalSteps?.find(
    (step: any) => step.status === "ACTIVE",
  )?.updatedAt;
  const activeStep = requestActiveStep(request);
  const queueLabel = routingQueueLabel(request, activeStep);
  const operationalStatus = deriveSapfOperationalStatus(request);
  const openConcernCount = (request.approvalSteps || []).filter(
    (step: any) =>
      step.concernThread &&
      step.concernThread.status !== "RESOLVED" &&
      ["ACTIVE", "RETURNED"].includes(step.status),
  ).length;

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="space-y-4 rounded-lg border bg-card/95 p-4 shadow-sm transition-shadow hover:border-primary/25 hover:shadow-md"
      aria-label={`Request ${request.requestNumber || request.title}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-sm font-semibold text-muted-foreground">
            #{request.requestNumber}
          </p>
          <h3 className="text-lg font-bold text-foreground">{request.title}</h3>
          <p className="text-sm text-muted-foreground">
            {request.organization}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <UserRound className="h-4 w-4" />
            Booked by {request.officer?.name || "Unknown user"}
            {request.officer?.email ? ` (${request.officer.email})` : ""}
          </p>
          <p className="mt-2 text-sm text-foreground">
            {venueLabel(request)} - {formatDateRange(request)}
          </p>
          <p className="text-sm text-muted-foreground">
            Submitted: {format(new Date(request.createdAt), "MMM d, yyyy")}
          </p>
          {waitingSince && (
            <p className="text-sm text-muted-foreground">
              Waiting since:{" "}
              {formatDistanceToNow(new Date(waitingSince), {
                addSuffix: false,
              })}
            </p>
          )}
          <RequestWeather request={request} />
        </div>
        <div className="flex flex-wrap gap-2">
          {showBadges && (
            <StatusBadge status={request.status} />
          )}
          {queueLabel && <StatusBadge label={queueLabel} tone="info" />}
          {showBadges && request.status === "APPROVED" && (
            <StatusBadge
              status={operationalStatus}
              label={operationalStatusLabel(operationalStatus)}
            />
          )}
          {showConflict && request.conflictWarning && (
            <StatusBadge label="Pending conflict" tone="warning" />
          )}
          {activeStep && (
            <StatusBadge
              label={deadlineLabel(activeStep)}
              tone={deadlineTone(activeStep)}
            />
          )}
          {request.setting === "Off-Campus" && (
            <StatusBadge label="Off-campus" tone="info" />
          )}
          {openConcernCount > 0 && (
            <StatusBadge
              label={`${openConcernCount} open concern${
                openConcernCount === 1 ? "" : "s"
              }`}
              tone="warning"
            />
          )}
          {showPdf && request.status === "APPROVED" && (
            <a
              href={`/api/sapf/${request.id}/pdf`}
              target="_blank"
              rel="noreferrer"
            >
              <Button size="sm" variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Reservation PDF
              </Button>
            </a>
          )}
          {action}
        </div>
      </div>
      {showProgress && <ApprovalProgressTimeline request={request} compact />}
    </motion.article>
  );
}

function requestActiveStep(request: any) {
  return (request.approvalSteps || []).find((step: any) => step.status === "ACTIVE");
}

function routingQueueLabel(request: any, activeStep: any) {
  if (request.status === "RETURNED_FOR_REVISION") return "Returned for revision";
  if (!activeStep) return "";
  if (activeStep.position === "SDS") return "Awaiting SDS route";
  if (activeStep.position === "UNIVERSITY_PRESIDENT" && activeStep.finalizesRequest) {
    return "Waiting on President";
  }
  return `Waiting on ${activeStep.label || "reviewer"}`;
}

function approvalDeadline(step: any) {
  if (!step) return null;
  const timeoutByPosition: Record<string, number> = {
    ADVISER: 3,
    DEAN: 3,
    SDS: 3,
    SAS: 3,
    VPAA_ASSISTANT: 3,
    VPAA: 3,
    UNIVERSITY_PRESIDENT: 10,
    ADDITIONAL_SIGNATORY: 3,
  };
  const timeoutDays =
    timeoutByPosition[String(step.position || "").toUpperCase()] ??
    APPROVAL_TIMEOUT_DAYS;
  const activeAt = new Date(step.updatedAt || step.createdAt || Date.now()).getTime();
  return new Date(
    activeAt + timeoutDays * 24 * 60 * 60 * 1000,
  );
}

function deadlineLabel(step: any) {
  const dueAt = approvalDeadline(step);
  if (!dueAt) return "No active deadline";
  const diffMs = dueAt.getTime() - Date.now();
  if (diffMs <= 0) return "Overdue";
  const hours = Math.ceil(diffMs / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days <= 0) return `${remHours}h left`;
  return `${days}d ${remHours}h left`;
}

function deadlineTone(step: any): "danger" | "warning" | "info" {
  const dueAt = approvalDeadline(step);
  if (!dueAt) return "info";
  const diffMs = dueAt.getTime() - Date.now();
  if (diffMs <= 0) return "danger";
  if (diffMs <= 24 * 60 * 60 * 1000) return "warning";
  return "info";
}

export function SapfActivityLog({ request }: { request: any }) {
  const logs = Array.isArray(request.activityLogs)
    ? request.activityLogs.filter((log: any) => {
        const metadata = parseActivityMetadata(log.metadata);
        const hasChanges =
          Array.isArray(metadata?.changes) && metadata.changes.length > 0;
        return !(
          hasChanges &&
          ["SUBMITTED", "RESUBMITTED"].includes(log.action)
        );
      })
    : [];
  const changeRequests = Array.isArray(request.changeRequests)
    ? request.changeRequests
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Activity Log
        </CardTitle>
        <CardDescription>
          Updates, approvals, returns, cancellation requests, and SDS decisions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
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
  );
}

export function ConcernThreads({
  request,
  onRefresh,
}: {
  request: any;
  onRefresh: () => Promise<void>;
}) {
  const popup = usePopup();
  const [sendingThreadId, setSendingThreadId] = useState("");
  const visibleSteps = request.approvalSteps?.filter(
    (step: any) => step.concernThread,
  );

  const handleMessage = async (formData: FormData) => {
    const stepId = String(formData.get("stepId") || "");
    if (sendingThreadId) return;

    setSendingThreadId(stepId);
    try {
      const result = await addConcernMessage(formData);
      if (!result.success) {
        popup.showError(result.message);
        return;
      }
      popup.showSuccess(result.message || "Message sent.");
      await onRefresh();
    } finally {
      setSendingThreadId("");
    }
  };

  if (!visibleSteps?.length) return null;

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquare className="h-4 w-4" />
        Private concern threads
      </p>
      {visibleSteps.map((step: any) => {
        const threadStatusLabel =
          step.status === "ACTIVE" || step.status === "RETURNED"
            ? step.concernThread.status === "RESOLVED"
              ? "Closed"
              : "Active"
            : "Closed";

        return (
          <div key={step.id} className="rounded-lg border p-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="text-xs text-muted-foreground">
                  Private between officer and {step.reviewer?.name}
                </p>
              </div>
              <Badge variant="outline">{threadStatusLabel}</Badge>
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md bg-muted p-3">
              {step.concernThread.messages.map((message: any) => (
                <div
                  key={message.id}
                  className="rounded-md bg-card p-2 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">
                      {message.author?.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(message.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{message.body}</p>
                </div>
              ))}
            </div>
            {step.status === "ACTIVE" || step.status === "RETURNED" ? (
              <form action={handleMessage} className="mt-3 flex gap-2">
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="stepId" value={step.id} />
                <Input
                  name="body"
                  placeholder="Reply to this concern"
                  disabled={Boolean(sendingThreadId)}
                />
                <Button type="submit" disabled={Boolean(sendingThreadId)}>
                  {sendingThreadId === step.id && <ButtonSpinner />}
                  Send
                </Button>
              </form>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                This concern thread is closed.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChangeRequestReviewControls({
  request,
  me,
  onRefresh,
}: {
  request: any;
  me: any;
  onRefresh: () => Promise<void>;
}) {
  const popup = usePopup();
  const [selected, setSelected] = useState<{
    id: string;
    decision: "approve" | "reject";
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pendingRequests = (request.changeRequests || []).filter(
    (item: any) => item.status === "PENDING",
  );
  const isAssignedSds = request.approvalSteps?.some(
    (step: any) => step.position === "SDS" && step.reviewerId === me?.id,
  );

  if (!isAssignedSds || pendingRequests.length === 0) return null;

  const selectedRequest = selected
    ? pendingRequests.find((item: any) => item.id === selected.id)
    : null;

  const handleReview = async (formData: FormData) => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await reviewSapfChangeRequest(formData);
      if (!result.success) {
        popup.showError(result.message);
        return;
      }
      popup.showSuccess(result.message || "Change request reviewed.");
      setSelected(null);
      await onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          SDS Change Requests
        </CardTitle>
        <CardDescription>
          Officer edits or cancellations after SDS require your approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingRequests.map((item: any) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm md:flex-row md:items-start md:justify-between"
          >
            <div className="space-y-2">
              <Badge className="w-fit bg-blue-500/15 text-blue-700 dark:text-blue-400">
                {changeRequestTypeLabel(item.type)} approval needed
              </Badge>
              <p className="font-semibold text-foreground">
                {item.requestedBy?.name || "Officer"}
              </p>
              <p className="text-sm text-muted-foreground">{item.reason}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(item.createdAt), "MMM d, yyyy h:mm a")}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setSelected({ id: item.id, decision: "approve" })}
                disabled={submitting}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setSelected({ id: item.id, decision: "reject" })}
                disabled={submitting}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      {selected && selectedRequest && (
        <ModalBase onClose={() => !submitting && setSelected(null)}>
          <Card className="w-[min(92vw,520px)]">
            <CardHeader>
              <CardTitle>
                {selected.decision === "approve" ? "Approve" : "Reject"}{" "}
                {changeRequestTypeLabel(selectedRequest.type).toLowerCase()} request
              </CardTitle>
              <CardDescription>
                {selectedRequest.type === "EDIT"
                  ? "Approving returns the booking to the officer for revision and sends it back to SDS after resubmission."
                  : "Approving immediately cancels the booking and records your SDS decision."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={handleReview} className="space-y-4">
                <input
                  type="hidden"
                  name="changeRequestId"
                  value={selected.id}
                />
                <input
                  type="hidden"
                  name="decision"
                  value={selected.decision}
                />
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  {selectedRequest.reason}
                </div>
                <div className="space-y-2">
                  <Label>
                    {selected.decision === "approve"
                      ? "SDS note"
                      : "Rejection reason"}
                  </Label>
                  <Textarea
                    name="comment"
                    rows={4}
                    required={selected.decision === "reject"}
                    placeholder={
                      selected.decision === "approve"
                        ? "Optional note for the officer"
                        : "Why is this request rejected?"
                    }
                  />
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelected(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant={
                      selected.decision === "reject" ? "destructive" : "default"
                    }
                    className={
                      selected.decision === "approve"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : ""
                    }
                    disabled={submitting}
                  >
                    {submitting && <ButtonSpinner />}
                    {submitting ? "Saving..." : "Save decision"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </ModalBase>
      )}
    </Card>
  );
}

function ReviewControls({
  request,
  me,
  onRefresh,
  approvers,
}: {
  request: any;
  me: any;
  onRefresh: () => Promise<void>;
  approvers?: Record<string, any[]>;
}) {
  const popup = usePopup();
  const [selectedAction, setSelectedAction] = useState<
    "approve" | "route" | "return" | "reject" | null
  >(null);
  const [hasAttachments, setHasAttachments] = useState("");
  const [attachmentTotal, setAttachmentTotal] = useState(0);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [returnTemplate, setReturnTemplate] = useState("");
  const [reasonTag, setReasonTag] = useState("OTHER");
  const [routePosition, setRoutePosition] = useState("");
  const [routeReviewerId, setRouteReviewerId] = useState("");
  const [routeSuggestionPosition, setRouteSuggestionPosition] = useState("");
  if (me?.role === "SUPER_ADMIN") return null;
  const step = request.approvalSteps?.find(
    (item: any) => item.status === "ACTIVE" && item.reviewerId === me.id,
  );

  if (!step) return null;

  const handleReview = async (formData: FormData) => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await reviewSapfRequest(formData);
      if (!result.success) {
        popup.showError(result.message);
        return;
      }
      setSelectedAction(null);
      setHasAttachments("");
      setAttachmentTotal(0);
      setAttachmentNames([]);
      setAttachmentInputKey((key) => key + 1);
      setRoutePosition("");
      setRouteReviewerId("");
      setRouteSuggestionPosition("");
      popup.showSuccess(result.message || "Review saved.");
      await onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const isSdsStep = step.position === "SDS";
  const isPresidentFinalStep =
    step.position === "UNIVERSITY_PRESIDENT" &&
    Boolean(step.finalizesRequest);
  const reviewFormId = `review-form-${step.id}`;
  const routeReviewerOptions = routePosition ? approvers?.[routePosition] || [] : [];
  const routeReviewerValue =
    routeReviewerId || (routeReviewerOptions.length === 1 ? routeReviewerOptions[0].id : "");
  const routeReviewerRequired = routeReviewerOptions.length > 1;
  const missingRouteOptions =
    selectedAction === "route" &&
    Boolean(routePosition) &&
    routeReviewerOptions.length === 0;
  const selectedActionLabel =
    selectedAction === "approve"
      ? isSdsStep || isPresidentFinalStep
        ? "Final approve request"
        : "Approve request"
      : selectedAction === "route"
        ? routePosition === "UNIVERSITY_PRESIDENT"
          ? "Send to President"
          : "Route request"
      : selectedAction === "return"
        ? "Return for revision"
        : "Reject request";
  const selectedActionDescription =
    selectedAction === "approve"
      ? isSdsStep || isPresidentFinalStep
        ? "This completes the reservation approval and locks the slot."
        : "Approve your review and send the request to SDS for routing."
      : selectedAction === "route"
        ? "SDS can send this request to another reviewer or to the President for final approval."
      : selectedAction === "return"
        ? "Tell the officer what needs to be revised before this can continue."
        : "Provide the rejection reason that will be recorded on this request.";
  const selectedActionCommentLabel =
    selectedAction === "approve"
      ? "Approval comment"
      : selectedAction === "route"
        ? "Routing note"
      : selectedAction === "return"
        ? "Revision comment"
        : "Rejection reason";
  const selectedActionPlaceholder =
    selectedAction === "approve"
      ? "Optional approval comment"
      : selectedAction === "route"
        ? "Optional note for this route"
      : selectedAction === "return"
        ? "What should the officer revise?"
        : "Why is this request rejected?";
  const returnTemplates = [
    "Incomplete details",
    "Schedule conflict",
    "Missing attachment",
    "Policy mismatch",
  ];
  const attachmentLimitExceeded = attachmentTotal > MAX_ATTACHMENT_BYTES;
  const approveHandoffLabel =
    isSdsStep || isPresidentFinalStep
      ? "Final approval"
      : "SDS routing decision";

  const yesNoField = (name: string, label: string) => (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input
            form={reviewFormId}
            type="radio"
            name={name}
            value="true"
            required
            className="h-4 w-4 accent-primary"
          />
          Yes
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input
            form={reviewFormId}
            type="radio"
            name={name}
            value="false"
            required
            className="h-4 w-4 accent-primary"
          />
          No
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 rounded-lg border bg-muted p-4">
      <div>
        <p className="font-semibold text-foreground">Your active review</p>
        <p className="text-sm text-muted-foreground">{step.label}</p>
      </div>

      {step.position === "SDS" && (
        <div className="grid gap-3">
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border bg-card p-3 shadow-xs">
                {yesNoField("parentsConsent", "Parent's Consent Form")}
              </div>
              <div className="rounded-md border bg-card p-3 shadow-xs">
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-2 text-sm text-foreground">
                      <input
                        form={reviewFormId}
                        type="radio"
                        name="hasAttachments"
                        value="true"
                        required
                        checked={hasAttachments === "true"}
                        onChange={(event) =>
                          setHasAttachments(event.target.value)
                        }
                        className="h-4 w-4 accent-primary"
                      />
                      Yes
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-foreground">
                      <input
                        form={reviewFormId}
                        type="radio"
                        name="hasAttachments"
                        value="false"
                        required
                        checked={hasAttachments === "false"}
                        onChange={(event) => {
                          setHasAttachments(event.target.value);
                          setAttachmentTotal(0);
                          setAttachmentNames([]);
                          setAttachmentInputKey((key) => key + 1);
                        }}
                        className="h-4 w-4 accent-primary"
                      />
                      No
                    </label>
                  </div>
                  <Input
                    key={attachmentInputKey}
                    form={reviewFormId}
                    type="file"
                    name="attachmentFiles"
                    multiple
                    disabled={hasAttachments !== "true"}
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []);
                      setAttachmentTotal(
                        files.reduce((sum, file) => sum + file.size, 0),
                      );
                      setAttachmentNames(
                        files.map(
                          (file) =>
                            `${file.name} (${formatFileSize(file.size)})`,
                        ),
                      );
                    }}
                    className="bg-background"
                  />
                  <div
                    className={`text-xs ${
                      attachmentLimitExceeded
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatFileSize(attachmentTotal)} / 25 MB
                  </div>
                  {attachmentNames.length > 0 && (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {attachmentNames.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border bg-card p-3 shadow-xs">
                <div className="space-y-3">
                  {yesNoField(
                    "academicInterruption",
                    "Academic Class Interruption",
                  )}
                  <div>
                    <Label>Academic Interruption Remarks</Label>
                    <Input
                      form={reviewFormId}
                      name="academicInterruptionRemarks"
                      placeholder="Remarks"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-md border bg-card p-3 shadow-xs">
                {yesNoField("medicalExam", "Medical Exam Request")}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
              <div className="rounded-md border bg-card p-3 shadow-xs">
                {yesNoField("reportOfCompliance", "Report of Compliance")}
              </div>
              <div className="rounded-md border bg-card p-3 shadow-xs">
                <Label>Student-Personnel Ratio</Label>
                <Input
                  form={reviewFormId}
                  name="studentPersonnelRatio"
                  placeholder="e.g. 1:30"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`grid gap-3 ${isSdsStep ? "lg:grid-cols-5" : "lg:grid-cols-3"}`}>
        <Button
          type="button"
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          onClick={() => {
            setReturnTemplate("");
            setReasonTag("OTHER");
            setRoutePosition("");
            setRouteReviewerId("");
            setRouteSuggestionPosition("");
            setSelectedAction("approve");
          }}
          disabled={submitting}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          {isSdsStep || isPresidentFinalStep ? "Final Approve" : "Approve"}
        </Button>
        {isSdsStep && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setReturnTemplate("");
                setReasonTag("OTHER");
                setRoutePosition("");
                setRouteReviewerId("");
                setSelectedAction("route");
              }}
              disabled={submitting}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Route
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setReturnTemplate("");
                setReasonTag("OTHER");
                setRoutePosition("UNIVERSITY_PRESIDENT");
                setRouteReviewerId("");
                setSelectedAction("route");
              }}
              disabled={submitting}
            >
              <UserRound className="mr-2 h-4 w-4" />
              President
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setReturnTemplate("");
            setReasonTag("OTHER");
            setRoutePosition("");
            setRouteReviewerId("");
            setRouteSuggestionPosition("");
            setSelectedAction("return");
          }}
          disabled={submitting}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Return
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          onClick={() => {
            setReturnTemplate("");
            setReasonTag("OTHER");
            setRoutePosition("");
            setRouteReviewerId("");
            setRouteSuggestionPosition("");
            setSelectedAction("reject");
          }}
          disabled={submitting}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
      </div>

      {selectedAction && (
        <ModalBase onClose={() => !submitting && setSelectedAction(null)}>
          <Card className="w-[min(92vw,520px)]">
            <CardHeader>
              <CardTitle>{selectedActionLabel}</CardTitle>
              <CardDescription>{selectedActionDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id={reviewFormId}
                action={handleReview}
                className="space-y-4"
              >
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="stepId" value={step.id} />
                <input type="hidden" name="action" value={selectedAction} />
                <input type="hidden" name="reasonTag" value={reasonTag} />
                {selectedAction === "approve" && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-sm font-semibold text-foreground">
                      Handoff preview
                    </p>
                    <p className="text-xs text-muted-foreground">
                      After approval, this request goes to: {approveHandoffLabel}.
                    </p>
                  </div>
                )}
                {selectedAction === "approve" &&
                  !isSdsStep &&
                  !isPresidentFinalStep && (
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          Optional route recommendation
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SDS will make the routing decision. Your
                          recommendation appears in the decision brief.
                        </p>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="route-suggestion-position">
                            Recommend route
                          </Label>
                          <Select
                            name="routeSuggestionPosition"
                            value={routeSuggestionPosition}
                            onValueChange={setRouteSuggestionPosition}
                          >
                            <SelectTrigger id="route-suggestion-position">
                              <SelectValue placeholder="No recommendation" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROUTE_TARGET_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="route-suggestion-reason">
                            Reason
                          </Label>
                          <Input
                            id="route-suggestion-reason"
                            name="routeSuggestionReason"
                            placeholder="Why should SDS consider this route?"
                            disabled={!routeSuggestionPosition}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                {selectedAction === "route" && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        SDS route target
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Choose the reviewer who should receive this request
                        next. President routing is treated as final approval.
                      </p>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="route-position">Route to</Label>
                        <Select
                          name="routePosition"
                          value={routePosition}
                          onValueChange={(value) => {
                            setRoutePosition(value);
                            setRouteReviewerId("");
                          }}
                          required
                        >
                          <SelectTrigger id="route-position">
                            <SelectValue placeholder="Select route" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROUTE_TARGET_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="route-reviewer">Reviewer</Label>
                        <Select
                          name="routeReviewerId"
                          value={routeReviewerValue}
                          onValueChange={setRouteReviewerId}
                          required={routeReviewerRequired}
                          disabled={!routePosition || routeReviewerOptions.length === 0}
                        >
                          <SelectTrigger id="route-reviewer">
                            <SelectValue
                              placeholder={
                                routePosition
                                  ? "Use assigned reviewer"
                                  : "Select route first"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {routeReviewerOptions.map((reviewer: any) => (
                              <SelectItem key={reviewer.id} value={reviewer.id}>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {reviewer.name}
                                  </span>
                                  {reviewer.title && (
                                    <span className="text-xs text-muted-foreground">
                                      {reviewer.title}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {missingRouteOptions ? (
                          <p className="text-xs text-destructive">
                            No active {routePositionLabel(routePosition)} account
                            is configured.
                          </p>
                        ) : routePosition === "UNIVERSITY_PRESIDENT" ? (
                          <p className="text-xs text-muted-foreground">
                            President approval will complete the request.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
                {selectedAction === "return" && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <Label htmlFor="return-template">Reason template</Label>
                    <Select
                      value={returnTemplate}
                      onValueChange={(value) => setReturnTemplate(value)}
                    >
                      <SelectTrigger id="return-template" className="mt-2">
                        <SelectValue placeholder="Pick quick return reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {returnTemplates.map((template) => (
                          <SelectItem key={template} value={template}>
                            {template}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Use template as opener, then add exact revision notes.
                    </p>
                  </div>
                )}
                {(selectedAction === "return" || selectedAction === "reject") && (
                  <div className="space-y-2">
                    <Label htmlFor="reason-tag">Decision reason tag</Label>
                    <Select value={reasonTag} onValueChange={setReasonTag}>
                      <SelectTrigger id="reason-tag">
                        <SelectValue placeholder="Select reason tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POLICY">Policy</SelectItem>
                        <SelectItem value="SCHEDULE">Schedule</SelectItem>
                        <SelectItem value="REQUIREMENTS">Requirements</SelectItem>
                        <SelectItem value="SAFETY">Safety</SelectItem>
                        <SelectItem value="BUDGET">Budget</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>{selectedActionCommentLabel}</Label>
                  <Textarea
                    name="comment"
                    placeholder={
                      selectedAction === "return" && returnTemplate
                        ? `${returnTemplate}: add required revisions`
                        : selectedActionPlaceholder
                    }
                    required={
                      selectedAction === "return" || selectedAction === "reject"
                    }
                    rows={4}
                    defaultValue={
                      selectedAction === "return" && returnTemplate
                        ? `${returnTemplate}: `
                        : ""
                    }
                  />
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedAction(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      submitting ||
                      ((selectedAction === "approve" ||
                        selectedAction === "route") &&
                        attachmentLimitExceeded) ||
                      (selectedAction === "route" &&
                        (!routePosition ||
                          missingRouteOptions ||
                          (routeReviewerRequired && !routeReviewerValue)))
                    }
                    variant={
                      selectedAction === "reject" ? "destructive" : "default"
                    }
                    className={
                      selectedAction === "approve"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : ""
                    }
                  >
                    {submitting && <ButtonSpinner />}
                    {submitting ? "Saving..." : selectedActionLabel}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </ModalBase>
      )}
    </div>
  );
}

function SdsClearanceEditControls({
  request,
  me,
  onRefresh,
}: {
  request: any;
  me: any;
  onRefresh: () => Promise<void>;
}) {
  const popup = usePopup();
  const part4 = request.sapfPart4 || {};
  const initialHasAttachments =
    typeof part4.hasAttachments === "boolean"
      ? String(part4.hasAttachments)
      : "";
  const [hasAttachments, setHasAttachments] = useState(initialHasAttachments);
  const [attachmentTotal, setAttachmentTotal] = useState(0);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const attachmentLimitExceeded = attachmentTotal > MAX_ATTACHMENT_BYTES;
  const formId = `sds-clearance-form-${request.id}`;

  const sdsStep = request.approvalSteps?.find(
    (item: any) =>
      item.position === "SDS" &&
      item.reviewerId === me?.id &&
      item.status === "APPROVED",
  );
  const isLocked = ["APPROVED", "REJECTED", "CANCELLED"].includes(
    request.status,
  );

  if (!sdsStep || isLocked) return null;

  const yesNoField = (name: string, label: string, value: any) => (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input
            form={formId}
            type="radio"
            name={name}
            value="true"
            required
            defaultChecked={value === true}
            className="h-4 w-4 accent-primary"
          />
          Yes
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input
            form={formId}
            type="radio"
            name={name}
            value="false"
            required
            defaultChecked={value === false}
            className="h-4 w-4 accent-primary"
          />
          No
        </label>
      </div>
    </div>
  );

  const handleSubmit = async (formData: FormData) => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await updateSdsClearance(formData);
      if (!result.success) {
        popup.showError(result.message);
        return;
      }
      setAttachmentTotal(0);
      setAttachmentNames([]);
      setAttachmentInputKey((key) => key + 1);
      popup.showSuccess(result.message || "SDS clearance updated.");
      await onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-muted p-4">
      <div>
        <p className="font-semibold text-foreground">
          Update SDS Office Clearance
        </p>
        <p className="text-sm text-muted-foreground">
          You can revise Part 4 until the request is fully completed.
        </p>
      </div>

      <form id={formId} action={handleSubmit} className="grid gap-3">
        <input type="hidden" name="requestId" value={request.id} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border bg-card p-3 shadow-xs">
            {yesNoField(
              "parentsConsent",
              "Parent's Consent Form",
              part4.parentsConsent,
            )}
          </div>
          <div className="rounded-md border bg-card p-3 shadow-xs">
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Paperclip className="h-4 w-4" />
                Attachments
              </p>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="hasAttachments"
                    value="true"
                    required
                    checked={hasAttachments === "true"}
                    onChange={(event) => setHasAttachments(event.target.value)}
                    className="h-4 w-4 accent-primary"
                  />
                  Yes
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="hasAttachments"
                    value="false"
                    required
                    checked={hasAttachments === "false"}
                    onChange={(event) => {
                      setHasAttachments(event.target.value);
                      setAttachmentTotal(0);
                      setAttachmentNames([]);
                      setAttachmentInputKey((key) => key + 1);
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                  No
                </label>
              </div>
              <Input
                key={attachmentInputKey}
                type="file"
                name="attachmentFiles"
                multiple
                disabled={hasAttachments !== "true"}
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  setAttachmentTotal(
                    files.reduce((sum, file) => sum + file.size, 0),
                  );
                  setAttachmentNames(
                    files.map(
                      (file) => `${file.name} (${formatFileSize(file.size)})`,
                    ),
                  );
                }}
                className="bg-background"
              />
              <div
                className={`text-xs ${
                  attachmentLimitExceeded
                    ? "text-red-600"
                    : "text-muted-foreground"
                }`}
              >
                {formatFileSize(attachmentTotal)} / 25 MB
              </div>
              {attachmentNames.length > 0 && (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {attachmentNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border bg-card p-3 shadow-xs">
            <div className="space-y-3">
              {yesNoField(
                "academicInterruption",
                "Academic Class Interruption",
                part4.academicInterruption,
              )}
              <div>
                <Label>Academic Interruption Remarks</Label>
                <Input
                  name="academicInterruptionRemarks"
                  placeholder="Remarks"
                  defaultValue={part4.academicInterruptionRemarks || ""}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <div className="rounded-md border bg-card p-3 shadow-xs">
            {yesNoField(
              "medicalExam",
              "Medical Exam Request",
              part4.medicalExam,
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="rounded-md border bg-card p-3 shadow-xs">
            {yesNoField(
              "reportOfCompliance",
              "Report of Compliance",
              part4.reportOfCompliance,
            )}
          </div>
          <div className="rounded-md border bg-card p-3 shadow-xs">
            <Label>Student-Personnel Ratio</Label>
            <Input
              name="studentPersonnelRatio"
              placeholder="e.g. 1:30"
              defaultValue={part4.studentPersonnelRatio || ""}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting || attachmentLimitExceeded}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting && <ButtonSpinner />}
            {submitting ? "Saving..." : "Update SDS Clearance"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SdsEvaluationControls({
  request,
  me,
  onRefresh,
}: {
  request: any;
  me: any;
  onRefresh: () => Promise<void>;
}) {
  const popup = usePopup();
  const part6 = request.sapfPart6 || {};
  const [submitting, setSubmitting] = useState(false);
  const canEdit =
    request.status === "APPROVED" &&
    request.approvalSteps?.some(
      (item: any) => item.position === "SDS" && item.reviewerId === me?.id,
    );

  if (!canEdit) return null;

  const handleSubmit = async (formData: FormData) => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await updateSdsEvaluation(formData);
      if (!result.success) {
        popup.showError(result.message);
        return;
      }
      popup.showSuccess(result.message || "Part 6 evaluation updated.");
      await onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-orange-600">Part 6: Evaluation</CardTitle>
        <CardDescription>
          SDS can update this evaluation after the request is completed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="requestId" value={request.id} />
          <div className="grid overflow-hidden rounded-md border md:grid-cols-2">
            <div className="border-b md:border-r md:border-b-0">
              <div className="border-b bg-amber-100 px-3 py-2 text-center text-sm font-bold text-foreground">
                CONDUCTED
              </div>
              <div className="p-3">
                <Label htmlFor="conductedRemarks">
                  Remarks: {"{conductedRemarks}"}
                </Label>
                <Textarea
                  id="conductedRemarks"
                  name="conductedRemarks"
                  defaultValue={part6.conductedRemarks || ""}
                  className="mt-2 min-h-28 resize-y border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
            <div>
              <div className="border-b bg-amber-100 px-3 py-2 text-center text-sm font-bold text-foreground">
                CANCELED
              </div>
              <div className="p-3">
                <Label htmlFor="cancelledRemarks">
                  Remarks: {"{cancelledRemarks}"}
                </Label>
                <Textarea
                  id="cancelledRemarks"
                  name="cancelledRemarks"
                  defaultValue={part6.cancelledRemarks || ""}
                  className="mt-2 min-h-28 resize-y border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting && <ButtonSpinner />}
              {submitting ? "Saving..." : "Save Part 6"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function RequestDetail({
  request,
  me,
  onRefresh,
  approvers,
  showReviewControls = true,
  showConcernThreads = true,
}: {
  request: any;
  me: any;
  onRefresh: () => Promise<void>;
  approvers?: Record<string, any[]>;
  showReviewControls?: boolean;
  showConcernThreads?: boolean;
}) {
  const activeReviewStep = request.approvalSteps?.find(
    (item: any) => item.status === "ACTIVE" && item.reviewerId === me?.id,
  );
  const canEditApprovedSdsPart4 =
    me?.role !== "SUPER_ADMIN" &&
    !["APPROVED", "REJECTED", "CANCELLED"].includes(request.status) &&
    request.approvalSteps?.some(
      (item: any) =>
        item.position === "SDS" &&
        item.reviewerId === me?.id &&
        item.status === "APPROVED",
    );
  const hideReadOnlyPart4 =
    showReviewControls &&
    me?.role !== "SUPER_ADMIN" &&
    (activeReviewStep?.position === "SDS" || canEditApprovedSdsPart4);

  return (
    <MotionPage className="space-y-5">
      <MotionSection>
        <RequestSummary request={request} />
      </MotionSection>
      {showReviewControls && (
        <MotionSection>
          <ChangeRequestReviewControls
            request={request}
            me={me}
            onRefresh={onRefresh}
          />
        </MotionSection>
      )}
      {showReviewControls && (
        <MotionSection>
          <ReviewControls
            request={request}
            me={me}
            onRefresh={onRefresh}
            approvers={approvers}
          />
        </MotionSection>
      )}
      <MotionSection>
        <SapfReadonlyDetails request={request} hidePart4={hideReadOnlyPart4} />
      </MotionSection>
      {showReviewControls && (
        <MotionSection>
          <SdsClearanceEditControls
            request={request}
            me={me}
            onRefresh={onRefresh}
          />
        </MotionSection>
      )}
      {showReviewControls && (
        <MotionSection>
          <SdsEvaluationControls
            request={request}
            me={me}
            onRefresh={onRefresh}
          />
        </MotionSection>
      )}
      {showConcernThreads && (
        <MotionSection>
          <ConcernThreads request={request} onRefresh={onRefresh} />
        </MotionSection>
      )}
    </MotionPage>
  );
}
