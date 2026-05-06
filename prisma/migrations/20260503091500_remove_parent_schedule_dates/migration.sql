PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_sapf_request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestNumber" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "departmentCategory" TEXT,
    "department" TEXT NOT NULL,
    "attendeeCount" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currentStepOrder" INTEGER,
    "conflictWarning" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "modality" TEXT,
    "programCourse" TEXT,
    "venue" TEXT,
    "setting" TEXT,
    "offCampAgree" TEXT,
    "personnelInCharge" TEXT,
    "activityType" TEXT,
    "attire" TEXT,
    "scope" TEXT,
    "program" TEXT,
    "rationale" TEXT,
    "objectives" TEXT,
    "programFlow" TEXT,
    "emergencyPlan" TEXT,
    "budget" TEXT,
    "sourceOfBudget" TEXT,
    "budgetDetails" TEXT,
    "vehiclePassengers" TEXT,
    "foodPax" TEXT,
    "roomVenueDetails" TEXT,
    "microphoneQty" TEXT,
    "extraProvisions" TEXT,
    "otherSupport" TEXT,
    "otherDetails" TEXT,
    "parentsConsent" BOOLEAN,
    "hasAttachments" BOOLEAN,
    "academicInterruption" BOOLEAN,
    "academicInterruptionRemarks" TEXT,
    "medicalExam" BOOLEAN,
    "reportOfCompliance" BOOLEAN,
    "studentPersonnelRatio" TEXT,
    "conductedRemarks" TEXT,
    "cancelledRemarks" TEXT,
    "verificationToken" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sapf_request_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_sapf_request" (
    "id", "requestNumber", "officerId", "title", "organization",
    "departmentCategory", "department", "attendeeCount", "status",
    "currentStepOrder", "conflictWarning", "rejectionReason", "modality",
    "programCourse", "venue", "setting", "offCampAgree",
    "personnelInCharge", "activityType", "attire", "scope", "program",
    "rationale", "objectives", "programFlow", "emergencyPlan", "budget",
    "sourceOfBudget", "budgetDetails", "vehiclePassengers", "foodPax",
    "roomVenueDetails", "microphoneQty", "extraProvisions", "otherSupport",
    "otherDetails", "parentsConsent", "hasAttachments",
    "academicInterruption", "academicInterruptionRemarks", "medicalExam",
    "reportOfCompliance", "studentPersonnelRatio", "conductedRemarks",
    "cancelledRemarks", "verificationToken", "approvedAt", "createdAt",
    "updatedAt"
)
SELECT
    "id", "requestNumber", "officerId", "title", "organization",
    "departmentCategory", "department", "attendeeCount", "status",
    "currentStepOrder", "conflictWarning", "rejectionReason", "modality",
    "programCourse", "venue", "setting", "offCampAgree",
    "personnelInCharge", "activityType", "attire", "scope", "program",
    "rationale", "objectives", "programFlow", "emergencyPlan", "budget",
    "sourceOfBudget", "budgetDetails", "vehiclePassengers", "foodPax",
    "roomVenueDetails", "microphoneQty", "extraProvisions", "otherSupport",
    "otherDetails", "parentsConsent", "hasAttachments",
    "academicInterruption", "academicInterruptionRemarks", "medicalExam",
    "reportOfCompliance", "studentPersonnelRatio", "conductedRemarks",
    "cancelledRemarks", "verificationToken", "approvedAt", "createdAt",
    "updatedAt"
FROM "sapf_request";

DROP TABLE "sapf_request";
ALTER TABLE "new_sapf_request" RENAME TO "sapf_request";
CREATE UNIQUE INDEX "sapf_request_requestNumber_key" ON "sapf_request"("requestNumber");
CREATE UNIQUE INDEX "sapf_request_verificationToken_key" ON "sapf_request"("verificationToken");
CREATE INDEX "sapf_request_officerId_idx" ON "sapf_request"("officerId");
CREATE INDEX "sapf_request_status_idx" ON "sapf_request"("status");

CREATE TABLE "new_venue_block" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventSpaceId" TEXT,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "venue_block_eventSpaceId_fkey" FOREIGN KEY ("eventSpaceId") REFERENCES "event_space" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "venue_block_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_venue_block" (
    "id", "eventSpaceId", "title", "reason", "createdById", "createdAt", "updatedAt"
)
SELECT
    "id", "eventSpaceId", "title", "reason", "createdById", "createdAt", "updatedAt"
FROM "venue_block";

DROP TABLE "venue_block";
ALTER TABLE "new_venue_block" RENAME TO "venue_block";
CREATE INDEX "venue_block_eventSpaceId_idx" ON "venue_block"("eventSpaceId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
