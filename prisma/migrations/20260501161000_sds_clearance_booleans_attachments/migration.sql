-- Redefine SAPF SDS clearance values as booleans and add stored attachment rows.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_sapf_request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestNumber" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "eventSpaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "attendeeCount" INTEGER NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currentStepOrder" INTEGER,
    "conflictWarning" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "modality" TEXT,
    "programCourse" TEXT,
    "venue" TEXT,
    "setting" TEXT,
    "personnelInCharge" TEXT,
    "activityType" TEXT,
    "attire" TEXT,
    "scope" TEXT,
    "program" TEXT,
    "rationale" TEXT,
    "objectives" TEXT,
    "programFlow" TEXT,
    "budget" TEXT,
    "sourceOfBudget" TEXT,
    "budgetDetails" TEXT,
    "vehiclePassengers" TEXT,
    "foodPax" TEXT,
    "roomVenueDetails" TEXT,
    "microphoneQty" TEXT,
    "otherSupport" TEXT,
    "otherDetails" TEXT,
    "parentsConsent" BOOLEAN,
    "hasAttachments" BOOLEAN,
    "academicInterruption" BOOLEAN,
    "academicInterruptionRemarks" TEXT,
    "medicalExam" BOOLEAN,
    "reportOfCompliance" BOOLEAN,
    "studentPersonnelRatio" TEXT,
    "verificationToken" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sapf_request_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sapf_request_eventSpaceId_fkey" FOREIGN KEY ("eventSpaceId") REFERENCES "event_space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_sapf_request" (
    "id",
    "requestNumber",
    "officerId",
    "eventSpaceId",
    "title",
    "organization",
    "department",
    "attendeeCount",
    "startAt",
    "endAt",
    "status",
    "currentStepOrder",
    "conflictWarning",
    "rejectionReason",
    "modality",
    "programCourse",
    "venue",
    "setting",
    "personnelInCharge",
    "activityType",
    "attire",
    "scope",
    "program",
    "rationale",
    "objectives",
    "programFlow",
    "budget",
    "sourceOfBudget",
    "budgetDetails",
    "vehiclePassengers",
    "foodPax",
    "roomVenueDetails",
    "microphoneQty",
    "otherSupport",
    "otherDetails",
    "parentsConsent",
    "hasAttachments",
    "academicInterruption",
    "academicInterruptionRemarks",
    "medicalExam",
    "reportOfCompliance",
    "studentPersonnelRatio",
    "verificationToken",
    "approvedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "requestNumber",
    "officerId",
    "eventSpaceId",
    "title",
    "organization",
    "department",
    "attendeeCount",
    "startAt",
    "endAt",
    "status",
    "currentStepOrder",
    "conflictWarning",
    "rejectionReason",
    "modality",
    "programCourse",
    "venue",
    "setting",
    "personnelInCharge",
    "activityType",
    "attire",
    "scope",
    "program",
    "rationale",
    "objectives",
    "programFlow",
    "budget",
    "sourceOfBudget",
    "budgetDetails",
    "vehiclePassengers",
    "foodPax",
    "roomVenueDetails",
    "microphoneQty",
    "otherSupport",
    "otherDetails",
    CASE
        WHEN "parentsConsent" IS NULL OR trim("parentsConsent") = '' THEN NULL
        WHEN lower(trim("parentsConsent")) LIKE '%yes%' THEN true
        ELSE false
    END,
    CASE
        WHEN "attachments" IS NULL OR trim("attachments") = '' THEN NULL
        WHEN lower(trim("attachments")) IN ('-', 'n/a', 'na', 'no', 'none', 'not applicable') THEN false
        ELSE true
    END,
    CASE
        WHEN "academicInterruption" IS NULL OR trim("academicInterruption") = '' THEN NULL
        WHEN lower(trim("academicInterruption")) LIKE '%yes%' THEN true
        ELSE false
    END,
    "academicRemarks",
    CASE
        WHEN "medicalExam" IS NULL OR trim("medicalExam") = '' THEN NULL
        WHEN lower(trim("medicalExam")) LIKE '%yes%' THEN true
        ELSE false
    END,
    CASE
        WHEN "reportOfCompliance" IS NULL OR trim("reportOfCompliance") = '' THEN NULL
        WHEN lower(trim("reportOfCompliance")) LIKE '%yes%' THEN true
        ELSE false
    END,
    "studentPersonnelRatio",
    "verificationToken",
    "approvedAt",
    "createdAt",
    "updatedAt"
FROM "sapf_request";

DROP TABLE "sapf_request";
ALTER TABLE "new_sapf_request" RENAME TO "sapf_request";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE TABLE "sapf_attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sapf_attachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "sapf_request_requestNumber_key" ON "sapf_request"("requestNumber");
CREATE UNIQUE INDEX "sapf_request_verificationToken_key" ON "sapf_request"("verificationToken");
CREATE INDEX "sapf_request_officerId_idx" ON "sapf_request"("officerId");
CREATE INDEX "sapf_request_eventSpaceId_idx" ON "sapf_request"("eventSpaceId");
CREATE INDEX "sapf_request_status_idx" ON "sapf_request"("status");
CREATE INDEX "sapf_request_startAt_idx" ON "sapf_request"("startAt");
CREATE INDEX "sapf_attachment_requestId_idx" ON "sapf_attachment"("requestId");
