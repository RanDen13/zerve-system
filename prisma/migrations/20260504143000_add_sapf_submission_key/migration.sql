-- Add an optional idempotency key so repeated browser submissions reuse the
-- first created SAPF request instead of creating duplicate bookings.
ALTER TABLE "sapf_request" ADD COLUMN "submissionKey" TEXT;

CREATE UNIQUE INDEX "sapf_request_submissionKey_key" ON "sapf_request"("submissionKey");
