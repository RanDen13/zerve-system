CREATE TYPE "SAPFOperationalStatus" AS ENUM (
  'NOT_STARTED',
  'WAITING_FOR_EVENT',
  'EQUIPMENT_PENDING',
  'EQUIPMENT_PROVIDED',
  'ONGOING',
  'AWAITING_EQUIPMENT_RETURN',
  'RETURN_REQUESTED',
  'COMPLETED',
  'CANCELLED'
);

ALTER TABLE "sapf_request"
  ADD COLUMN "operationalStatus" "SAPFOperationalStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "operationalStatusUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "sapf_request"
SET "operationalStatus" = 'WAITING_FOR_EVENT',
    "operationalStatusUpdatedAt" = NOW()
WHERE "status" = 'APPROVED';

UPDATE "sapf_request"
SET "operationalStatus" = 'CANCELLED',
    "operationalStatusUpdatedAt" = NOW()
WHERE "status" = 'CANCELLED';

CREATE INDEX "sapf_request_operationalStatus_idx" ON "sapf_request"("operationalStatus");
