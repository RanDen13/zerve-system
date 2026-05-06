CREATE TABLE "user_tutorial_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_tutorial_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "user_tutorial_progress_userId_role_key" ON "user_tutorial_progress"("userId", "role");

CREATE INDEX "user_tutorial_progress_status_idx" ON "user_tutorial_progress"("status");
