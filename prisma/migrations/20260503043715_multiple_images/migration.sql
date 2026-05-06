-- CreateTable
CREATE TABLE "event_space_image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventSpaceId" TEXT NOT NULL,
    "data" BLOB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_space_image_eventSpaceId_fkey" FOREIGN KEY ("eventSpaceId") REFERENCES "event_space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "event_space_image_eventSpaceId_idx" ON "event_space_image"("eventSpaceId");
