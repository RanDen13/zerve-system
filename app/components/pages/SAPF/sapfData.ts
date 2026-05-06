export const CORE_VALUE_OPTIONS = [
  "Courage",
  "Compassion",
  "Community-Oriented",
  "Humility",
  "Interiority",
  "Missionary Spirit",
];

export const GRADUATE_ATTRIBUTE_OPTIONS = [
  "EGA 1: Critical and Creative Thinker",
  "EGA 2: Competent Catholic Augustinian-Marian Professional",
  "EGA 3: Socially Responsive Steward",
  "EGA 4: Transformative Lifelong Learner",
];

export const DEPARTMENT_CATEGORY_OPTIONS = [
  "College",
  "Alternative Education",
  "Graduate Studies",
  "Extensions Office",
  "COM",
];

export const SUPPORT_REQUEST_OPTIONS = [
  "Budget",
  "Vehicle",
  "Food/Snacks",
  "Room/Venue",
  "Sound System",
  "Microphone",
  "LCD Projector",
  "One Long Table",
];

function valuesFromRows(rows: any[] | undefined) {
  return (rows || [])
    .map((row) => (typeof row === "string" ? row : row?.value))
    .filter(Boolean);
}

function hasAnyValue(value: Record<string, any>) {
  return Object.values(value).some((item) => {
    if (Array.isArray(item)) return item.length > 0;
    if (item === null || item === undefined) return false;
    if (typeof item === "string") return item.trim() !== "";
    return true;
  });
}

function nullableBoolean(value: any) {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined || value === "") return null;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "yes", "1", "y"].includes(normalized)) return true;
  if (
    [
      "false",
      "no",
      "0",
      "n",
      "none",
      "not applicable",
      "n/a",
      "na",
      "-",
    ].includes(normalized)
  ) {
    return false;
  }
  if (normalized.includes("yes")) return true;
  if (normalized.includes("not") || normalized.includes("none")) return false;

  return null;
}

function attachmentRows(rows: any[] | undefined) {
  return (rows || [])
    .map((row) => ({
      id: row?.id || "",
      fileName: row?.fileName || row?.name || "Attachment",
      mimeType: row?.mimeType || row?.type || "application/octet-stream",
      size: Number(row?.size || 0),
      purpose: row?.purpose || "SDS_CLEARANCE",
      createdAt: row?.createdAt,
    }))
    .filter((row) => row.id && row.fileName);
}

function venueNames(request: any) {
  const joined = (request.venues || [])
    .map((item: any) => item?.eventSpace?.name || item?.name)
    .filter(Boolean);

  return joined.length ? joined.join(", ") : request.venue || "";
}

function scheduleRows(request: any) {
  return Array.isArray(request.schedules) ? request.schedules : [];
}

export function getSapfParts(request: any) {
  const coreValues = valuesFromRows(request.coreValues);
  const graduateAttributes = valuesFromRows(request.graduateAttributes);
  const supportRequests = valuesFromRows(request.supportRequests);
  const attachments = attachmentRows(request.attachments);
  const programFlowAttachments = attachments.filter(
    (attachment) => attachment.purpose === "PROGRAM_FLOW",
  );
  const sdsAttachments = attachments.filter(
    (attachment) => attachment.purpose !== "PROGRAM_FLOW",
  );
  const schedules = scheduleRows(request);

  const part1 = {
    activityTitle: request.title || "",
    organization: request.organization || "",
    activityDate: schedules[0]?.startAt || "",
    schedules,
    departmentCategory: request.departmentCategory || "",
    modality: request.modality || "",
    programCourse: request.programCourse || "",
    venue: venueNames(request),
    department: request.department || "",
    setting: request.setting || "",
    offCampAgree: request.offCampAgree || "",
    personnelInCharge: request.personnelInCharge || "",
    activityType: request.activityType || "",
    attire: request.attire || "",
    scope: request.scope || "",
    noOfParticipants: request.attendeeCount || "",
    program: request.program || "",
    rationale: request.rationale || "",
    objectives: request.objectives || "",
    coreValues,
    graduateAttributes,
    programFlow: request.programFlow || "",
    programFlowAttachments,
    emergencyPlan: request.emergencyPlan || "",
    budget: request.budget || "",
    sourceOfBudget: request.sourceOfBudget || "",
  };

  const part2 = {
    supportRequests,
    budgetDetails: request.budgetDetails || "",
    vehiclePassengers: request.vehiclePassengers || "",
    foodPax: request.foodPax || "",
    roomVenueDetails: request.roomVenueDetails || "",
    microphoneQty: request.microphoneQty || "",
    extraProvisions: request.extraProvisions || "",
    otherSupport: request.otherSupport || "",
  };

  const hasAttachments =
    nullableBoolean(request.hasAttachments) ??
    (sdsAttachments.length ? true : null);
  const academicInterruptionRemarks =
    request.academicInterruptionRemarks || request.academicRemarks || "";

  const part4 = {
    parentsConsent: nullableBoolean(request.parentsConsent),
    hasAttachments,
    attachments: sdsAttachments,
    attachmentsForDocument: "-",
    academicInterruption: nullableBoolean(request.academicInterruption),
    academicInterruptionRemarks,
    academicRemarks: academicInterruptionRemarks,
    medicalExam: nullableBoolean(request.medicalExam),
    reportOfCompliance: nullableBoolean(request.reportOfCompliance),
    studentPersonnelRatio: request.studentPersonnelRatio || "",
  };

  const part6 = {
    conductedRemarks: request.conductedRemarks || "",
    cancelledRemarks: request.cancelledRemarks || "",
  };

  return {
    part1,
    part2,
    part3: request.otherDetails || "",
    part4: hasAnyValue(part4) ? part4 : null,
    part6: hasAnyValue(part6) ? part6 : null,
  };
}

export function normalizeSapfRequest<T extends Record<string, any>>(
  request: T,
) {
  const sapf = getSapfParts(request);

  return {
    ...request,
    sapf,
    sapfPart1: sapf.part1,
    sapfPart2: sapf.part2,
    sapfPart3: sapf.part3,
    sapfPart4: sapf.part4,
    sapfPart6: sapf.part6,
  };
}
