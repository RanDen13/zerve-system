/*
  Warnings:

  - You are about to drop the `booking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `totalBookings` on the `event_space` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "booking_date_idx";

-- DropIndex
DROP INDEX "booking_eventSpaceId_idx";

-- DropIndex
DROP INDEX "booking_userId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "booking";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "sapf_request" (
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
    "sapfPart1" JSONB NOT NULL,
    "sapfPart2" JSONB NOT NULL,
    "sapfPart3" TEXT,
    "sapfPart4" JSONB,
    "verificationToken" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sapf_request_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sapf_request_eventSpaceId_fkey" FOREIGN KEY ("eventSpaceId") REFERENCES "event_space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "approval_step" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "actedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "approval_step_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "approval_step_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "approval_action" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "stepId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approval_action_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "approval_action_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "approval_step" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "approval_action_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "approver_position_user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "approver_position_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "venue_block" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventSpaceId" TEXT,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "venue_block_eventSpaceId_fkey" FOREIGN KEY ("eventSpaceId") REFERENCES "event_space" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "venue_block_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "requestId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'REQUEST',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notification_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "concern_thread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "approvalStepId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "concern_thread_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "concern_thread_approvalStepId_fkey" FOREIGN KEY ("approvalStepId") REFERENCES "approval_step" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "concern_thread_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "concern_thread_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "concern_message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "concern_message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "concern_thread" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "concern_message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_event_space" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "pricePerHour" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "image" BLOB
);
INSERT INTO "new_event_space" ("capacity", "createdAt", "description", "id", "image", "location", "name", "pricePerHour", "status", "updatedAt") SELECT "capacity", "createdAt", "description", "id", "image", "location", "name", "pricePerHour", "status", "updatedAt" FROM "event_space";
DROP TABLE "event_space";
ALTER TABLE "new_event_space" RENAME TO "event_space";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "sapf_request_requestNumber_key" ON "sapf_request"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sapf_request_verificationToken_key" ON "sapf_request"("verificationToken");

-- CreateIndex
CREATE INDEX "sapf_request_officerId_idx" ON "sapf_request"("officerId");

-- CreateIndex
CREATE INDEX "sapf_request_eventSpaceId_idx" ON "sapf_request"("eventSpaceId");

-- CreateIndex
CREATE INDEX "sapf_request_status_idx" ON "sapf_request"("status");

-- CreateIndex
CREATE INDEX "sapf_request_startAt_idx" ON "sapf_request"("startAt");

-- CreateIndex
CREATE INDEX "approval_step_reviewerId_idx" ON "approval_step"("reviewerId");

-- CreateIndex
CREATE INDEX "approval_step_status_idx" ON "approval_step"("status");

-- CreateIndex
CREATE UNIQUE INDEX "approval_step_requestId_stepOrder_key" ON "approval_step"("requestId", "stepOrder");

-- CreateIndex
CREATE INDEX "approval_action_requestId_idx" ON "approval_action"("requestId");

-- CreateIndex
CREATE INDEX "approval_action_actorId_idx" ON "approval_action"("actorId");

-- CreateIndex
CREATE INDEX "approver_position_user_position_idx" ON "approver_position_user"("position");

-- CreateIndex
CREATE UNIQUE INDEX "approver_position_user_userId_position_key" ON "approver_position_user"("userId", "position");

-- CreateIndex
CREATE INDEX "venue_block_eventSpaceId_idx" ON "venue_block"("eventSpaceId");

-- CreateIndex
CREATE INDEX "venue_block_startAt_idx" ON "venue_block"("startAt");

-- CreateIndex
CREATE INDEX "notification_userId_idx" ON "notification"("userId");

-- CreateIndex
CREATE INDEX "notification_requestId_idx" ON "notification"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "concern_thread_approvalStepId_key" ON "concern_thread"("approvalStepId");

-- CreateIndex
CREATE INDEX "concern_thread_requestId_idx" ON "concern_thread"("requestId");

-- CreateIndex
CREATE INDEX "concern_thread_officerId_idx" ON "concern_thread"("officerId");

-- CreateIndex
CREATE INDEX "concern_thread_reviewerId_idx" ON "concern_thread"("reviewerId");

-- CreateIndex
CREATE INDEX "concern_message_threadId_idx" ON "concern_message"("threadId");

-- CreateIndex
CREATE INDEX "concern_message_authorId_idx" ON "concern_message"("authorId");
