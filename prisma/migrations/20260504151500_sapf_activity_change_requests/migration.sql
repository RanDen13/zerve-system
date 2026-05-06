CREATE TABLE "sapf_activity_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sapf_activity_log_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sapf_activity_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "sapf_activity_log_requestId_idx" ON "sapf_activity_log"("requestId");
CREATE INDEX "sapf_activity_log_actorId_idx" ON "sapf_activity_log"("actorId");
CREATE INDEX "sapf_activity_log_action_idx" ON "sapf_activity_log"("action");

CREATE TABLE "sapf_change_request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "resolutionComment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "sapf_change_request_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sapf_change_request_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sapf_change_request_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "sapf_change_request_requestId_idx" ON "sapf_change_request"("requestId");
CREATE INDEX "sapf_change_request_requestedById_idx" ON "sapf_change_request"("requestedById");
CREATE INDEX "sapf_change_request_reviewedById_idx" ON "sapf_change_request"("reviewedById");
CREATE INDEX "sapf_change_request_status_idx" ON "sapf_change_request"("status");
