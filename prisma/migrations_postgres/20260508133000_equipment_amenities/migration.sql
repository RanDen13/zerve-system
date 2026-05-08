ALTER TABLE "amenity"
  ADD COLUMN "supportLabel" TEXT,
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "_EventSpaceAmenities" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

INSERT INTO "_EventSpaceAmenities" ("A", "B")
SELECT DISTINCT "id", "eventSpaceId"
FROM "amenity"
WHERE "eventSpaceId" IS NOT NULL;

UPDATE "amenity"
SET "supportLabel" = CASE
  WHEN LOWER("name") IN ('sound system', 'sound') THEN 'Sound System'
  WHEN LOWER("name") IN ('microphone', 'microphones') THEN 'Microphone'
  WHEN LOWER("name") IN ('projector', 'lcd projector') THEN 'LCD Projector'
  WHEN LOWER("name") IN ('tables', 'long table', 'one long table') THEN 'Tables'
  WHEN LOWER("name") = 'chairs' THEN 'Chairs'
  ELSE NULL
END
WHERE "supportLabel" IS NULL;

INSERT INTO "amenity" ("id", "name", "icon", "supportLabel", "active", "createdAt", "updatedAt")
SELECT 'amenity_' || LOWER(REGEXP_REPLACE("supportLabel", '[^a-zA-Z0-9]+', '_', 'g')),
       "name",
       LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '_', 'g')),
       "supportLabel",
       "active",
       NOW(),
       NOW()
FROM "equipment_item"
WHERE "supportLabel" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "amenity"
    WHERE "amenity"."supportLabel" = "equipment_item"."supportLabel"
  );

CREATE UNIQUE INDEX "amenity_supportLabel_key" ON "amenity"("supportLabel");
CREATE UNIQUE INDEX "_EventSpaceAmenities_AB_unique" ON "_EventSpaceAmenities"("A", "B");
CREATE INDEX "_EventSpaceAmenities_B_index" ON "_EventSpaceAmenities"("B");

ALTER TABLE "_EventSpaceAmenities"
  ADD CONSTRAINT "_EventSpaceAmenities_A_fkey" FOREIGN KEY ("A") REFERENCES "amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "_EventSpaceAmenities_B_fkey" FOREIGN KEY ("B") REFERENCES "event_space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "amenity" DROP CONSTRAINT IF EXISTS "amenity_eventSpaceId_fkey";
ALTER TABLE "amenity" DROP COLUMN "eventSpaceId";
