-- CreateTable
CREATE TABLE "sapf_core_value" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sapf_core_value_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sapf_graduate_attribute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sapf_graduate_attribute_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sapf_support_request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sapf_support_request_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill list values from the former JSON columns before the table rewrite.
INSERT INTO "sapf_core_value" ("id", "requestId", "value")
SELECT lower(hex(randomblob(16))), "requestId", "value"
FROM (
    SELECT DISTINCT "sapf_request"."id" AS "requestId", json_each.value AS "value"
    FROM "sapf_request", json_each("sapf_request"."sapfPart1", '$.coreValues')
    WHERE json_each.value IS NOT NULL
);

INSERT INTO "sapf_graduate_attribute" ("id", "requestId", "value")
SELECT lower(hex(randomblob(16))), "requestId", "value"
FROM (
    SELECT DISTINCT "sapf_request"."id" AS "requestId", json_each.value AS "value"
    FROM "sapf_request", json_each("sapf_request"."sapfPart1", '$.graduateAttributes')
    WHERE json_each.value IS NOT NULL
);

INSERT INTO "sapf_support_request" ("id", "requestId", "value")
SELECT lower(hex(randomblob(16))), "requestId", "value"
FROM (
    SELECT DISTINCT "sapf_request"."id" AS "requestId", json_each.value AS "value"
    FROM "sapf_request", json_each("sapf_request"."sapfPart2", '$.supportRequests')
    WHERE json_each.value IS NOT NULL
);

-- RedefineTables
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
    "parentsConsent" TEXT,
    "attachments" TEXT,
    "academicInterruption" TEXT,
    "academicRemarks" TEXT,
    "medicalExam" TEXT,
    "reportOfCompliance" TEXT,
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
    "attachments",
    "academicInterruption",
    "academicRemarks",
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
    json_extract("sapfPart1", '$.modality'),
    json_extract("sapfPart1", '$.programCourse'),
    json_extract("sapfPart1", '$.venue'),
    json_extract("sapfPart1", '$.setting'),
    json_extract("sapfPart1", '$.personnelInCharge'),
    json_extract("sapfPart1", '$.activityType'),
    json_extract("sapfPart1", '$.attire'),
    json_extract("sapfPart1", '$.scope'),
    json_extract("sapfPart1", '$.program'),
    json_extract("sapfPart1", '$.rationale'),
    json_extract("sapfPart1", '$.objectives'),
    json_extract("sapfPart1", '$.programFlow'),
    json_extract("sapfPart1", '$.budget'),
    json_extract("sapfPart1", '$.sourceOfBudget'),
    json_extract("sapfPart2", '$.budgetDetails'),
    json_extract("sapfPart2", '$.vehiclePassengers'),
    json_extract("sapfPart2", '$.foodPax'),
    json_extract("sapfPart2", '$.roomVenueDetails'),
    json_extract("sapfPart2", '$.microphoneQty'),
    json_extract("sapfPart2", '$.otherSupport'),
    "sapfPart3",
    json_extract("sapfPart4", '$.parentsConsent'),
    json_extract("sapfPart4", '$.attachments'),
    json_extract("sapfPart4", '$.academicInterruption'),
    json_extract("sapfPart4", '$.academicRemarks'),
    json_extract("sapfPart4", '$.medicalExam'),
    json_extract("sapfPart4", '$.reportOfCompliance'),
    COALESCE(json_extract("sapfPart4", '$.studentPersonnelRatio'), json_extract("sapfPart4", '$.participantPersonnelRatio')),
    "verificationToken",
    "approvedAt",
    "createdAt",
    "updatedAt"
FROM "sapf_request";

DROP TABLE "sapf_request";
ALTER TABLE "new_sapf_request" RENAME TO "sapf_request";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "sapf_request_requestNumber_key" ON "sapf_request"("requestNumber");
CREATE UNIQUE INDEX "sapf_request_verificationToken_key" ON "sapf_request"("verificationToken");
CREATE INDEX "sapf_request_officerId_idx" ON "sapf_request"("officerId");
CREATE INDEX "sapf_request_eventSpaceId_idx" ON "sapf_request"("eventSpaceId");
CREATE INDEX "sapf_request_status_idx" ON "sapf_request"("status");
CREATE INDEX "sapf_request_startAt_idx" ON "sapf_request"("startAt");
CREATE INDEX "sapf_core_value_requestId_idx" ON "sapf_core_value"("requestId");
CREATE UNIQUE INDEX "sapf_core_value_requestId_value_key" ON "sapf_core_value"("requestId", "value");
CREATE INDEX "sapf_graduate_attribute_requestId_idx" ON "sapf_graduate_attribute"("requestId");
CREATE UNIQUE INDEX "sapf_graduate_attribute_requestId_value_key" ON "sapf_graduate_attribute"("requestId", "value");
CREATE INDEX "sapf_support_request_requestId_idx" ON "sapf_support_request"("requestId");
CREATE UNIQUE INDEX "sapf_support_request_requestId_value_key" ON "sapf_support_request"("requestId", "value");
