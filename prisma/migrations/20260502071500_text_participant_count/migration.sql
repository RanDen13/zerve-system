-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sapf_request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestNumber" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "attendeeCount" TEXT NOT NULL,
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
    CONSTRAINT "sapf_request_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_sapf_request" ("academicInterruption", "academicInterruptionRemarks", "activityType", "approvedAt", "attendeeCount", "attire", "budget", "budgetDetails", "conflictWarning", "createdAt", "currentStepOrder", "department", "endAt", "foodPax", "hasAttachments", "id", "medicalExam", "microphoneQty", "modality", "objectives", "officerId", "organization", "otherDetails", "otherSupport", "parentsConsent", "personnelInCharge", "program", "programCourse", "programFlow", "rationale", "rejectionReason", "reportOfCompliance", "requestNumber", "roomVenueDetails", "scope", "setting", "sourceOfBudget", "startAt", "status", "studentPersonnelRatio", "title", "updatedAt", "vehiclePassengers", "venue", "verificationToken") SELECT "academicInterruption", "academicInterruptionRemarks", "activityType", "approvedAt", CAST("attendeeCount" AS TEXT), "attire", "budget", "budgetDetails", "conflictWarning", "createdAt", "currentStepOrder", "department", "endAt", "foodPax", "hasAttachments", "id", "medicalExam", "microphoneQty", "modality", "objectives", "officerId", "organization", "otherDetails", "otherSupport", "parentsConsent", "personnelInCharge", "program", "programCourse", "programFlow", "rationale", "rejectionReason", "reportOfCompliance", "requestNumber", "roomVenueDetails", "scope", "setting", "sourceOfBudget", "startAt", "status", "studentPersonnelRatio", "title", "updatedAt", "vehiclePassengers", "venue", "verificationToken" FROM "sapf_request";
DROP TABLE "sapf_request";
ALTER TABLE "new_sapf_request" RENAME TO "sapf_request";
CREATE UNIQUE INDEX "sapf_request_requestNumber_key" ON "sapf_request"("requestNumber");
CREATE UNIQUE INDEX "sapf_request_verificationToken_key" ON "sapf_request"("verificationToken");
CREATE INDEX "sapf_request_officerId_idx" ON "sapf_request"("officerId");
CREATE INDEX "sapf_request_status_idx" ON "sapf_request"("status");
CREATE INDEX "sapf_request_startAt_idx" ON "sapf_request"("startAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
