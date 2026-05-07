ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'EQUIPMENT_PROVISIONER';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EQUIPMENT';

CREATE TYPE "SAPFEquipmentRequestStatus" AS ENUM ('REQUESTED', 'PROVIDED', 'RETURN_REQUESTED', 'RETURNED');

ALTER TABLE "event_space"
ADD COLUMN "bookingAdvanceDays" INTEGER NOT NULL DEFAULT 30;

CREATE TABLE "equipment_item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supportLabel" TEXT,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sapf_equipment_request" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "equipmentItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "SAPFEquipmentRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "providedAt" TIMESTAMP(3),
    "providedById" TEXT,
    "returnRequestedAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "returnedById" TEXT,
    "dueReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sapf_equipment_request_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "equipment_item_name_key" ON "equipment_item"("name");
CREATE UNIQUE INDEX "equipment_item_supportLabel_key" ON "equipment_item"("supportLabel");
CREATE INDEX "equipment_item_active_idx" ON "equipment_item"("active");
CREATE UNIQUE INDEX "sapf_equipment_request_requestId_equipmentItemId_key" ON "sapf_equipment_request"("requestId", "equipmentItemId");
CREATE INDEX "sapf_equipment_request_equipmentItemId_idx" ON "sapf_equipment_request"("equipmentItemId");
CREATE INDEX "sapf_equipment_request_requestId_idx" ON "sapf_equipment_request"("requestId");
CREATE INDEX "sapf_equipment_request_status_idx" ON "sapf_equipment_request"("status");

ALTER TABLE "equipment_item" ADD CONSTRAINT "equipment_item_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sapf_equipment_request" ADD CONSTRAINT "sapf_equipment_request_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sapf_equipment_request" ADD CONSTRAINT "sapf_equipment_request_equipmentItemId_fkey" FOREIGN KEY ("equipmentItemId") REFERENCES "equipment_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sapf_equipment_request" ADD CONSTRAINT "sapf_equipment_request_providedById_fkey" FOREIGN KEY ("providedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sapf_equipment_request" ADD CONSTRAINT "sapf_equipment_request_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "equipment_item" ("id", "name", "supportLabel", "totalQuantity", "active", "createdAt", "updatedAt")
VALUES
  ('eq_sound_system', 'Sound System', 'Sound System', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('eq_microphone', 'Microphone', 'Microphone', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('eq_lcd_projector', 'LCD Projector', 'LCD Projector', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('eq_long_table', 'Long Table', 'One Long Table', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('eq_chairs', 'Chairs', 'Chairs', 100, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
