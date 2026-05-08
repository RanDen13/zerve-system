"use client";

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
import { Checkbox } from "@/app/components/ui/checkbox";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import {
  CalendarDays,
  ChevronsUpDown,
  CheckCircle2,
  Info,
  Loader2,
  Paperclip,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EventSpaceData } from "../Spaces/schema";
import { saveSapfRequest } from "./SapfActions";
import {
  CORE_VALUE_OPTIONS,
  DEPARTMENT_CATEGORY_OPTIONS,
  GRADUATE_ATTRIBUTE_OPTIONS,
  SUPPORT_REQUEST_OPTIONS,
} from "./sapfData";
import {
  EQUIPMENT_SUPPORT_LABELS,
  equipmentFieldForSupportLabel,
  normalizeSupportRequestLabel,
  parseEquipmentQuantity,
} from "./sapfEquipment";
import {
  addSapfCalendarDays,
  formatSapfDateForMessage,
  formatSapfDateInputValue,
  formatSapfTimeInputValue,
  startOfSapfDay,
} from "./sapfSchedule";

const DEFAULT_BOOKING_ADVANCE_DAYS = 30;
const MAX_PROGRAM_FLOW_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const REQUIRED_CHAIN_POSITIONS = [
  "DEAN",
  "SDS",
  "SAS",
  "VPAA_ASSISTANT",
  "VPAA",
  "UNIVERSITY_PRESIDENT",
] as const;

type ScheduleRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

type EquipmentCatalogItem = {
  id: string;
  name: string;
  supportLabel?: string | null;
  totalQuantity: number;
  active: boolean;
  allocations?: Array<{
    requestId: string;
    quantity: number;
    schedules?: Array<{
      startAt: string | Date;
      endAt: string | Date;
    }>;
  }>;
};

const PROGRAM_OPTIONS = [
  "Team Building",
  "Leadership Summit",
  "General Assembly",
  "Competition",
  "Press Conference",
  "Seminar/Convention",
  "Others",
] as const;
const ORGANIZATION_OPTIONS = ["SIES", "JPSSITE", "ACPES"] as const;
const PROGRAM_COURSE_OPTIONS = ["BSCPE", "BSIT", "BSIE", "BSITCS"] as const;
const CUSTOM_PERSONNEL_VALUE = "__custom__";

const PROGRAM_ALIASES: Record<string, (typeof PROGRAM_OPTIONS)[number]> = {
  "team building": "Team Building",
  "leadership summit": "Leadership Summit",
  "general assembly": "General Assembly",
  competition: "Competition",
  "press conference": "Press Conference",
  seminar: "Seminar/Convention",
  convention: "Seminar/Convention",
  "seminar/convention": "Seminar/Convention",
};

function ButtonSpinner() {
  return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
}

function RequiredMark() {
  return <span className="ml-1 text-destructive">*</span>;
}

function amountInput(value: string) {
  const digits = value.replace(/[^\d.]/g, "");
  const [whole = "", decimal = ""] = digits.split(".");
  const cleanWhole = whole.replace(/^0+(?=\d)/, "");
  const grouped = cleanWhole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (decimal) return `${grouped}.${decimal.slice(0, 2)}`;
  return grouped;
}

function parseBudgetDetails(value?: string) {
  const text = String(value || "");
  const read = (label: string, nextLabels: string[]) => {
    if (nextLabels.length === 0) {
      return (
        text.match(new RegExp(`${label}:\\s*([\\s\\S]*)$`, "i"))?.[1]?.trim() ||
        ""
      );
    }

    const nextPattern = nextLabels.map((item) => `${item}:`).join("|");
    const pattern = new RegExp(
      `${label}:\\s*([\\s\\S]*?)(?=\\s*(?:${nextPattern})|$)`,
      "i",
    );
    return text.match(pattern)?.[1]?.trim() || "";
  };

  return {
    amount: read("Requested amount", ["Purpose", "Breakdown"]),
    purpose: read("Purpose", ["Breakdown"]),
    breakdown: read("Breakdown", []),
  };
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function userNameWithTitle(user: any) {
  return user.title ? `${user.name}, ${user.title}` : user.name;
}

function isFinanceSignatoryUser(user: any) {
  return [user?.name, user?.email, user?.title]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes("finance"));
}

function createSubmissionKey() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

const REQUIRED_FIELD_LABELS: Record<string, string> = {
  activityTitle: "Activity title",
  organization: "Organization",
  programCourse: "Program/course",
  offCampAgree: "Off-campus agreement",
  personnelInCharge: "Personnel-in-charge",
  attire: "Attire",
  noOfParticipants: "No. of participants",
  program: "Program",
  rationale: "Rationale",
  objectives: "Objectives",
  programFlow: "Program flow",
  emergencyPlan: "Emergency plan",
  budget: "Personal budget",
  sourceOfBudget: "Source of budget",
  budgetRequestedAmount: "Requested budget amount",
  budgetPurpose: "Budget purpose",
  budgetBreakdown: "Budget breakdown",
  revisionSummary: "Revision comment",
};

function positionLabel(position: string) {
  if (position === "SDS") return "SDS/Admin";
  if (position === "SAS") return "SAS";
  if (position === "VPAA") return "VPAA";
  if (position === "VPAA_ASSISTANT") return "VPAA Assistant";
  if (position === "UNIVERSITY_PRESIDENT") return "University President";
  return position
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function programOptionForValue(value?: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return PROGRAM_ALIASES[normalized] || "Others";
}

function initialProgramState(value?: string) {
  const trimmed = String(value || "").trim();
  const option = trimmed ? programOptionForValue(trimmed) : "Team Building";
  return {
    option,
    other: option === "Others" ? trimmed : "",
  };
}

function createScheduleRow(
  date = "",
  startTime = "",
  endTime = "",
): ScheduleRow {
  return {
    id: `${date}-${startTime}-${endTime}-${Math.random().toString(36).slice(2)}`,
    date,
    startTime,
    endTime,
  };
}

function addDaysToDateInput(date: string, days: number) {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day + days));
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().slice(0, 10);
}

function nextScheduleDate(baseDate: string, existingDates: Set<string>) {
  let nextDate = addDaysToDateInput(baseDate, 1);
  while (nextDate && existingDates.has(nextDate)) {
    nextDate = addDaysToDateInput(nextDate, 1);
  }
  return nextDate;
}

function localDateTime(date: string, time: string) {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function scheduleRangesFromRows(rows: ScheduleRow[]) {
  return rows
    .map((row) => {
      const startAt = localDateTime(row.date, row.startTime);
      const endAt = localDateTime(row.date, row.endTime);
      if (!startAt || !endAt) return null;
      return { startAt, endAt };
    })
    .filter(Boolean) as Array<{ startAt: Date; endAt: Date }>;
}

function rangesOverlap(
  ranges: Array<{ startAt: Date; endAt: Date }>,
  schedules: Array<{ startAt: string | Date; endAt: string | Date }>,
) {
  if (!ranges.length) return false;
  return ranges.some((range) =>
    schedules.some((schedule) => {
      const startAt = new Date(schedule.startAt);
      const endAt = new Date(schedule.endAt);
      return startAt < range.endAt && endAt > range.startAt;
    }),
  );
}

function getRequestScheduleRows(initialRequest?: any): ScheduleRow[] {
  if (!initialRequest) {
    return [createScheduleRow()];
  }

  const schedules = Array.isArray(initialRequest.schedules)
    ? initialRequest.schedules
    : [];

  return schedules.length
    ? schedules.map((schedule: any) =>
        createScheduleRow(
          formatSapfDateInputValue(schedule.startAt),
          formatSapfTimeInputValue(schedule.startAt),
          formatSapfTimeInputValue(schedule.endAt),
        ),
      )
    : [createScheduleRow()];
}

function addUniqueMissing(items: string[], item: string) {
  if (!items.includes(item)) items.push(item);
}

function labelForRequiredElement(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  if (element.name === "scheduleDate") return "Schedule date";
  if (element.name === "scheduleStartTime") return "Schedule start time";
  if (element.name === "scheduleEndTime") return "Schedule end time";
  if (REQUIRED_FIELD_LABELS[element.name]) return REQUIRED_FIELD_LABELS[element.name];

  const idLabel = element.id
    ? element.ownerDocument.querySelector(`label[for="${CSS.escape(element.id)}"]`)
    : null;
  const nearbyLabel = element.closest("div")?.querySelector("label");
  const label = idLabel || nearbyLabel;
  const text = label?.textContent?.replace("*", "").trim();
  return text || element.name || "Required field";
}

function nativeMissingRequiredLabels(form: HTMLFormElement | null) {
  if (!form) return [];

  const missing: string[] = [];
  const requiredElements = form.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >("input[required], textarea[required], select[required]");

  requiredElements.forEach((element) => {
    if (element.disabled || element.type === "hidden" || element.validity.valid) {
      return;
    }

    addUniqueMissing(missing, labelForRequiredElement(element));
  });

  return missing;
}

function selectedVenueIdsFromRequest(initialRequest?: any) {
  const joined = (initialRequest?.venues || [])
    .map((item: any) => item.eventSpaceId || item.eventSpace?.id)
    .filter(Boolean);

  return joined;
}

export default function SapfBookingForm({
  venues,
  approvers,
  equipmentItems = [],
  initialRequest,
  editorMode = "officer",
  preselectedVenueIds = [],
}: {
  venues: EventSpaceData[];
  approvers: Record<string, any[]>;
  equipmentItems?: EquipmentCatalogItem[];
  initialRequest?: any;
  editorMode?: "officer" | "sds";
  preselectedVenueIds?: string[];
}) {
  const popup = usePopup();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const initialScheduleRows = getRequestScheduleRows(initialRequest);
  const initialVenueIds = initialRequest
    ? selectedVenueIdsFromRequest(initialRequest)
    : preselectedVenueIds;
  const [scheduleRows, setScheduleRows] =
    useState<ScheduleRow[]>(initialScheduleRows);
  const [selectedVenueIds, setSelectedVenueIds] =
    useState<string[]>(initialVenueIds.slice(0, 1));
  const [participantCount, setParticipantCount] = useState(
    String(initialRequest?.sapfPart1?.noOfParticipants || ""),
  );
  const [nativeFormReady, setNativeFormReady] = useState(false);
  const [nativeMissingFields, setNativeMissingFields] = useState<string[]>([]);
  const [capacityWarning, setCapacityWarning] = useState("");
  const [programFlowAttachmentTotal, setProgramFlowAttachmentTotal] =
    useState(0);
  const [programFlowAttachmentNames, setProgramFlowAttachmentNames] = useState<
    string[]
  >([]);
  const [venuePopoverOpen, setVenuePopoverOpen] = useState(false);
  const [venueSearch, setVenueSearch] = useState("");
  const [adviserPopoverOpen, setAdviserPopoverOpen] = useState(false);
  const [adviserSearch, setAdviserSearch] = useState("");
  const [signatoryPopoverOpen, setSignatoryPopoverOpen] = useState(false);
  const [signatorySearch, setSignatorySearch] = useState("");
  const [savingIntent, setSavingIntent] = useState("");
  const [submissionKey] = useState(createSubmissionKey);
  const isEditing = Boolean(initialRequest);
  const isSdsEditor = editorMode === "sds";
  const lockApprovalChain =
    Boolean(initialRequest) && initialRequest.status !== "DRAFT";
  const formKey = initialRequest?.id || preselectedVenueIds.join("-") || "new";
  const part1 = initialRequest?.sapfPart1 || {};
  const part2 = initialRequest?.sapfPart2 || {};
  const part3 = initialRequest?.sapfPart3 || "";
  const parsedBudgetDetails = parseBudgetDetails(part2.budgetDetails);
  const initialProgram = initialProgramState(part1.program);
  const [selectedProgram, setSelectedProgram] = useState(initialProgram.option);
  const [otherProgram, setOtherProgram] = useState(initialProgram.other);
  const [selectedSetting, setSelectedSetting] = useState(
    part1.setting || "In-Campus",
  );
  const adviserDeanPersonnelOptions = useMemo(() => {
    const seen = new Set<string>();
    return [...(approvers.ADVISER || []), ...(approvers.DEAN || [])].filter(
      (user) => {
        if (seen.has(user.id)) return false;
        seen.add(user.id);
        return true;
      },
    );
  }, [approvers]);
  const existingPersonnel = String(part1.personnelInCharge || "").trim();
  const existingPersonnelMatch = adviserDeanPersonnelOptions.find(
    (user) => userNameWithTitle(user) === existingPersonnel,
  );
  const [selectedPersonnelId, setSelectedPersonnelId] = useState(
    existingPersonnelMatch?.id || (existingPersonnel ? CUSTOM_PERSONNEL_VALUE : ""),
  );
  const selectedPersonnel = adviserDeanPersonnelOptions.find(
    (user) => user.id === selectedPersonnelId,
  );
  const selectedCoreValues = new Set<string>(
    Array.isArray(part1.coreValues) ? part1.coreValues : [],
  );
  const selectedGraduateAttributes = new Set<string>(
    Array.isArray(part1.graduateAttributes) ? part1.graduateAttributes : [],
  );
  const selectedSupportRequests = new Set<string>(
    Array.isArray(part2.supportRequests)
      ? part2.supportRequests.map(normalizeSupportRequestLabel)
      : [],
  );
  const [selectedSupportValues, setSelectedSupportValues] = useState<string[]>(
    Array.from(selectedSupportRequests),
  );
  const supportDetailFields: Record<
    string,
    {
      name: string;
      label: string;
      placeholder: string;
      defaultValue: string;
      multiline?: boolean;
    }
  > = {
    Budget: {
      name: "budgetDetails",
      label: "Budget Details",
      placeholder: "Enter requested amount, purpose, and breakdown.",
      defaultValue: part2.budgetDetails || "",
      multiline: true,
    },
    Vehicle: {
      name: "vehiclePassengers",
      label: "Vehicle Passengers",
      placeholder: "Enter number of passengers or trip details.",
      defaultValue: part2.vehiclePassengers || "",
    },
    "Food/Snacks": {
      name: "foodPax",
      label: "Food/Snacks Pax",
      placeholder: "Enter number of pax.",
      defaultValue: part2.foodPax || "",
    },
    "Room/Venue": {
      name: "roomVenueDetails",
      label: "Room/Venue Details",
      placeholder: "Enter room setup, venue notes, or special requirements.",
      defaultValue: part2.roomVenueDetails || "",
      multiline: true,
    },
    "Sound System": {
      name: "soundSystemQty",
      label: "Sound System Quantity",
      placeholder: "Enter number of sound system units needed.",
      defaultValue: part2.soundSystemQty || "",
    },
    Microphone: {
      name: "microphoneQty",
      label: "Microphone Quantity",
      placeholder: "Enter number of microphones needed.",
      defaultValue: part2.microphoneQty || "",
    },
    "LCD Projector": {
      name: "lcdProjectorQty",
      label: "LCD Projector Quantity",
      placeholder: "Enter number of LCD projectors needed.",
      defaultValue: part2.lcdProjectorQty || "",
    },
    Tables: {
      name: "longTableQty",
      label: "Table Quantity",
      placeholder: "Enter number of tables needed.",
      defaultValue: part2.longTableQty || "",
    },
    Chairs: {
      name: "chairsQty",
      label: "Chairs Quantity",
      placeholder: "Enter number of chairs needed.",
      defaultValue: part2.chairsQty || "",
    },
  };
  const toggleSupportRequest = (value: string, checked: boolean) => {
    setSelectedSupportValues((current) =>
      checked
        ? [...new Set([...current, value])]
        : current.filter((item) => item !== value),
    );

    if (lockApprovalChain || value !== "Budget") return;

    if (checked) {
      const financeIds = financeSignatoryOptions.map((user) => user.id);
      if (financeIds.length > 0) {
        setSelectedAdditionalSignatoryIds((current) => [
          ...new Set([...current, ...financeIds]),
        ]);
      }
      return;
    }

    setSelectedAdditionalSignatoryIds((current) =>
      current.filter((userId) => {
        const user = additionalSignatoryOptions.find((item) => item.id === userId);
        return user ? !isFinanceSignatoryUser(user) : true;
      }),
    );
  };
  const initialAdviserId =
    initialRequest?.approvalSteps?.find(
      (step: any) => step.position === "ADVISER",
    )?.reviewerId || "";
  const initialAdditionalSignatories = new Set<string>(
    (initialRequest?.approvalSteps || [])
      .filter((step: any) => step.position === "ADDITIONAL_SIGNATORY")
      .map((step: any) => step.reviewerId),
  );
  const [selectedAdviserId, setSelectedAdviserId] =
    useState(initialAdviserId);
  const [selectedAdditionalSignatoryIds, setSelectedAdditionalSignatoryIds] =
    useState<string[]>(Array.from(initialAdditionalSignatories));
  const updateFormValidity = () => {
    const form = formRef.current;
    setNativeFormReady(form ? form.checkValidity() : false);
    setNativeMissingFields(nativeMissingRequiredLabels(form));
  };

  const updateNativeFormState = (form: HTMLFormElement) => {
    setNativeFormReady(form.checkValidity());
    setNativeMissingFields(nativeMissingRequiredLabels(form));
  };

  const scheduleFormValidityUpdate = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(updateFormValidity);
    });
  };

  const formValidityKey = `${formKey}|${selectedPersonnelId}|${selectedProgram}`;

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const form = formRef.current;
        setNativeFormReady(form ? form.checkValidity() : false);
        setNativeMissingFields(nativeMissingRequiredLabels(form));
      });
    });
  }, [formValidityKey]);

  const activeVenues = venues.filter((venue) => venue.status === "ACTIVE");
  const selectedVenues = activeVenues.filter((venue) =>
    selectedVenueIds.includes(venue.id),
  );
  const selectedVenue = selectedVenues[0] || null;
  const selectedVenueCapacity = Number(selectedVenue?.capacity || 0);
  const selectedVenueEquipmentSupportKey = (selectedVenue?.amenities || [])
    .filter((amenity: any) => amenity?.active !== false && amenity?.supportLabel)
    .map((amenity: any) => normalizeSupportRequestLabel(amenity.supportLabel))
    .sort()
    .join("|");
  const scheduleRanges = useMemo(
    () => scheduleRangesFromRows(scheduleRows),
    [scheduleRows],
  );
  const equipmentBySupport = useMemo(() => {
    const mapped = new Map<string, EquipmentCatalogItem>();
    equipmentItems.forEach((item) => {
      if (item.supportLabel) {
        mapped.set(normalizeSupportRequestLabel(item.supportLabel), item);
      }
    });
    return mapped;
  }, [equipmentItems]);
  const venueEquipmentSupports = new Set(
    selectedVenueEquipmentSupportKey
      ? selectedVenueEquipmentSupportKey.split("|")
      : [],
  );
  const fixedSupportOptions = SUPPORT_REQUEST_OPTIONS.filter(
    (label) => !EQUIPMENT_SUPPORT_LABELS.includes(label as any),
  );
  const equipmentSupportOptions = equipmentItems
    .filter((item) => item.active && item.supportLabel)
    .map((item) => normalizeSupportRequestLabel(String(item.supportLabel)))
    .filter((label) => venueEquipmentSupports.has(label));
  const supportOptions = Array.from(
    new Set([...fixedSupportOptions, ...equipmentSupportOptions]),
  );
  const activeSelectedSupportValues = selectedSupportValues.filter((value) =>
    supportOptions.includes(value),
  );
  const activeSelectedSupportKey = activeSelectedSupportValues.join("|");

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const form = formRef.current;
        setNativeFormReady(form ? form.checkValidity() : false);
        setNativeMissingFields(nativeMissingRequiredLabels(form));
      });
    });
  }, [activeSelectedSupportKey]);

  const equipmentAvailabilityBySupport = useMemo(() => {
    const mapped = new Map<
      string,
      { item: EquipmentCatalogItem; used: number; available: number }
    >();
    equipmentBySupport.forEach((item, supportLabel) => {
      const used = (item.allocations || [])
        .filter((allocation) =>
          rangesOverlap(scheduleRanges, allocation.schedules || []),
        )
        .reduce((sum, allocation) => sum + allocation.quantity, 0);
      mapped.set(supportLabel, {
        item,
        used,
        available: Math.max(0, Number(item.totalQuantity || 0) - used),
      });
    });
    return mapped;
  }, [equipmentBySupport, scheduleRanges]);
  const venueSearchValue = venueSearch.trim().toLowerCase();
  const filteredVenues = activeVenues.filter((venue) => {
    if (!venueSearchValue) return true;
    return [venue.name, venue.location]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(venueSearchValue));
  });
  const selectedVenueSummary =
    selectedVenues.length === 0
      ? "Select venue"
      : selectedVenues.length === 1
        ? selectedVenues[0].name
        : selectedVenues[0].name;
  const programFlowAttachmentLimitExceeded =
    programFlowAttachmentTotal > MAX_PROGRAM_FLOW_ATTACHMENT_BYTES;
  const bookingAdvanceDays = selectedVenues.length
    ? selectedVenues.reduce(
        (max, venue: any) =>
          Math.max(
            max,
            Number(venue.bookingAdvanceDays ?? DEFAULT_BOOKING_ADVANCE_DAYS),
          ),
        0,
      )
    : DEFAULT_BOOKING_ADVANCE_DAYS;
  const earliestBookingDate = addSapfCalendarDays(
    startOfSapfDay(),
    bookingAdvanceDays,
  );
  const minimumBookingDate = formatSapfDateInputValue(earliestBookingDate);
  const earliestBookingDateLabel = formatSapfDateForMessage(
    earliestBookingDate,
  );
  const bookingAdvanceLabel =
    bookingAdvanceDays > 0
      ? `${bookingAdvanceDays} day${bookingAdvanceDays === 1 ? "" : "s"} in advance`
      : "immediately";
  const adviserOptions = approvers.ADVISER || [];
  const additionalSignatoryOptions = approvers.ADDITIONAL_SIGNATORY || [];
  const budgetSupportSelected = activeSelectedSupportValues.includes("Budget");
  const financeSignatoryOptions = additionalSignatoryOptions.filter(
    isFinanceSignatoryUser,
  );
  const regularAdditionalSignatoryOptions = additionalSignatoryOptions.filter(
    (user) => !isFinanceSignatoryUser(user),
  );
  const availableAdditionalSignatoryOptions = budgetSupportSelected
    ? additionalSignatoryOptions
    : regularAdditionalSignatoryOptions;
  const effectiveSelectedAdditionalSignatoryIds = selectedAdditionalSignatoryIds.filter(
    (userId) => {
      const user = additionalSignatoryOptions.find((item) => item.id === userId);
      return budgetSupportSelected || (user ? !isFinanceSignatoryUser(user) : true);
    },
  );
  const selectedAdviser = adviserOptions.find(
    (user) => user.id === selectedAdviserId,
  );
  const selectedAdditionalSignatories = additionalSignatoryOptions.filter(
    (user) => effectiveSelectedAdditionalSignatoryIds.includes(user.id),
  );
  const userMatchesSearch = (user: any, search: string) => {
    if (!search) return true;
    const normalized = search.trim().toLowerCase();
    return [user.name, user.email, user.title]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized));
  };
  const filteredAdvisers = adviserOptions.filter((user) =>
    userMatchesSearch(user, adviserSearch),
  );
  const filteredAdditionalSignatories = availableAdditionalSignatoryOptions.filter(
    (user) => userMatchesSearch(user, signatorySearch),
  );
  const adviserSummary = selectedAdviser
    ? userNameWithTitle(selectedAdviser)
    : "Select adviser";
  const signatorySummary =
    selectedAdditionalSignatories.length === 0
      ? "Select additional signatories"
      : selectedAdditionalSignatories.length === 1
        ? userNameWithTitle(selectedAdditionalSignatories[0])
        : `${selectedAdditionalSignatories.length} signatories selected`;
  const missingRequiredPositions = lockApprovalChain
    ? []
    : REQUIRED_CHAIN_POSITIONS.filter(
        (position) => (approvers[position] || []).length === 0,
      );
  const missingAdviserOptions =
    !lockApprovalChain && adviserOptions.length === 0;
  const hasMissingChainOptions =
    !lockApprovalChain &&
    (missingAdviserOptions || missingRequiredPositions.length > 0);
  const missingChainLabels = [
    ...(missingAdviserOptions ? ["Adviser"] : []),
    ...missingRequiredPositions.map(positionLabel),
  ];

  const toggleVenue = (venueId: string, checked: boolean) => {
    setSelectedVenueIds(checked ? [venueId] : []);
    if (checked) setVenuePopoverOpen(false);
    setTimeout(updateFormValidity, 0);
  };

  const removeVenue = (venueId: string) => {
    setSelectedVenueIds((current) => current.filter((id) => id !== venueId));
  };

  const updateParticipantCount = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setParticipantCount("");
      setCapacityWarning("");
      return;
    }

    const nextValue = Number(digits);
    if (selectedVenueCapacity > 0 && nextValue > selectedVenueCapacity) {
      setCapacityWarning(
        `${selectedVenue?.name || "Selected venue"} can accommodate only ${selectedVenueCapacity} participants.`,
      );
      popup.showError(
        `Participants cannot exceed venue capacity of ${selectedVenueCapacity}.`,
      );
      return;
    }

    setParticipantCount(digits);
    setCapacityWarning("");
  };

  const selectAdviser = (userId: string) => {
    if (lockApprovalChain) return;
    setSelectedAdviserId(userId);
    setAdviserPopoverOpen(false);
  };

  const toggleAdditionalSignatory = (userId: string, checked: boolean) => {
    if (lockApprovalChain) return;
    setSelectedAdditionalSignatoryIds((current) =>
      checked
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId),
    );
  };

  const removeAdditionalSignatory = (userId: string) => {
    if (lockApprovalChain) return;
    setSelectedAdditionalSignatoryIds((current) =>
      current.filter((id) => id !== userId),
    );
  };

  const updateScheduleRow = (
    rowId: string,
    field: keyof Omit<ScheduleRow, "id">,
    value: string,
  ) => {
    if (
      field === "date" &&
      value &&
      scheduleRows.some((row) => row.id !== rowId && row.date === value)
    ) {
      popup.showError("Each schedule day must use a different date.");
      return;
    }

    setScheduleRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        const next = { ...row, [field]: value };
        if (
          field === "startTime" &&
          next.endTime &&
          value &&
          next.endTime <= value
        ) {
          next.endTime = "";
        }
        return next;
      }),
    );
  };

  const addScheduleRow = () => {
    setScheduleRows((current) => {
      const firstRow = current[0];
      const existingDates = new Set(current.map((row) => row.date));
      return [
        ...current,
        createScheduleRow(
          nextScheduleDate(firstRow?.date || "", existingDates),
          firstRow?.startTime || "",
          firstRow?.endTime || "",
        ),
      ];
    });
  };

  const removeScheduleRow = (rowId: string) => {
    setScheduleRows((current) =>
      current.length === 1
        ? current
        : current.filter((row) => row.id !== rowId),
    );
  };

  const handleSave = async (formData: FormData) => {
    const intent = String(formData.get("intent") ?? "draft");
    const dates = formData.getAll("scheduleDate").map(String);
    const startTimes = formData.getAll("scheduleStartTime").map(String);
    const endTimes = formData.getAll("scheduleEndTime").map(String);

    if (selectedVenueIds.length !== 1) {
      popup.showError("Select one venue.");
      return;
    }

    if (capacityWarning) {
      popup.showError(capacityWarning);
      return;
    }

    if (intent === "submit" && initialRequest?.status === "RETURNED_FOR_REVISION") {
      const revisionSummary = String(formData.get("revisionSummary") || "").trim();
      if (!revisionSummary) {
        popup.showError("Add a comment explaining what you changed.");
        document.getElementById("revision-summary")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return;
      }
    }

    for (let index = 0; index < dates.length; index += 1) {
      if (!dates[index] || !startTimes[index] || !endTimes[index]) {
        popup.showError(`Complete the date and time for day ${index + 1}.`);
        return;
      }

      if (dates[index] < minimumBookingDate) {
        popup.showError(
          bookingAdvanceDays > 0
            ? `Reservations for selected venue(s) must be booked at least ${bookingAdvanceDays} days in advance.`
            : "Reservations for selected venue(s) can be booked immediately, but not before today.",
        );
        return;
      }

      if (endTimes[index] <= startTimes[index]) {
        popup.showError(`Day ${index + 1} end time must be later than start.`);
        return;
      }
    }

    const duplicateDate = dates.find(
      (date, index) => date && dates.indexOf(date) !== index,
    );
    if (duplicateDate) {
      popup.showError("Each schedule day must use a different date.");
      return;
    }

    if (programFlowAttachmentLimitExceeded) {
      popup.showError("Program flow attachments must total 25 MB or less.");
      return;
    }

    if (intent === "submit" && hasMissingChainOptions) {
      popup.showError(
        `Approval chain is incomplete. Configure: ${missingChainLabels.join(
          ", ",
        )}.`,
      );
      return;
    }

    for (const supportValue of activeSelectedSupportValues) {
      const availability = equipmentAvailabilityBySupport.get(supportValue);
      const fieldInfo = equipmentFieldForSupportLabel(supportValue);
      if (!availability || !fieldInfo) continue;

      const requested = parseEquipmentQuantity(formData.get(fieldInfo.quantityField));
      if (requested <= 0) {
        popup.showError(`Enter a quantity for ${supportValue}.`);
        return;
      }
      if (!availability.item.active || availability.available <= 0) {
        popup.showError(`${supportValue} is not available for this schedule.`);
        return;
      }
      if (requested > availability.available) {
        popup.showError(
          `${supportValue} has only ${availability.available} available for this schedule.`,
        );
        return;
      }
    }

    const selectedVenueNames = selectedVenues.map((venue) => venue.name);
    formData.set("venue", selectedVenueNames.join(", "));
    const result = await saveSapfRequest(formData);
    if (!result.success) {
      popup.showError(result.message);
      return;
    }
    popup.showSuccess(result.message || "Reservation saved.");
    if (isSdsEditor && initialRequest?.id) {
      router.push(`/user/approvals/${initialRequest.id}`);
      return;
    }
    if (isEditing && intent === "submit" && initialRequest?.id) {
      router.push(`/user/bookings/${initialRequest.id}`);
      return;
    }
    if (result.data?.id) {
      router.push(`/user/bookings/${result.data.id}`);
      return;
    }
    router.push("/user/bookings");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingIntent) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    if (submitter?.name) {
      formData.set(submitter.name, submitter.value);
    }

    const intent = String(formData.get("intent") ?? "draft");
    setSavingIntent(intent);
    try {
      await handleSave(formData);
    } finally {
      setSavingIntent("");
    }
  };

  const scheduleComplete = scheduleRows.every(
    (row) => row.date && row.startTime && row.endTime,
  );
  const approvalComplete =
    lockApprovalChain ||
    (Boolean(selectedAdviserId) && !hasMissingChainOptions);
  const submitReady =
    nativeFormReady &&
    selectedVenueIds.length === 1 &&
    approvalComplete &&
    Boolean(selectedPersonnelId) &&
    !programFlowAttachmentLimitExceeded &&
    !capacityWarning;
  const missingSubmitItems = [...nativeMissingFields];
  if (selectedVenueIds.length !== 1) {
    addUniqueMissing(missingSubmitItems, "Venue");
  }
  if (!selectedPersonnelId) {
    addUniqueMissing(missingSubmitItems, "Personnel-in-charge");
  }
  if (!approvalComplete) {
    if (!selectedAdviserId) addUniqueMissing(missingSubmitItems, "Adviser");
    if (hasMissingChainOptions) {
      missingChainLabels.forEach((label) =>
        addUniqueMissing(missingSubmitItems, `Approver: ${label}`),
      );
    }
  }
  if (capacityWarning) {
    addUniqueMissing(missingSubmitItems, "Participant count within venue capacity");
  }
  if (programFlowAttachmentLimitExceeded) {
    addUniqueMissing(missingSubmitItems, "Program flow attachments under 25 MB");
  }
  const formProgressSteps = [
    {
      href: "#form-venues",
      label: "Venues",
      done: selectedVenueIds.length === 1,
    },
    { href: "#form-schedule", label: "Schedule", done: scheduleComplete },
    { href: "#form-details", label: "Details", done: true },
    {
      href: "#form-support",
      label: "Support",
      done: activeSelectedSupportValues.length > 0,
    },
    { href: "#form-approval", label: "Approval", done: approvalComplete },
  ];
  return (
    <form
      ref={formRef}
      key={formKey}
      onSubmit={handleSubmit}
      onInput={(event) => {
        updateNativeFormState(event.currentTarget);
      }}
      onChange={(event) => {
        updateNativeFormState(event.currentTarget);
      }}
      className="sapf-booking-form space-y-6"
    >
      {!initialRequest?.id && (
        <input type="hidden" name="submissionKey" value={submissionKey} />
      )}
      {initialRequest?.id && (
        <input type="hidden" name="requestId" value={initialRequest.id} />
      )}
      {selectedVenueIds.map((venueId) => (
        <input key={venueId} type="hidden" name="venueIds" value={venueId} />
      ))}
      {selectedAdviserId && (
        <input type="hidden" name="adviserId" value={selectedAdviserId} />
      )}
      {effectiveSelectedAdditionalSignatoryIds.map((userId) => (
        <input
          key={userId}
          type="hidden"
          name="additionalSignatoryIds"
          value={userId}
        />
      ))}

      <div className="sticky top-14 z-30 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur lg:top-4">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Reservation builder
            </p>
            <p className="text-xs text-muted-foreground">
              Move section by section. Draft keeps work safe. Submit sends this
              into approval flow.
            </p>
          </div>
          <p className="text-xs font-medium text-primary">
            {isEditing ? "Editing request" : "New request"}
          </p>
        </div>
        <nav
          aria-label="Booking form sections"
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
        >
          {formProgressSteps.map((step, index) => (
            <a
              key={step.href}
              href={step.href}
              className={`flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted ${
                step.done
                  ? "border-primary/30 bg-primary/5 text-foreground"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full border text-[10px]">
                  {index + 1}
                </span>
              )}
              {step.label}
            </a>
          ))}
        </nav>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-md border bg-background px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Request state
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {isSdsEditor
                ? "SDS editing active booking"
                : isEditing
                  ? "Officer revising existing request"
                  : "Officer preparing new request"}
            </p>
          </div>
          <div className="rounded-md border bg-background px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Submission readiness
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {selectedVenueIds.length === 1 ? selectedVenueSummary : "No venue"}.
              {" "}
              {scheduleRows.length} day{scheduleRows.length === 1 ? "" : "s"}.
              {" "}
              {activeSelectedSupportValues.length} support item
              {activeSelectedSupportValues.length === 1 ? "" : "s"}.
            </p>
          </div>
          <div className="rounded-md border bg-background px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Next workflow move
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {isSdsEditor
                ? "Save changes. Officer, passed reviewers get update."
                : "Adviser reviews first after submit."}
            </p>
          </div>
        </div>
      </div>

      <Card id="form-venues" className="scroll-mt-40">
        <CardHeader>
          <CardTitle>Venues</CardTitle>
          <CardDescription>
            Select one venue for this SAPF request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Popover open={venuePopoverOpen} onOpenChange={setVenuePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-11 w-full justify-between px-3 py-2 text-left font-normal"
              >
                <span className="truncate">{selectedVenueSummary}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(92vw,680px)] p-0">
              <div className="border-b p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={venueSearch}
                    onChange={(event) => setVenueSearch(event.target.value)}
                    placeholder="Search venues..."
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto p-2">
                {filteredVenues.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No venues found.
                  </p>
                ) : (
                  filteredVenues.map((venue) => {
                    const checked = selectedVenueIds.includes(venue.id);
                    return (
                      <div
                        key={venue.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={checked}
                        onClick={() => toggleVenue(venue.id, !checked)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleVenue(venue.id, !checked);
                          }
                        }}
                        className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <span
                          className={`mt-1 h-3 w-3 shrink-0 rounded-full border ${
                            checked
                              ? "border-primary bg-primary"
                              : "border-border bg-background"
                          }`}
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-foreground">
                            {venue.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {venue.location} - {venue.capacity} people
                          </span>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>

          {selectedVenues.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedVenues.map((venue) => (
                <Badge
                  key={venue.id}
                  variant="secondary"
                  className="gap-1 rounded-md py-1"
                >
                  {venue.name}
                  <button
                    type="button"
                    onClick={() => removeVenue(venue.id)}
                    className="rounded-sm opacity-70 hover:opacity-100"
                    aria-label={`Remove ${venue.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {initialRequest?.status === "RETURNED_FOR_REVISION" && !isSdsEditor ? (
        <Card id="revision-summary" className="scroll-mt-40 border-amber-500/40">
          <CardHeader>
            <CardTitle>Revision Comment<RequiredMark /></CardTitle>
            <CardDescription>
              Tell approver what changed before sending request back.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              name="revisionSummary"
              rows={4}
              placeholder="Example: Updated participant count and attached revised program flow."
              required
            />
          </CardContent>
        </Card>
      ) : null}

      <Card id="form-schedule" className="scroll-mt-40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Schedule
          </CardTitle>
          <CardDescription>
            Selected venue policy: book {bookingAdvanceLabel}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-900 dark:text-blue-100 md:col-span-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Selected venue can be booked {bookingAdvanceLabel}.
              Earliest available date: {earliestBookingDateLabel}.
            </p>
          </div>
          <div className="space-y-3">
            {scheduleRows.map((row, index) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <div>
                  <Label>Day {index + 1}</Label>
                  <Input
                    name="scheduleDate"
                    type="date"
                    value={row.date}
                    min={minimumBookingDate}
                    onChange={(event) =>
                      updateScheduleRow(row.id, "date", event.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input
                    name="scheduleStartTime"
                    type="time"
                    value={row.startTime}
                    onChange={(event) =>
                      updateScheduleRow(
                        row.id,
                        "startTime",
                        event.target.value,
                      )
                    }
                    required
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    name="scheduleEndTime"
                    type="time"
                    value={row.endTime}
                    min={row.startTime || undefined}
                    onChange={(event) =>
                      updateScheduleRow(row.id, "endTime", event.target.value)
                    }
                    required
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeScheduleRow(row.id)}
                    disabled={scheduleRows.length === 1}
                    aria-label={`Remove day ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={addScheduleRow}>
            <Plus className="mr-2 h-4 w-4" />
            Add Day
          </Button>
        </CardContent>
      </Card>

      <Card id="form-details" className="scroll-mt-40">
        <CardHeader>
          <CardTitle>Department Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Label>Department Category</Label>
          <Select
            name="departmentCategory"
            defaultValue={part1.departmentCategory || "College"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department category" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENT_CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="scroll-mt-40">
        <CardHeader>
          <CardTitle>Part 1: Activity Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Activity Title<RequiredMark /></Label>
            <Input
              name="activityTitle"
              required
              defaultValue={part1.activityTitle || ""}
            />
          </div>
          <div>
            <Label>Organization<RequiredMark /></Label>
            <Select
              name="organization"
              defaultValue={part1.organization || ""}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZATION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Department<RequiredMark /></Label>
            <Select
              name="department"
              defaultValue={part1.department || "CITE"}
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CITE">CITE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Program/Course<RequiredMark /></Label>
            <Select
              name="programCourse"
              defaultValue={part1.programCourse || ""}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select program/course" />
              </SelectTrigger>
              <SelectContent>
                {PROGRAM_COURSE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Modality<RequiredMark /></Label>
            <Select
              name="modality"
              defaultValue={part1.modality || "Face-to-face"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Face-to-face">Face-to-face</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Setting<RequiredMark /></Label>
            <Select
              name="setting"
              value={selectedSetting}
              onValueChange={setSelectedSetting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In-Campus">In-Campus</SelectItem>
                <SelectItem value="Off-Campus">Off-Campus</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedSetting === "Off-Campus" ? (
            <div className="md:col-span-2">
              <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                <div className="border-b bg-orange-50 px-4 py-3">
                  <p className="text-sm font-bold tracking-normal text-orange-600">
                    OFF-CAMPUS AGREEMENT{" "}
                    <span className="font-normal italic text-muted-foreground">
                      This section is only for off-campus activity.
                    </span>
                  </p>
                </div>
                <div className="grid md:grid-cols-[220px_1fr]">
                  <div className="border-b bg-muted/40 p-4 md:border-r md:border-b-0">
                    <p className="text-center text-sm text-foreground">
                      Kindly select if you understand the agreement.
                    </p>
                    <div className="mt-4 grid gap-2">
                      {["I Agree", "I Disagree"].map((value) => (
                        <label
                          key={value}
                          className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                        >
                          <input
                            type="radio"
                            name="offCampAgree"
                            value={value}
                            required
                            defaultChecked={part1.offCampAgree === value}
                            className="h-4 w-4 accent-primary"
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 text-sm leading-6 text-foreground">
                    We understand and acknowledge the importance of complying
                    with CHED CMO No. 63, s. 2017. We hereby commit to
                    submitting all required documents, including the Report of
                    Compliance, at least{" "}
                    <span className="font-semibold">30 days</span> prior to the
                    scheduled activity. Failure to meet this requirement may
                    result in the{" "}
                    <span className="font-semibold">
                      non-approval or cancellation
                    </span>{" "}
                    of the proposed activity. We accept full responsibility for
                    adhering to this policy.
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <div>
            <Label>Personnel-In-Charge<RequiredMark /></Label>
            {selectedPersonnel ? (
              <input
                type="hidden"
                name="personnelInCharge"
                value={userNameWithTitle(selectedPersonnel)}
              />
            ) : null}
            <Select
              value={selectedPersonnelId}
              onValueChange={(value) => {
                setSelectedPersonnelId(value);
                scheduleFormValidityUpdate();
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select adviser/dean or custom" />
              </SelectTrigger>
              <SelectContent>
                {adviserDeanPersonnelOptions.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {userNameWithTitle(user)}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_PERSONNEL_VALUE}>Other / Custom</SelectItem>
              </SelectContent>
            </Select>
            {selectedPersonnelId === CUSTOM_PERSONNEL_VALUE ? (
              <Input
                name="personnelInCharge"
                defaultValue={existingPersonnel}
                placeholder="Enter personnel in charge"
                className="mt-2"
                required
              />
            ) : null}
          </div>
          <div>
            <Label>Activity Type<RequiredMark /></Label>
            <Select
              name="activityType"
              defaultValue={part1.activityType || "Co-Curricular"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Co-Curricular">Co-Curricular</SelectItem>
                <SelectItem value="Extra-Curricular">
                  Extra-Curricular
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Attire<RequiredMark /></Label>
            <Input name="attire" defaultValue={part1.attire || ""} required />
          </div>
          <div>
            <Label>Scope<RequiredMark /></Label>
            <Select name="scope" defaultValue={part1.scope || "Organizational"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Organizational">Organizational</SelectItem>
                <SelectItem value="Institutional">Institutional</SelectItem>
                <SelectItem value="Regional">Regional</SelectItem>
                <SelectItem value="National">National</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>No. of Participants<RequiredMark /></Label>
            <Input
              name="noOfParticipants"
              type="number"
              min={1}
              max={selectedVenueCapacity || undefined}
              placeholder={
                selectedVenueCapacity
                  ? `Max ${selectedVenueCapacity}`
                  : "Select venue first"
              }
              required
              value={participantCount}
              onChange={(event) => updateParticipantCount(event.target.value)}
            />
            {capacityWarning ? (
              <p className="mt-1 text-xs text-destructive">{capacityWarning}</p>
            ) : selectedVenueCapacity ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Venue capacity: {selectedVenueCapacity}
              </p>
            ) : null}
          </div>
          <div>
            <Label>Program<RequiredMark /></Label>
            {selectedProgram !== "Others" ? (
              <input type="hidden" name="program" value={selectedProgram} />
            ) : null}
            <Select
              value={selectedProgram}
              onValueChange={(value) =>
                setSelectedProgram(value as (typeof PROGRAM_OPTIONS)[number])
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROGRAM_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProgram === "Others" ? (
              <div className="mt-3 border-t pt-3">
                <Label
                  htmlFor="program-other"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Other Program
                </Label>
                <Input
                  id="program-other"
                  name="program"
                  value={otherProgram}
                  onChange={(event) => setOtherProgram(event.target.value)}
                  placeholder="Enter program"
                  className="mt-2"
                  required
                />
              </div>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <Label>Rationale<RequiredMark /></Label>
            <Textarea
              name="rationale"
              rows={4}
              required
              defaultValue={part1.rationale || ""}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Objective/s<RequiredMark /></Label>
            <Textarea
              name="objectives"
              rows={4}
              required
              defaultValue={part1.objectives || ""}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Applicable Augustinian Core Values</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {CORE_VALUE_OPTIONS.map((value) => (
                <label
                  key={value}
                  className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    name="coreValues"
                    value={value}
                    defaultChecked={selectedCoreValues.has(value)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  {value}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Expected Graduate Attributes</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {GRADUATE_ATTRIBUTE_OPTIONS.map((value) => (
                <label
                  key={value}
                  className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    name="graduateAttributes"
                    value={value}
                    defaultChecked={selectedGraduateAttributes.has(value)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  {value}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Program Flow<RequiredMark /></Label>
            <Textarea
              name="programFlow"
              rows={3}
              required
              defaultValue={part1.programFlow || ""}
            />
            <div className="mt-3 rounded-md border bg-muted p-3">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Program Flow Attachments
              </Label>
              <Input
                type="file"
                name="programFlowAttachments"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  setProgramFlowAttachmentTotal(
                    files.reduce((sum, file) => sum + file.size, 0),
                  );
                  setProgramFlowAttachmentNames(
                    files.map(
                      (file) => `${file.name} (${formatFileSize(file.size)})`,
                    ),
                  );
                }}
                className="mt-2 bg-background"
              />
              <div
                className={`mt-1 text-xs ${
                  programFlowAttachmentLimitExceeded
                    ? "text-red-600"
                    : "text-muted-foreground"
                }`}
              >
                {formatFileSize(programFlowAttachmentTotal)} / 25 MB
              </div>
              {programFlowAttachmentNames.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {programFlowAttachmentNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              ) : part1.programFlowAttachments?.length ? (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {part1.programFlowAttachments.map((attachment: any) => (
                    <li key={attachment.id}>{attachment.fileName}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Emergency Plan<RequiredMark /></Label>
            <Textarea
              name="emergencyPlan"
              rows={4}
              placeholder="Emergency plan for the activity"
              required
              defaultValue={part1.emergencyPlan || ""}
            />
          </div>
          <div>
            <Label>Personal Budget<RequiredMark /></Label>
            <Input
              name="budget"
              inputMode="decimal"
              placeholder="00,000.00"
              defaultValue={part1.budget || ""}
              onBlur={(event) => {
                event.currentTarget.value = amountInput(event.currentTarget.value);
              }}
              required
            />
          </div>
          <div>
            <Label>Source of Budget<RequiredMark /></Label>
            <Input
              name="sourceOfBudget"
              defaultValue={part1.sourceOfBudget || ""}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card id="form-support" className="scroll-mt-40">
        <CardHeader>
          <CardTitle>Part 2: School Support</CardTitle>
          <CardDescription>
            Select only support actually needed. Budget request unlocks VP
            Finance signatory in approval chain.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
            {supportOptions.map((value) => {
              const detailField = supportDetailFields[value];
              const equipmentInfo = equipmentAvailabilityBySupport.get(value);
              const equipmentUnavailable =
                Boolean(equipmentInfo) &&
                (!equipmentInfo?.item.active || equipmentInfo.available <= 0);
              const checked = activeSelectedSupportValues.includes(value);
              const optionId = `support-${value
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")}`;

              return (
                <div
                  key={value}
                  className={`rounded-lg border bg-background p-3 text-sm shadow-sm transition-colors hover:bg-muted/50 ${
                    detailField && checked
                      ? "border-primary/40 bg-primary/5 md:col-span-2"
                      : ""
                  }`}
                >
                  <span className="flex items-center gap-3 font-medium text-foreground">
                    <input
                      id={optionId}
                      type="checkbox"
                      name="supportRequests"
                      value={value}
                      checked={checked}
                      disabled={equipmentUnavailable && !checked}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        toggleSupportRequest(value, event.target.checked)
                      }
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <label htmlFor={optionId} className="cursor-pointer">
                      {value}
                    </label>
                    {equipmentInfo && (
                      <span className="ml-auto rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-200">
                        {equipmentInfo.available} left
                      </span>
                    )}
                  </span>
                  {equipmentUnavailable && !checked ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Not available for selected schedule.
                    </p>
                  ) : null}
                  {detailField && checked ? (
                    <div className="mt-3 border-t pt-3">
                      {value === "Budget" ? (
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <Label
                              htmlFor="budgetRequestedAmount"
                              className="text-xs font-medium text-muted-foreground"
                            >
                              Requested Amount<RequiredMark />
                            </Label>
                            <Input
                              id="budgetRequestedAmount"
                              name="budgetRequestedAmount"
                              inputMode="decimal"
                              placeholder="00,000.00"
                              defaultValue={
                                part2.budgetRequestedAmount ||
                                parsedBudgetDetails.amount
                              }
                              onBlur={(event) => {
                                event.currentTarget.value = amountInput(
                                  event.currentTarget.value,
                                );
                              }}
                              className="mt-2"
                              required
                            />
                          </div>
                          <div>
                            <Label
                              htmlFor="budgetPurpose"
                              className="text-xs font-medium text-muted-foreground"
                            >
                              Purpose<RequiredMark />
                            </Label>
                            <Input
                              id="budgetPurpose"
                              name="budgetPurpose"
                              placeholder="Purpose of requested budget"
                              defaultValue={
                                part2.budgetPurpose || parsedBudgetDetails.purpose
                              }
                              className="mt-2"
                              required
                            />
                          </div>
                          <div>
                            <Label
                              htmlFor="budgetBreakdown"
                              className="text-xs font-medium text-muted-foreground"
                            >
                              Breakdown<RequiredMark />
                            </Label>
                            <Input
                              id="budgetBreakdown"
                              name="budgetBreakdown"
                              placeholder="Items / breakdown"
                              defaultValue={
                                part2.budgetBreakdown ||
                                parsedBudgetDetails.breakdown ||
                                part2.budgetDetails ||
                                ""
                              }
                              className="mt-2"
                              required
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <Label
                            htmlFor={detailField.name}
                            className="text-xs font-medium text-muted-foreground"
                          >
                            {detailField.label}
                          </Label>
                          {detailField.multiline ? (
                            <Textarea
                              id={detailField.name}
                              name={detailField.name}
                              placeholder={detailField.placeholder}
                              defaultValue={detailField.defaultValue}
                              className="mt-2 min-h-24 resize-y"
                            />
                          ) : (
                            <Input
                              id={detailField.name}
                              name={detailField.name}
                              type={equipmentInfo ? "number" : "text"}
                              min={equipmentInfo ? 1 : undefined}
                              max={equipmentInfo ? equipmentInfo.available : undefined}
                              placeholder={detailField.placeholder}
                              defaultValue={detailField.defaultValue}
                              className="mt-2"
                            />
                          )}
                        </>
                      )}
                      {equipmentInfo && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {equipmentInfo.available} available from{" "}
                          {equipmentInfo.item.totalQuantity} total.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="extraProvisions">
              Provision For Students With Diverse Needs
            </Label>
            <Textarea
              id="extraProvisions"
              name="extraProvisions"
              rows={3}
              placeholder="Enter provisions, accommodations, or accessibility needs."
              defaultValue={part2.extraProvisions || ""}
              className="mt-2"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="otherSupport">Other Support Requests</Label>
            <Input
              id="otherSupport"
              name="otherSupport"
              placeholder="Enter other support requests not listed above."
              defaultValue={part2.otherSupport || ""}
              className="mt-2"
            />
          </div>
          <div
            className={`md:col-span-2 rounded-lg border p-3 text-sm ${
              budgetSupportSelected
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
                : "border-border bg-muted/40 text-muted-foreground"
            }`}
          >
            <p className="font-semibold">
              {budgetSupportSelected
                ? "Budget selected"
                : "Budget not selected"}
            </p>
            <p className="mt-1">
              {budgetSupportSelected
                ? "VP Finance can now be added under additional signatories if finance review is needed."
                : "VP Finance stays hidden from additional signatories until budget support is requested."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="scroll-mt-40">
        <CardHeader>
          <CardTitle>Part 3: Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="otherDetails"
            rows={5}
            placeholder="Other details to be filled by the proposing organization"
            defaultValue={part3 || ""}
          />
        </CardContent>
      </Card>

      <Card id="form-approval" className="scroll-mt-40">
        <CardHeader>
          <CardTitle>Approval Chain</CardTitle>
          <CardDescription>
            Select adviser first. Optional signatories stay flexible. VP
            Finance appears only when budget support is requested.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasMissingChainOptions && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">Approval chain needs setup</p>
                <p>
                  Missing approvers: {missingChainLabels.join(", ")}. Ask a
                  super admin to assign these positions before submitting.
                </p>
              </div>
            </div>
          )}
          <div>
            <Label>Adviser</Label>
            <Popover
              open={adviserPopoverOpen}
              onOpenChange={setAdviserPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={lockApprovalChain || adviserOptions.length === 0}
                  className="mt-1 h-auto min-h-11 w-full justify-between px-3 py-2 text-left font-normal"
                >
                  <span className="truncate">{adviserSummary}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(92vw,560px)] p-0">
                <div className="border-b p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={adviserSearch}
                      onChange={(event) => setAdviserSearch(event.target.value)}
                      placeholder="Search advisers..."
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto p-2">
                  {filteredAdvisers.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                      No advisers found.
                    </p>
                  ) : (
                    filteredAdvisers.map((user) => {
                      const checked = selectedAdviserId === user.id;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => selectAdviser(user.id)}
                          className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          <span
                            className={`mt-1 h-3 w-3 shrink-0 rounded-full border ${
                              checked
                                ? "border-primary bg-primary"
                                : "border-border bg-background"
                            }`}
                          />
                          <span className="min-w-0">
                            <span className="block font-semibold text-foreground">
                              {userNameWithTitle(user)}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {selectedAdviser && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1 rounded-md py-1">
                  {userNameWithTitle(selectedAdviser)}
                </Badge>
              </div>
            )}
            {missingAdviserOptions && (
              <p className="mt-2 text-xs text-destructive">
                No active advisers are configured. Ask a super admin to assign
                an adviser before submitting.
              </p>
            )}
          </div>
          {additionalSignatoryOptions.length > 0 && (
            <div>
              <Label>Additional Signatories</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Always optional. Finance-specific signatory only appears when
                Part 2 includes Budget.
              </p>
              {budgetSupportSelected && financeSignatoryOptions.length > 0 && (
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  VP Finance auto-recommended. You can uncheck anytime.
                </p>
              )}
              <Popover
                open={signatoryPopoverOpen}
                onOpenChange={setSignatoryPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={lockApprovalChain}
                    className="mt-1 h-auto min-h-11 w-full justify-between px-3 py-2 text-left font-normal"
                  >
                    <span className="truncate">{signatorySummary}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[min(92vw,620px)] p-0"
                >
                  <div className="border-b p-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={signatorySearch}
                        onChange={(event) =>
                          setSignatorySearch(event.target.value)
                        }
                        placeholder="Search signatories..."
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2">
                    {filteredAdditionalSignatories.length === 0 ? (
                      <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No signatories found.
                      </p>
                    ) : (
                      filteredAdditionalSignatories.map((user) => {
                        const checked = selectedAdditionalSignatoryIds.includes(
                          user.id,
                        );
                        return (
                          <div
                            key={user.id}
                            role="button"
                            tabIndex={0}
                            aria-pressed={checked}
                            onClick={() =>
                              toggleAdditionalSignatory(user.id, !checked)
                            }
                            onKeyDown={(event) => {
                              if (
                                event.key === "Enter" ||
                                event.key === " "
                              ) {
                                event.preventDefault();
                                toggleAdditionalSignatory(user.id, !checked);
                              }
                            }}
                            className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          >
                            <Checkbox checked={checked} className="mt-0.5" />
                            <span className="min-w-0">
                              <span className="block font-semibold text-foreground">
                                {userNameWithTitle(user)}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {user.email}
                              </span>
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {!budgetSupportSelected && financeSignatoryOptions.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Add Budget under Part 2 if you need VP Finance in this chain.
                </p>
              )}

              {selectedAdditionalSignatories.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedAdditionalSignatories.map((user) => (
                    <Badge
                      key={user.id}
                      variant="secondary"
                      className="gap-1 rounded-md py-1"
                    >
                      {userNameWithTitle(user)}
                      {!lockApprovalChain && (
                        <button
                          type="button"
                          onClick={() => removeAdditionalSignatory(user.id)}
                          className="rounded-sm opacity-70 hover:opacity-100"
                          aria-label={`Remove ${user.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-30 flex flex-col gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-end">
        <div className="space-y-2 text-xs sm:mr-auto">
          <p className="text-muted-foreground">
            {isSdsEditor
              ? "Save updates carefully. Changes are reflected on the active request."
              : submitReady
                ? "Ready to submit. All required fields passed."
                : "Complete all required fields marked with red asterisk before submitting."}
          </p>
          {!isSdsEditor && !submitReady && missingSubmitItems.length > 0 ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-destructive">
              <p className="font-semibold">Missing before submit:</p>
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {missingSubmitItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        {!isSdsEditor && (
          <Button
            type="submit"
            name="intent"
            value="draft"
            variant="outline"
            disabled={Boolean(savingIntent)}
          >
            {savingIntent === "draft" ? (
              <ButtonSpinner />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {savingIntent === "draft" ? "Saving..." : "Save Draft"}
          </Button>
        )}
        <Button
          type="submit"
          name="intent"
          value={isSdsEditor ? "save" : "submit"}
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={Boolean(savingIntent) || (!isSdsEditor && !submitReady)}
        >
          {savingIntent === (isSdsEditor ? "save" : "submit") ? (
            <ButtonSpinner />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {savingIntent === (isSdsEditor ? "save" : "submit")
            ? "Saving..."
            : isSdsEditor
              ? "Save Booking Changes"
              : "Submit Reservation"}
        </Button>
      </div>
    </form>
  );
}
