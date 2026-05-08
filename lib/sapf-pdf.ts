import { execFile } from "child_process";
import {
  access,
  constants,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "fs/promises";
import { createRequire } from "module";
import { tmpdir } from "os";
import path from "path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import QRCode from "qrcode";
import { promisify } from "util";
import { renderSapfDocx } from "./sapf-docx";

type PdfMode = "preview" | "approved";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

async function pathExists(filePath: string) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function requirePdfOutput(pdfPath: string, context: string) {
  if (await pathExists(pdfPath)) return;

  const dirEntries = await readdir(path.dirname(pdfPath)).catch(() => []);
  throw new Error(
    `${context} did not create ${path.basename(pdfPath)}. Temp files: ${
      dirEntries.length ? dirEntries.join(", ") : "(none)"
    }`,
  );
}

async function resolveConverterScript(scriptName: string) {
  const candidates = [
    path.join(process.cwd(), "node_modules", "docx2pdf-converter", scriptName),
  ];

  try {
    const packageJsonPath = require.resolve("docx2pdf-converter/package.json");
    candidates.push(path.join(path.dirname(packageJsonPath), scriptName));
  } catch {
    // Fallback to project node_modules only.
  }

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }

  return candidates[0];
}

async function runWordDocxToPdf(docxPath: string, pdfPath: string) {
  const script = `
$ErrorActionPreference = "Stop"
$inputPath = $args[0]
$outputPath = $args[1]
$word = $null
$doc = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open($inputPath, $false, $true)
  $doc.ExportAsFixedFormat($outputPath, 17)
} finally {
  if ($doc -ne $null) {
    try { $doc.Close($false) | Out-Null } catch {}
    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null } catch {}
  }
  if ($word -ne $null) {
    try { $word.Quit() | Out-Null } catch {}
    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null } catch {}
  }
}
`;

  const { stdout, stderr } = await execFileAsync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script,
      docxPath,
      pdfPath,
    ],
    { windowsHide: true },
  );
  await requirePdfOutput(
    pdfPath,
    `Microsoft Word DOCX-to-PDF conversion${
      stdout || stderr ? ` (${[stdout, stderr].filter(Boolean).join(" ")})` : ""
    }`,
  );
}

async function runLibreOfficeDocxToPdf(docxPath: string, pdfPath: string) {
  const outputDir = path.dirname(pdfPath);
  const sofficePath = await resolveLibreOfficeExecutable();
  const expectedPdfPath = path.join(
    outputDir,
    `${path.basename(docxPath, path.extname(docxPath))}.pdf`,
  );
  const { stdout, stderr } = await execFileAsync(sofficePath, [
    "--headless",
    "--convert-to",
    "pdf",
    "--outdir",
    outputDir,
    docxPath,
  ]);

  if (expectedPdfPath !== pdfPath && (await pathExists(expectedPdfPath))) {
    await writeFile(pdfPath, await readFile(expectedPdfPath));
  }

  await requirePdfOutput(
    pdfPath,
    `LibreOffice DOCX-to-PDF conversion${
      stdout || stderr ? ` (${[stdout, stderr].filter(Boolean).join(" ")})` : ""
    }`,
  );
}

async function resolveLibreOfficeExecutable() {
  const candidates =
    process.platform === "win32"
      ? [
          process.env.LIBREOFFICE_PATH,
          "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
          "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
          "soffice",
        ]
      : [process.env.LIBREOFFICE_PATH, "soffice"];

  for (const candidate of candidates.filter(Boolean) as string[]) {
    if (path.isAbsolute(candidate)) {
      if (await pathExists(candidate)) return candidate;
      continue;
    }

    return candidate;
  }

  return "soffice";
}

async function runDocxToPdf(docxPath: string, pdfPath: string) {
  if (process.platform === "win32") {
    try {
      await runWordDocxToPdf(docxPath, pdfPath);
      return;
    } catch (wordError) {
      try {
        await runLibreOfficeDocxToPdf(docxPath, pdfPath);
        return;
      } catch (libreOfficeError) {
        throw new Error(
          `Failed with Microsoft Word and LibreOffice converters. Word: ${
            (wordError as Error).message
          } LibreOffice: ${(libreOfficeError as Error).message}`,
          { cause: libreOfficeError },
        );
      }
    }
  }

  if (process.platform === "darwin") {
    const scriptPath = await resolveConverterScript("convert.sh");
    await access(scriptPath);
    await execFileAsync("sh", [scriptPath, docxPath, pdfPath, "false"]);
    await requirePdfOutput(pdfPath, "docx2pdf-converter shell script");
    return;
  }

  if (process.platform === "linux") {
    try {
      await runLibreOfficeDocxToPdf(docxPath, pdfPath);
    } catch {
      await execFileAsync("unoconv", ["-f", "pdf", "-o", pdfPath, docxPath]);
      await requirePdfOutput(pdfPath, "unoconv DOCX-to-PDF conversion");
    }
    return;
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

function wrapText(text: string, maxChars: number) {
  const words = String(text || "")
    .split(/\s+/)
    .filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = `${current} ${word}`.trim();
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function cleanPdfText(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\n\r\t]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseStatus(value: unknown) {
  const text = cleanPdfText(value || "Not set").replace(/_/g, " ");
  return text
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function formatSchedule(row: any) {
  const start = formatDateTime(row?.startAt);
  const end = formatDateTime(row?.endAt);
  if (start && end) return `${start} to ${end}`;
  return start || end || "Schedule not set";
}

function displayUser(user: any) {
  return cleanPdfText(
    user?.name || user?.email || user?.username || user?.id || "Unassigned",
  );
}

function listText(values: unknown) {
  if (!Array.isArray(values)) return cleanPdfText(values);
  return values.map(cleanPdfText).filter(Boolean).join(", ");
}

type DrawState = {
  pdf: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  y: number;
};

const pageSize: [number, number] = [612, 792];
const marginX = 48;
const contentWidth = 516;

function addPage(state: DrawState) {
  state.page = state.pdf.addPage(pageSize);
  state.y = 744;
}

function ensureSpace(state: DrawState, needed = 32) {
  if (state.y < 48 + needed) addPage(state);
}

function widthWrap(text: unknown, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = cleanPdfText(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const lines: string[] = [];

  for (const paragraph of paragraphs.length ? paragraphs : ["-"]) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = `${current} ${word}`.trim();
      if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

function drawWrapped(
  state: DrawState,
  text: unknown,
  options: {
    x?: number;
    size?: number;
    font?: PDFFont;
    color?: ReturnType<typeof rgb>;
    width?: number;
    lineGap?: number;
  } = {},
) {
  const size = options.size || 10;
  const font = options.font || state.regular;
  const x = options.x || marginX;
  const lineGap = options.lineGap || 14;
  const lines = widthWrap(text, font, size, options.width || contentWidth);

  for (const line of lines) {
    ensureSpace(state, lineGap);
    state.page.drawText(line, {
      x,
      y: state.y,
      size,
      font,
      color: options.color || rgb(0.12, 0.14, 0.16),
    });
    state.y -= lineGap;
  }
}

function drawSection(state: DrawState, title: string) {
  ensureSpace(state, 44);
  state.y -= 8;
  state.page.drawRectangle({
    x: marginX,
    y: state.y - 5,
    width: 26,
    height: 3,
    color: rgb(0.03, 0.52, 0.78),
  });
  state.y -= 22;
  drawWrapped(state, title, {
    size: 13,
    font: state.bold,
    color: rgb(0.02, 0.11, 0.16),
    lineGap: 17,
  });
}

function drawField(state: DrawState, label: string, value: unknown) {
  const cleanValue = cleanPdfText(value);
  if (!cleanValue) return;
  ensureSpace(state, 28);
  drawWrapped(state, label.toUpperCase(), {
    size: 7,
    font: state.bold,
    color: rgb(0.32, 0.42, 0.46),
    lineGap: 10,
  });
  drawWrapped(state, cleanValue, {
    size: 10,
    color: rgb(0.08, 0.1, 0.11),
    lineGap: 14,
  });
  state.y -= 4;
}

function drawList(state: DrawState, label: string, rows: unknown[]) {
  const values = rows.map(cleanPdfText).filter(Boolean);
  if (!values.length) return;
  ensureSpace(state, 34);
  drawWrapped(state, label.toUpperCase(), {
    size: 7,
    font: state.bold,
    color: rgb(0.32, 0.42, 0.46),
    lineGap: 10,
  });
  for (const value of values) {
    drawWrapped(state, `- ${value}`, {
      x: marginX + 10,
      width: contentWidth - 10,
      size: 10,
      lineGap: 14,
    });
  }
  state.y -= 4;
}

function approvalStepLabel(step: any) {
  return cleanPdfText(
    step?.label ||
      step?.roleLabel ||
      step?.reviewerRole ||
      step?.role ||
      step?.reviewer?.role ||
      `Step ${step?.stepOrder || ""}`,
  );
}

function supportRows(part2: any) {
  const rows: string[] = [];
  const support = Array.isArray(part2?.supportRequests)
    ? part2.supportRequests
    : [];
  if (support.length) rows.push(`Selected support: ${support.join(", ")}`);
  if (part2?.budgetDetails) rows.push(`Budget details: ${part2.budgetDetails}`);
  if (part2?.vehiclePassengers) {
    rows.push(`Vehicle passengers: ${part2.vehiclePassengers}`);
  }
  if (part2?.foodPax) rows.push(`Food/Snacks pax: ${part2.foodPax}`);
  if (part2?.roomVenueDetails) {
    rows.push(`Room/Venue details: ${part2.roomVenueDetails}`);
  }
  if (part2?.soundSystemQty) rows.push(`Sound system: ${part2.soundSystemQty}`);
  if (part2?.microphoneQty) rows.push(`Microphone: ${part2.microphoneQty}`);
  if (part2?.lcdProjectorQty) {
    rows.push(`LCD projector: ${part2.lcdProjectorQty}`);
  }
  if (part2?.longTableQty) rows.push(`Tables: ${part2.longTableQty}`);
  if (part2?.chairsQty) rows.push(`Chairs: ${part2.chairsQty}`);
  if (part2?.extraProvisions) {
    rows.push(`Diverse-needs provisions: ${part2.extraProvisions}`);
  }
  if (part2?.otherSupport) rows.push(`Other support: ${part2.otherSupport}`);
  return rows;
}

async function renderDataBackedPdf({
  request,
  mode,
  error,
}: {
  request: any;
  mode: PdfMode;
  error?: unknown;
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const state: DrawState = {
    pdf,
    page: pdf.addPage(pageSize),
    regular,
    bold,
    y: 724,
  };
  const part1 = request.sapfPart1 || request.sapf?.part1 || {};
  const part2 = request.sapfPart2 || request.sapf?.part2 || {};
  const part4 = request.sapfPart4 || request.sapf?.part4 || null;
  const part6 = request.sapfPart6 || request.sapf?.part6 || null;
  const schedules = Array.isArray(part1.schedules)
    ? part1.schedules
    : Array.isArray(request.schedules)
      ? request.schedules
      : [];
  const conversionError =
    error instanceof Error ? cleanPdfText(error.message) : "";

  state.page.drawRectangle({
    x: 0,
    y: 690,
    width: 612,
    height: 102,
    color: rgb(0.02, 0.1, 0.13),
  });
  state.page.drawText(
    mode === "approved" ? "Approved Reservation" : "Reservation Preview",
    {
      x: marginX,
      y: 744,
      size: 22,
      font: bold,
      color: rgb(1, 1, 1),
    },
  );
  state.page.drawText(cleanPdfText(request.requestNumber || "Draft request"), {
    x: marginX,
    y: 716,
    size: 11,
    font: regular,
    color: rgb(0.72, 0.9, 0.96),
  });
  state.page.drawText(titleCaseStatus(request.status), {
    x: 458,
    y: 744,
    size: 10,
    font: bold,
    color: rgb(0.67, 0.95, 0.82),
  });
  state.y = 662;

  if (conversionError) {
    drawWrapped(
      state,
      "Preview generated from live reservation data because the DOCX-to-PDF converter is not available on this environment. The DOCX download still works.",
      {
        size: 9,
        color: rgb(0.28, 0.36, 0.39),
        lineGap: 13,
      },
    );
    state.y -= 8;
  }

  drawSection(state, "Request Summary");
  drawField(state, "Activity", part1.activityTitle || request.title);
  drawField(state, "Organization", part1.organization || request.organization);
  drawField(state, "Officer", displayUser(request.officer));
  drawField(state, "Department / Program", [
    part1.department,
    part1.programCourse,
  ]
    .map(cleanPdfText)
    .filter(Boolean)
    .join(" / "));
  drawField(state, "Venue", part1.venue || request.venue);
  drawField(state, "Participants", part1.noOfParticipants);
  drawField(state, "Modality / Setting", [part1.modality, part1.setting]
    .map(cleanPdfText)
    .filter(Boolean)
    .join(" / "));
  drawList(state, "Schedule", schedules.map(formatSchedule));

  drawSection(state, "Activity Details");
  drawField(state, "Activity Type", part1.activityType);
  drawField(state, "Scope", part1.scope);
  drawField(state, "Personnel in Charge", part1.personnelInCharge);
  drawField(state, "Attire", part1.attire);
  drawField(state, "Rationale", part1.rationale);
  drawField(state, "Objectives", part1.objectives);
  drawField(state, "Program Flow", part1.programFlow);
  drawField(state, "Emergency Plan", part1.emergencyPlan);
  drawField(state, "Core Values", listText(part1.coreValues));
  drawField(state, "Graduate Attributes", listText(part1.graduateAttributes));
  drawField(state, "Budget", part1.budget);
  drawField(state, "Source of Budget", part1.sourceOfBudget);

  drawSection(state, "Support Requests");
  drawList(state, "Requested Support", supportRows(part2));

  if (part4) {
    drawSection(state, "SDS Clearance");
    drawField(
      state,
      "Parents Consent",
      part4.parentsConsent === null || part4.parentsConsent === undefined
        ? ""
        : part4.parentsConsent
          ? "Yes"
          : "No",
    );
    drawField(
      state,
      "Academic Interruption",
      part4.academicInterruption === null ||
        part4.academicInterruption === undefined
        ? ""
        : part4.academicInterruption
          ? "Yes"
          : "No",
    );
    drawField(state, "Academic Remarks", part4.academicRemarks);
    drawField(
      state,
      "Medical Exam",
      part4.medicalExam === null || part4.medicalExam === undefined
        ? ""
        : part4.medicalExam
          ? "Yes"
          : "No",
    );
    drawField(
      state,
      "Report of Compliance",
      part4.reportOfCompliance === null ||
        part4.reportOfCompliance === undefined
        ? ""
        : part4.reportOfCompliance
          ? "Yes"
          : "No",
    );
    drawField(state, "Student Personnel Ratio", part4.studentPersonnelRatio);
  }

  if (part6) {
    drawSection(state, "Post-Activity Remarks");
    drawField(state, "Conducted Remarks", part6.conductedRemarks);
    drawField(state, "Cancelled Remarks", part6.cancelledRemarks);
  }

  const steps = Array.isArray(request.approvalSteps)
    ? request.approvalSteps
    : [];
  if (steps.length) {
    drawSection(state, "Approval Chain");
    drawList(
      state,
      "Steps",
      steps.map((step: any) => {
        const reviewer = displayUser(step.reviewer);
        const actedAt = formatDateTime(step.actedAt || step.updatedAt);
        return `${step.stepOrder || ""}. ${approvalStepLabel(step)} - ${titleCaseStatus(
          step.status,
        )} - ${reviewer}${actedAt ? ` (${actedAt})` : ""}`;
      }),
    );
  }

  const logs = Array.isArray(request.activityLogs) ? request.activityLogs : [];
  if (logs.length) {
    drawSection(state, "Recent History");
    drawList(
      state,
      "Timeline",
      logs.slice(-10).map((log: any) => {
        const when = formatDateTime(log.createdAt);
        const actor = displayUser(log.actor);
        const title = cleanPdfText(log.title || log.action || "Update");
        const description = cleanPdfText(log.description);
        return `${when ? `${when} - ` : ""}${title} by ${actor}${
          description ? `: ${description}` : ""
        }`;
      }),
    );
  }

  const footerPages = pdf.getPages();
  footerPages.forEach((page, index) => {
    page.drawText(`Zerve SAPF ${mode} document - Page ${index + 1}`, {
      x: marginX,
      y: 24,
      size: 8,
      font: regular,
      color: rgb(0.42, 0.48, 0.5),
    });
  });

  return Buffer.from(await pdf.save());
}

async function convertDocxToPdf(docxBytes: Buffer) {
  const remotePdfBytes = await runRemoteDocxToPdf(docxBytes);
  if (remotePdfBytes) return remotePdfBytes;

  const dir = await mkdtemp(path.join(tmpdir(), "sapf-pdf-"));
  const docxPath = path.join(dir, "sapf.docx");
  const pdfPath = path.join(dir, "sapf.pdf");

  try {
    await writeFile(docxPath, docxBytes);
    await runDocxToPdf(docxPath, pdfPath);
    return await readFile(pdfPath);
  } catch (error) {
    throw new Error(
      `Failed to convert the reservation DOCX to PDF. ${
        (error as Error).message
      }`,
      { cause: error },
    );
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

async function runRemoteDocxToPdf(docxBytes: Buffer) {
  if (process.env.CONVERTAPI_TOKEN || process.env.CONVERTAPI_SECRET) {
    return runConvertApiDocxToPdf(docxBytes);
  }

  return null;
}

async function runConvertApiDocxToPdf(docxBytes: Buffer) {
  const token = process.env.CONVERTAPI_TOKEN;
  const legacySecret = process.env.CONVERTAPI_SECRET;
  const endpoint = new URL(
    process.env.CONVERTAPI_ENDPOINT ||
      "https://v2.convertapi.com/convert/docx/to/pdf",
  );
  const formData = new FormData();
  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (legacySecret) {
    endpoint.searchParams.set("Secret", legacySecret);
  }

  formData.append("StoreFile", "false");
  formData.append(
    "File",
    new Blob([new Uint8Array(docxBytes)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    "reservation.docx",
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `ConvertAPI DOCX-to-PDF failed with ${response.status}. ${errorText}`,
    );
  }

  const result = await response.json();
  const file = result?.Files?.[0];

  if (file?.FileData) {
    return Buffer.from(file.FileData, "base64");
  }

  if (file?.Url || file?.FileUrl) {
    const pdfResponse = await fetch(file.Url || file.FileUrl);
    if (!pdfResponse.ok) {
      throw new Error(
        `ConvertAPI converted file download failed with ${pdfResponse.status}.`,
      );
    }
    return Buffer.from(await pdfResponse.arrayBuffer());
  }

  throw new Error("ConvertAPI did not return converted PDF data.");
}

async function appendVerificationPage({
  pdfBytes,
  request,
  verifyUrl,
}: {
  pdfBytes: Buffer;
  request: any;
  verifyUrl: string;
}) {
  const pdf = await PDFDocument.load(pdfBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const verifyPage = pdf.addPage([612, 792]);
  const qrData = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 220 });
  const qrImage = await pdf.embedPng(qrData);

  verifyPage.drawText("Zerve Verification", {
    x: 48,
    y: 720,
    size: 18,
    font: bold,
    color: rgb(0, 0, 0),
  });
  verifyPage.drawText(`Request No: ${request.requestNumber}`, {
    x: 48,
    y: 690,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });
  verifyPage.drawText(`Status: ${request.status}`, {
    x: 48,
    y: 672,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });
  verifyPage.drawText("Scan this QR code to verify the approved reservation.", {
    x: 48,
    y: 642,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  verifyPage.drawImage(qrImage, {
    x: 48,
    y: 390,
    width: 180,
    height: 180,
  });

  wrapText(verifyUrl, 90)
    .slice(0, 3)
    .forEach((line, index) => {
      verifyPage.drawText(line, {
        x: 48,
        y: 360 - index * 12,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      });
    });

  return Buffer.from(await pdf.save());
}

async function conversionUnavailablePreview({
  request,
  error,
  mode,
}: {
  request: any;
  error: unknown;
  mode: PdfMode;
}) {
  return renderDataBackedPdf({ request, mode, error });
}

export async function renderSapfPdf({
  request,
  mode,
  verifyUrl,
}: {
  request: any;
  mode: PdfMode;
  verifyUrl?: string;
}) {
  const docxBytes = await renderSapfDocx({ request });
  let pdfBytes: Buffer;

  try {
    pdfBytes = await convertDocxToPdf(docxBytes);
  } catch (error) {
    pdfBytes = await conversionUnavailablePreview({ request, error, mode });
  }

  if (mode === "approved" && verifyUrl) {
    return appendVerificationPage({ pdfBytes, request, verifyUrl });
  }

  return pdfBytes;
}
