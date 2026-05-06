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
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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

async function convertDocxToPdf(docxBytes: Buffer) {
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
}: {
  request: any;
  error: unknown;
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  const errorText =
    error instanceof Error ? error.message : "Unknown conversion error.";

  page.drawText("Reservation Preview Unavailable", {
    x: 48,
    y: 720,
    size: 18,
    font: bold,
    color: rgb(0.8, 0.2, 0.05),
  });
  page.drawText(`Request No: ${request.requestNumber || "-"}`, {
    x: 48,
    y: 690,
    size: 11,
    font,
  });
  page.drawText(`Activity: ${request.title || "-"}`, {
    x: 48,
    y: 672,
    size: 11,
    font,
  });
  page.drawText(
    "The DOCX was generated, but this machine cannot convert DOCX to PDF right now.",
    {
      x: 48,
      y: 636,
      size: 10,
      font,
    },
  );
  page.drawText("How to fix this local preview:", {
    x: 48,
    y: 600,
    size: 12,
    font: bold,
  });

  [
    "1. Install LibreOffice, or add soffice.exe to PATH.",
    "2. Or repair/reinstall Microsoft Word so COM automation works.",
    "3. Docker already installs LibreOffice Writer and unoconv for conversion.",
    "4. You can still use Download DOCX for the generated reservation document.",
  ].forEach((line, index) => {
    page.drawText(line, {
      x: 64,
      y: 576 - index * 18,
      size: 10,
      font,
    });
  });

  page.drawText("Converter error:", {
    x: 48,
    y: 480,
    size: 12,
    font: bold,
  });
  wrapText(errorText, 92)
    .slice(0, 12)
    .forEach((line, index) => {
      page.drawText(line, {
        x: 48,
        y: 456 - index * 14,
        size: 8,
        font,
        color: rgb(0.25, 0.25, 0.25),
      });
    });

  return Buffer.from(await pdf.save());
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
    if (mode === "preview") {
      return conversionUnavailablePreview({ request, error });
    }

    throw error;
  }

  if (mode === "approved" && verifyUrl) {
    return appendVerificationPage({ pdfBytes, request, verifyUrl });
  }

  return pdfBytes;
}
