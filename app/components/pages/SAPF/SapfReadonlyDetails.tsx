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
import { MotionItem, MotionList } from "@/app/components/ui/motion";
import { CalendarDays, Check, Clock, Download, X } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  CORE_VALUE_OPTIONS,
  getSapfParts,
  GRADUATE_ATTRIBUTE_OPTIONS,
  SUPPORT_REQUEST_OPTIONS,
} from "./sapfData";
import {
  formatSapfDateInputValue,
  formatSapfDateTime,
  formatSapfTime,
} from "./sapfSchedule";

function valueOrDash(value: any) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatAttachmentSize(size: number) {
  if (!size) return "0 MB";
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function canPreviewAttachment(attachment: any) {
  const mimeType = String(attachment?.mimeType || "").toLowerCase();
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

function isPdfAttachment(attachment: any) {
  return String(attachment?.mimeType || "").toLowerCase() === "application/pdf";
}

function ReadOnlyField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: any;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 min-h-10 rounded-md border bg-muted px-3 py-2 text-sm text-foreground">
        {valueOrDash(value)}
      </div>
    </div>
  );
}

function ReadOnlyLongField({
  label,
  value,
  rows = "min-h-24",
}: {
  label: string;
  value: any;
  rows?: string;
}) {
  return (
    <div className="md:col-span-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div
        className={`mt-1 whitespace-pre-wrap rounded-md border bg-muted px-3 py-2 text-sm text-foreground ${rows}`}
      >
        {valueOrDash(value)}
      </div>
    </div>
  );
}

function ReadOnlyAttachments({
  requestId,
  attachments,
  label = "Attachments",
}: {
  requestId: string;
  attachments?: any[];
  label?: string;
}) {
  const [previewAttachment, setPreviewAttachment] = useState<any | null>(null);

  if (!attachments?.length) {
    return <ReadOnlyField label={label} value="-" />;
  }

  const attachmentUrl = (attachment: any, preview = false) =>
    `/api/sapf/${requestId}/attachments/${attachment.id}${
      preview ? "?preview=1" : ""
    }`;

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 min-h-10 space-y-1 rounded-md border bg-muted px-3 py-2 text-sm text-foreground">
        {attachments.map((attachment) => (
          <a
            key={attachment.id}
            href={attachmentUrl(attachment)}
            onClick={(event) => {
              if (!canPreviewAttachment(attachment)) return;
              event.preventDefault();
              setPreviewAttachment(attachment);
            }}
            className="block text-primary hover:underline"
          >
            {attachment.fileName} ({formatAttachmentSize(attachment.size)})
          </a>
        ))}
      </div>
      {previewAttachment && (
        <ModalBase onClose={() => setPreviewAttachment(null)}>
          <div className="flex h-[min(88vh,760px)] w-[min(94vw,980px)] flex-col overflow-hidden rounded-lg bg-card shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {previewAttachment.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatAttachmentSize(previewAttachment.size)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={attachmentUrl(previewAttachment)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setPreviewAttachment(null)}
                  aria-label="Close attachment preview"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/40 p-3">
              {isPdfAttachment(previewAttachment) ? (
                <iframe
                  src={attachmentUrl(previewAttachment, true)}
                  title={previewAttachment.fileName}
                  className="h-full w-full rounded-md border bg-background"
                />
              ) : (
                <div className="relative h-full w-full">
                  <Image
                    src={attachmentUrl(previewAttachment, true)}
                    alt={previewAttachment.fileName}
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </ModalBase>
      )}
    </div>
  );
}

function ReadOnlyChecklist({
  label,
  options,
  selected,
  columns = "sm:grid-cols-2",
  detailsByOption = {},
}: {
  label: string;
  options: string[];
  selected: string[];
  columns?: string;
  detailsByOption?: Record<string, ReactNode>;
}) {
  const selectedSet = new Set(selected);

  return (
    <div className="md:col-span-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className={`mt-2 grid gap-2 ${columns}`}>
        {options.map((option) => {
          const checked = selectedSet.has(option);
          const details = detailsByOption[option];
          return (
            <div
              key={option}
              className={`min-h-9 rounded-md border bg-muted px-3 py-2 text-sm text-foreground ${
                checked && details ? "sm:col-span-2" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    checked
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-border bg-background"
                  }`}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span>{option}</span>
              </div>
              {checked && details ? (
                <div className="mt-3 border-t pt-3">{details}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SapfReadonlyDetails({
  request,
  hidePart4 = false,
}: {
  request: any;
  hidePart4?: boolean;
}) {
  const sapf = request.sapf || getSapfParts(request);
  const part1 = sapf.part1;
  const part2 = sapf.part2;
  const part4 = sapf.part4 || {};
  const supportDetail = (label: string, value: any) => (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 whitespace-pre-wrap rounded-md border bg-background px-3 py-2 text-sm">
        {valueOrDash(value)}
      </div>
    </div>
  );
  const schedules = Array.isArray(request.schedules) ? request.schedules : [];

  return (
    <MotionList className="space-y-6">
      <MotionItem>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Schedule
          </CardTitle>
          <CardDescription>Reserved venue date and time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {schedules.map((schedule: any, index: number) => (
            <div
              key={schedule.id || `${schedule.startAt}-${index}`}
              className="grid gap-4 rounded-md border bg-muted p-3 md:grid-cols-3"
            >
              <ReadOnlyField
                label={`Day ${index + 1}`}
                value={formatSapfDateInputValue(schedule.startAt)}
              />
              <ReadOnlyField
                label="Start Time"
                value={formatSapfTime(schedule.startAt)}
              />
              <ReadOnlyField
                label="End Time"
                value={formatSapfTime(schedule.endAt)}
              />
              <div className="md:col-span-3">
                <Badge variant="outline" className="gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  {formatSapfDateTime(schedule.startAt)} to{" "}
                  {formatSapfTime(schedule.endAt)}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      </MotionItem>

      <MotionItem>
      <Card>
        <CardHeader>
          <CardTitle>Department Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ReadOnlyField
            label="Department Category"
            value={part1.departmentCategory}
          />
        </CardContent>
      </Card>
      </MotionItem>

      <MotionItem>
      <Card>
        <CardHeader>
          <CardTitle>Part 1: Activity Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Activity Title" value={part1.activityTitle} />
          <ReadOnlyField label="Organization" value={part1.organization} />
          <ReadOnlyField label="Department" value={part1.department} />
          <ReadOnlyField label="Program/Course" value={part1.programCourse} />
          <ReadOnlyField label="Venue" value={part1.venue} />
          <ReadOnlyField label="Modality" value={part1.modality} />
          <ReadOnlyField label="Setting" value={part1.setting} />
          {part1.setting === "Off-Campus" ? (
            <ReadOnlyField
              label="Off-Campus Agreement"
              value={part1.offCampAgree}
            />
          ) : null}
          <ReadOnlyField
            label="Personnel-In-Charge"
            value={part1.personnelInCharge}
          />
          <ReadOnlyField label="Activity Type" value={part1.activityType} />
          <ReadOnlyField label="Attire" value={part1.attire} />
          <ReadOnlyField label="Scope" value={part1.scope} />
          <ReadOnlyField
            label="No. of Participants"
            value={part1.noOfParticipants}
          />
          <ReadOnlyField label="Program" value={part1.program} />
          <ReadOnlyLongField label="Rationale" value={part1.rationale} />
          <ReadOnlyLongField label="Objective/s" value={part1.objectives} />
          <ReadOnlyChecklist
            label="Applicable Augustinian Core Values"
            options={CORE_VALUE_OPTIONS}
            selected={part1.coreValues}
            columns="sm:grid-cols-3"
          />
          <ReadOnlyChecklist
            label="Expected Graduate Attributes"
            options={GRADUATE_ATTRIBUTE_OPTIONS}
            selected={part1.graduateAttributes}
          />
          <ReadOnlyLongField
            label="Program Flow"
            value={part1.programFlow}
            rows="min-h-20"
          />
          <ReadOnlyLongField
            label="Emergency Plan"
            value={part1.emergencyPlan}
            rows="min-h-20"
          />
          <div className="md:col-span-2">
            <ReadOnlyAttachments
              requestId={request.id}
              attachments={part1.programFlowAttachments}
              label="Program Flow Attachments"
            />
          </div>
          <ReadOnlyField label="Budget" value={part1.budget} />
          <ReadOnlyField
            label="Source of Budget"
            value={part1.sourceOfBudget}
          />
        </CardContent>
      </Card>
      </MotionItem>

      <MotionItem>
      <Card>
        <CardHeader>
          <CardTitle>Part 2: School Support</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ReadOnlyChecklist
            label="Requested Support"
            options={SUPPORT_REQUEST_OPTIONS}
            selected={part2.supportRequests}
            detailsByOption={{
              Budget: supportDetail("Budget Details", part2.budgetDetails),
              Vehicle: supportDetail(
                "Vehicle Passengers",
                part2.vehiclePassengers,
              ),
              "Food/Snacks": supportDetail("Food/Snacks Pax", part2.foodPax),
              "Room/Venue": supportDetail(
                "Room/Venue Details",
                part2.roomVenueDetails,
              ),
              Microphone: supportDetail(
                "Microphone Quantity",
                part2.microphoneQty,
              ),
            }}
          />
          <ReadOnlyLongField
            label="Provision For Students With Diverse Needs"
            value={part2.extraProvisions}
            rows="min-h-20"
          />
          <ReadOnlyField
            label="Other Support Requests"
            value={part2.otherSupport}
          />
        </CardContent>
      </Card>
      </MotionItem>

      <MotionItem>
      <Card>
        <CardHeader>
          <CardTitle>Part 3: Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ReadOnlyLongField
            label="Other Details"
            value={sapf.part3}
            rows="min-h-32"
          />
        </CardContent>
      </Card>
      </MotionItem>

      {!hidePart4 && (
        <MotionItem>
        <Card>
          <CardHeader>
            <CardTitle>Part 4: SDS Office Clearance</CardTitle>
            <CardDescription>
              This section is filled by the SDS Office.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField
              label="Parent's Consent Form"
              value={part4.parentsConsent}
            />
            <ReadOnlyAttachments
              requestId={request.id}
              attachments={part4.attachments}
            />
            <ReadOnlyField
              label="Academic Class Interruption"
              value={part4.academicInterruption}
            />
            <ReadOnlyField
              label="Academic Interruption Remarks"
              value={part4.academicInterruptionRemarks}
            />
            <ReadOnlyField
              label="Medical Exam Request"
              value={part4.medicalExam}
            />
            <ReadOnlyField
              label="Report of Compliance"
              value={part4.reportOfCompliance}
            />
            <ReadOnlyField
              label="Student-Personnel Ratio"
              value={part4.studentPersonnelRatio}
            />
          </CardContent>
        </Card>
        </MotionItem>
      )}
    </MotionList>
  );
}
