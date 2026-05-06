import { getSapfParts } from "@/app/components/pages/SAPF/sapfData";
import {
  formatSapfDateForMessage,
  formatSapfTime,
  sapfCalendarDate,
} from "@/app/components/pages/SAPF/sapfSchedule";
import { format } from "date-fns";
import { readFile } from "fs/promises";
import path from "path";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "public",
  "templates",
  "student-activity-proposal-form-v2.docx",
);
const APPROVED_IMAGE_PATH = path.join(process.cwd(), "public", "approved.png");
const APPROVED_IMAGE_TOKEN = "__approved_stamp__";
const BLANK_IMAGE_TOKEN = "__blank_stamp__";
const APPROVAL_STAMP_SIZE: [number, number] = [96, 22];
const BLANK_IMAGE_SIZE: [number, number] = [1, 1];
const EMUS_PER_PIXEL = 9525;
const APPROVAL_STAMP_VERTICAL_OFFSET = -18 * EMUS_PER_PIXEL;
const BLANK_IMAGE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAANSURBVBhXY/j///9/AAn7A/0FQ0XKAAAAAElFTkSuQmCC",
  "base64",
);

type SapfDocxDependencies = {
  Docxtemplater: any;
  ImageModule: any;
  PizZip: any;
};

type SapfDocxAssets = {
  template: Buffer;
  approvedImage: Buffer;
};

let dependenciesPromise: Promise<SapfDocxDependencies> | undefined;
let assetsPromise: Promise<SapfDocxAssets> | undefined;

function moduleDefault<T>(module: T): T {
  return (module as any).default || module;
}

function loadSapfDocxDependencies() {
  dependenciesPromise ??= Promise.all([
    import("docxtemplater"),
    import("docxtemplater-image-module-free"),
    import("pizzip"),
  ]).then(([docxtemplater, imageModule, pizzip]) => ({
    Docxtemplater: moduleDefault(docxtemplater),
    ImageModule: moduleDefault(imageModule),
    PizZip: moduleDefault(pizzip),
  }));

  return dependenciesPromise;
}

function loadSapfDocxAssets() {
  assetsPromise ??= Promise.all([
    readFile(TEMPLATE_PATH),
    readFile(APPROVED_IMAGE_PATH),
  ]).then(([template, approvedImage]) => ({ template, approvedImage }));

  return assetsPromise;
}

function asDate(value: any) {
  return value instanceof Date ? value : new Date(value);
}

function short(value: any) {
  return value === null || value === undefined ? "" : String(value);
}

function textField(value: any) {
  const text = short(value).trim();
  return text || "N/A";
}

function marker(value: boolean) {
  return value ? "X" : "  ";
}

function same(value: any, option: string) {
  return short(value).toLowerCase() === option.toLowerCase();
}

function includes(values: string[], option: string) {
  const normalized = option.toLowerCase();
  return values.some((value) => value.toLowerCase() === normalized);
}

function contains(value: any, option: string) {
  return short(value).toLowerCase().includes(option.toLowerCase());
}

function positive(value: any) {
  if (typeof value === "boolean") return value;
  return contains(value, "yes") || same(value, "true") || same(value, "1");
}

function negative(value: any) {
  if (typeof value === "boolean") return !value;
  return (
    contains(value, "not") ||
    contains(value, "none") ||
    same(value, "no") ||
    same(value, "false") ||
    same(value, "0")
  );
}

function schoolYear(date: Date) {
  const campusDate = sapfCalendarDate(date);
  const year = campusDate.getFullYear();
  const startYear = campusDate.getMonth() >= 5 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function scheduleText(request: any) {
  const schedules = Array.isArray(request.schedules) ? request.schedules : [];
  return schedules
    .map(
      (schedule: any) =>
        `${formatSapfDateForMessage(schedule.startAt)} ${formatSapfTime(
          schedule.startAt,
        )} - ${formatSapfTime(schedule.endAt)}`,
    )
    .join("\n");
}

function firstScheduleStart(request: any) {
  const schedules = Array.isArray(request.schedules) ? request.schedules : [];
  return schedules[0]?.startAt ? asDate(schedules[0].startAt) : new Date();
}

function programIncludes(program: string, ...matches: string[]) {
  const normalized = program.toLowerCase();
  return matches.some((match) => normalized.includes(match.toLowerCase()));
}

function stepName(request: any, position: string) {
  return (
    request.approvalSteps?.find((step: any) => step.position === position)
      ?.reviewer?.name || ""
  );
}

function stepApproved(request: any, position: string) {
  return (request.approvalSteps || []).some(
    (step: any) => step.position === position && step.status === "APPROVED",
  );
}

function stepTitle(request: any, position: string) {
  const reviewer = request.approvalSteps?.find(
    (step: any) => step.position === position,
  )?.reviewer;
  const credentialAccount = reviewer?.accounts?.[0];
  return credentialAccount?.title || "";
}

function approvalImageToken(approved: boolean) {
  return approved ? APPROVED_IMAGE_TOKEN : BLANK_IMAGE_TOKEN;
}

function humanizeAction(value: any) {
  return short(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseLogMetadata(metadata: any) {
  if (!metadata) return {};
  if (typeof metadata === "object") return metadata;

  try {
    return JSON.parse(String(metadata));
  } catch {
    return {};
  }
}

function docxHistoryRows(request: any) {
  const logs = Array.isArray(request.activityLogs)
    ? request.activityLogs.filter((log: any) => {
        const metadata = parseLogMetadata(log.metadata);
        const hasChanges =
          Array.isArray(metadata.changes) && metadata.changes.length > 0;
        return !(
          hasChanges &&
          ["SUBMITTED", "RESUBMITTED"].includes(String(log.action))
        );
      })
    : [];

  if (logs.length > 0) {
    return logs.map((log: any) => {
      const metadata = parseLogMetadata(log.metadata);
      const changes = Array.isArray(metadata.changes) ? metadata.changes : [];
      const comment = [log.description, metadata.reason]
        .map(short)
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .join("\n");

      return {
        historyDate: log.createdAt
          ? format(asDate(log.createdAt), "MMM d, yyyy h:mm a")
          : "",
        historyAction: log.title || humanizeAction(log.action),
        historyActor: log.actor?.name || "System",
        historyComment: comment,
        changes: changes.map((change: any) => ({
          field: change.label || humanizeAction(change.field),
          before: short(change.before),
          after: short(change.after),
        })),
      };
    });
  }

  const actions = Array.isArray(request.approvalActions)
    ? request.approvalActions
    : [];

  return actions.map((action: any) => ({
    historyDate: action.createdAt
      ? format(asDate(action.createdAt), "MMM d, yyyy h:mm a")
      : "",
    historyAction: humanizeAction(action.action),
    historyActor: action.actor?.name || "System",
    historyComment: action.comment || "",
    changes: [],
  }));
}

function approvalStampXml(rId: number, size: [number, number]) {
  const [width, height] = size;

  return (
    `<w:drawing>` +
    `<wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">` +
    `<wp:simplePos x="0" y="0"/>` +
    `<wp:positionH relativeFrom="column"><wp:align>center</wp:align></wp:positionH>` +
    `<wp:positionV relativeFrom="paragraph"><wp:posOffset>${APPROVAL_STAMP_VERTICAL_OFFSET}</wp:posOffset></wp:positionV>` +
    `<wp:extent cx="${width}" cy="${height}"/>` +
    `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:wrapNone/>` +
    `<wp:docPr id="${rId + 1000}" name="Approval Stamp" descr="approval stamp"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="${rId + 1000}" name="Approval Stamp" descr="approval stamp"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="rId${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></pic:spPr>` +
    `</pic:pic>` +
    `</a:graphicData>` +
    `</a:graphic>` +
    `</wp:anchor>` +
    `</w:drawing>`
  );
}

export async function renderSapfDocx({ request }: { request: any }) {
  const [{ Docxtemplater, ImageModule, PizZip }, { template, approvedImage }] =
    await Promise.all([loadSapfDocxDependencies(), loadSapfDocxAssets()]);
  const zip = new PizZip(template);
  const imageModule = new ImageModule({
    centered: false,
    fileType: "docx",
    getImage(tagValue: unknown) {
      if (tagValue === BLANK_IMAGE_TOKEN) {
        return BLANK_IMAGE;
      }

      if (tagValue !== APPROVED_IMAGE_TOKEN) {
        throw new Error(`Unknown SAPF approval image token: ${tagValue}`);
      }

      return approvedImage;
    },
    getSize(_image: Buffer | Uint8Array, tagValue: unknown) {
      if (tagValue === BLANK_IMAGE_TOKEN) {
        return BLANK_IMAGE_SIZE;
      }

      return APPROVAL_STAMP_SIZE;
    },
  });
  imageModule.getRenderedPartDocx = approvalStampXml;
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    modules: [imageModule],
  });

  const sapf = request.sapf || getSapfParts(request);
  const part1 = sapf.part1;
  const part2 = sapf.part2;
  const part4 = sapf.part4 || {};
  const part6 = sapf.part6 || {};
  const startAt = firstScheduleStart(request);
  const createdAt = request.createdAt ? asDate(request.createdAt) : new Date();
  const program = short(part1.program);
  const hasKnownProgram = [
    programIncludes(program, "team building"),
    programIncludes(program, "leadership summit"),
    programIncludes(program, "general assembly"),
    programIncludes(program, "competition"),
    programIncludes(program, "press conference"),
    programIncludes(program, "seminar", "convention"),
  ].some(Boolean);
  const departmentCategory = short(
    part1.departmentCategory || part1.department,
  ).toLowerCase();
  const additionalSignatoryName = (request.approvalSteps || [])
    .filter((step: any) => step.position === "ADDITIONAL_SIGNATORY")
    .map((step: any) => step.reviewer?.name)
    .filter(Boolean)
    .join(" / ");
  const additionalSignatories = (request.approvalSteps || [])
    .filter((step: any) => step.position === "ADDITIONAL_SIGNATORY")
    .map((step: any) => {
      const reviewer = step.reviewer || {};
      const credentialAccount = reviewer.accounts?.[0];
      const name = reviewer.name || "";
      const title = credentialAccount?.title || "";
      return {
        name,
        title,
        signatoryApproval: approvalImageToken(step.status === "APPROVED"),
        signatoryName: name,
        signatoryTitle: title,
      };
    })
    .filter((entry: any) => entry.name || entry.title);
  const deanName = stepName(request, "DEAN");
  const adviserName = stepName(request, "ADVISER");

  const data = {
    year: schoolYear(startAt),
    schoolYear: schoolYear(startAt),
    proposalDate: format(createdAt, "MMMM d, yyyy"),
    activityTitle: textField(part1.activityTitle),
    organization: textField(part1.organization),
    activityTime: textField(scheduleText(request)),
    activityDate: textField(scheduleText(request)),
    programCourse: textField(part1.programCourse),
    venue: textField(part1.venue),
    departmentCategory: textField(part1.departmentCategory),
    department: textField(part1.department),
    personnelInCharge: textField(part1.personnelInCharge),
    attire: textField(part1.attire),
    noOfParticipants: textField(part1.noOfParticipants),
    rationale: textField(part1.rationale),
    objectives: textField(part1.objectives),
    programFlow: textField(part1.programFlow),
    emergencyPlan: textField(part1.emergencyPlan),
    budget: textField(part1.budget),
    sourceOfBudget: textField(part1.sourceOfBudget),
    otherDetails: textField(sapf.part3),
    otherDetailsText: textField(sapf.part3),

    departmentCollege: marker(
      !["alternative", "graduate", "extension", "com"].some((value) =>
        departmentCategory.includes(value),
      ),
    ),
    departmentAltEd: marker(departmentCategory.includes("alternative")),
    departmentGraduate: marker(departmentCategory.includes("graduate")),
    departmentExtensions: marker(departmentCategory.includes("extension")),
    departmentCom: marker(departmentCategory.includes("com")),

    modalityFaceToFace: marker(same(part1.modality, "Face-to-face")),
    modalityOnline: marker(same(part1.modality, "Online")),
    modalityHybrid: marker(same(part1.modality, "Hybrid")),
    settingInCampus: marker(same(part1.setting, "In-Campus")),
    settingOffCampus: marker(same(part1.setting, "Off-Campus")),
    offCampAgree: same(part1.setting, "Off-Campus")
      ? textField(part1.offCampAgree)
      : "",
    activityTypeCoCurricular: marker(same(part1.activityType, "Co-Curricular")),
    activityTypeExtraCurricular: marker(
      same(part1.activityType, "Extra-Curricular"),
    ),
    scopeOrganizational: marker(same(part1.scope, "Organizational")),
    scopeInstitutional: marker(same(part1.scope, "Institutional")),
    scopeRegional: marker(same(part1.scope, "Regional")),
    scopeNational: marker(same(part1.scope, "National")),

    programTeamBuilding: marker(programIncludes(program, "team building")),
    programLeadershipSummit: marker(
      programIncludes(program, "leadership summit"),
    ),
    programGeneralAssembly: marker(
      programIncludes(program, "general assembly"),
    ),
    programCompetition: marker(programIncludes(program, "competition")),
    programPressConference: marker(
      programIncludes(program, "press conference"),
    ),
    programSeminarConvention: marker(
      programIncludes(program, "seminar", "convention"),
    ),
    programOther: hasKnownProgram ? "" : textField(program),

    coreCourage: marker(includes(part1.coreValues, "Courage")),
    coreCompassion: marker(includes(part1.coreValues, "Compassion")),
    coreCommunityOriented: marker(
      includes(part1.coreValues, "Community-Oriented"),
    ),
    coreHumility: marker(includes(part1.coreValues, "Humility")),
    coreInteriority: marker(includes(part1.coreValues, "Interiority")),
    coreMissionarySpirit: marker(
      includes(part1.coreValues, "Missionary Spirit"),
    ),

    egaCriticalCreative: marker(
      includes(
        part1.graduateAttributes,
        "EGA 1: Critical and Creative Thinker",
      ),
    ),
    egaCatholicProfessional: marker(
      includes(
        part1.graduateAttributes,
        "EGA 2: Competent Catholic Augustinian-Marian Professional",
      ),
    ),
    egaResponsiveSteward: marker(
      includes(part1.graduateAttributes, "EGA 3: Socially Responsive Steward"),
    ),
    egaLifelongLearner: marker(
      includes(
        part1.graduateAttributes,
        "EGA 4: Transformative Lifelong Learner",
      ),
    ),

    supportBudget: marker(includes(part2.supportRequests, "Budget")),
    budgetDetails: textField(part2.budgetDetails),
    supportVehicle: marker(includes(part2.supportRequests, "Vehicle")),
    vehiclePassengers: textField(part2.vehiclePassengers),
    supportFoodSnacks: marker(includes(part2.supportRequests, "Food/Snacks")),
    foodPax: textField(part2.foodPax),
    supportRoomVenue: marker(includes(part2.supportRequests, "Room/Venue")),
    roomVenueDetails: textField(part2.roomVenueDetails),
    supportSoundSystem: marker(includes(part2.supportRequests, "Sound System")),
    supportMicrophone: marker(includes(part2.supportRequests, "Microphone")),
    microphoneQty: textField(part2.microphoneQty),
    supportLcdProjector: marker(
      includes(part2.supportRequests, "LCD Projector"),
    ),
    supportLongTable: marker(includes(part2.supportRequests, "One Long Table")),
    extraProvisions: textField(part2.extraProvisions),
    otherSupport: textField(part2.otherSupport),

    parentsConsentYes: marker(positive(part4.parentsConsent)),
    parentsConsentNotApplicable: marker(negative(part4.parentsConsent)),
    attachments: part4.attachmentsForDocument || "-",
    academicInterruptionYes: marker(positive(part4.academicInterruption)),
    academicInterruptionNone: marker(negative(part4.academicInterruption)),
    academicRemarks: textField(
      part4.academicInterruptionRemarks || part4.academicRemarks,
    ),
    medicalExamYes: marker(positive(part4.medicalExam)),
    medicalExamNotApplicable: marker(negative(part4.medicalExam)),
    reportComplianceYes: marker(positive(part4.reportOfCompliance)),
    reportComplianceNotApplicable: marker(negative(part4.reportOfCompliance)),
    studentPersonnelRatio: textField(part4.studentPersonnelRatio),
    conductedRemarks: textField(part6.conductedRemarks),
    cancelledRemarks: textField(part6.cancelledRemarks),
    history: docxHistoryRows(request),

    preparedBy: request.officer?.name || "",
    adviserApproval: approvalImageToken(stepApproved(request, "ADVISER")),
    adviserName,
    sdsApproval: approvalImageToken(stepApproved(request, "SDS")),
    sdsName: stepName(request, "SDS"),
    deanApproval: approvalImageToken(stepApproved(request, "DEAN")),
    deanName,
    deanTitle: stepTitle(request, "DEAN"),
    sasApproval: approvalImageToken(stepApproved(request, "SAS")),
    sasName: stepName(request, "SAS"),
    additionalSignatoryName,
    additionalSignatories,
    additionalAssignatories: additionalSignatories,
    vpaaAsstApproval: approvalImageToken(
      stepApproved(request, "VPAA_ASSISTANT"),
    ),
    vpaaAsst: stepName(request, "VPAA_ASSISTANT"),
    vpaaApproval: approvalImageToken(stepApproved(request, "VPAA")),
    vpaaAprroval: approvalImageToken(stepApproved(request, "VPAA")),
    vpaaName: stepName(request, "VPAA"),
    presidentApproval: approvalImageToken(
      stepApproved(request, "UNIVERSITY_PRESIDENT"),
    ),
    presidentName: stepName(request, "UNIVERSITY_PRESIDENT"),
  };

  await doc.renderAsync(data);

  return doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}
