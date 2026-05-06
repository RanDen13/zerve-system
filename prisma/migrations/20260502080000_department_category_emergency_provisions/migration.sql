ALTER TABLE "sapf_request" ADD COLUMN "departmentCategory" TEXT;
ALTER TABLE "sapf_request" ADD COLUMN "emergencyPlan" TEXT;
ALTER TABLE "sapf_request" ADD COLUMN "extraProvisions" TEXT;

DELETE FROM "sapf_support_request"
WHERE "value" = 'Chairs and Tables'
  AND EXISTS (
    SELECT 1
    FROM "sapf_support_request" AS existing
    WHERE existing."requestId" = "sapf_support_request"."requestId"
      AND existing."value" = 'One Long Table'
  );

UPDATE "sapf_support_request"
SET "value" = 'One Long Table'
WHERE "value" = 'Chairs and Tables';
