CREATE TABLE "sapf_request_schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sapf_request_schedule_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "sapf_request_schedule_requestId_idx" ON "sapf_request_schedule"("requestId");
CREATE INDEX "sapf_request_schedule_startAt_idx" ON "sapf_request_schedule"("startAt");

CREATE TABLE "venue_block_schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueBlockId" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "venue_block_schedule_venueBlockId_fkey" FOREIGN KEY ("venueBlockId") REFERENCES "venue_block" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "venue_block_schedule_venueBlockId_idx" ON "venue_block_schedule"("venueBlockId");
CREATE INDEX "venue_block_schedule_startAt_idx" ON "venue_block_schedule"("startAt");
