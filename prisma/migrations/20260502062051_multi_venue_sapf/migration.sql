-- CreateTable
CREATE TABLE "sapf_request_venue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "eventSpaceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sapf_request_venue_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sapf_request_venue_eventSpaceId_fkey" FOREIGN KEY ("eventSpaceId") REFERENCES "event_space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "sapf_request_venue_eventSpaceId_idx" ON "sapf_request_venue"("eventSpaceId");

-- CreateIndex
CREATE UNIQUE INDEX "sapf_request_venue_requestId_eventSpaceId_key" ON "sapf_request_venue"("requestId", "eventSpaceId");
