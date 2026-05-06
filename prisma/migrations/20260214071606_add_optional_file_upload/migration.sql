-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventSpaceId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "attendees" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalPrice" REAL NOT NULL,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "requirementsData" BLOB,
    "requirementsDataType" TEXT,
    CONSTRAINT "booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "booking_eventSpaceId_fkey" FOREIGN KEY ("eventSpaceId") REFERENCES "event_space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_booking" ("attendees", "createdAt", "date", "endTime", "eventSpaceId", "id", "purpose", "rejectionReason", "requirementsData", "requirementsDataType", "startTime", "status", "totalPrice", "updatedAt", "userId") SELECT "attendees", "createdAt", "date", "endTime", "eventSpaceId", "id", "purpose", "rejectionReason", "requirementsData", "requirementsDataType", "startTime", "status", "totalPrice", "updatedAt", "userId" FROM "booking";
DROP TABLE "booking";
ALTER TABLE "new_booking" RENAME TO "booking";
CREATE INDEX "booking_userId_idx" ON "booking"("userId");
CREATE INDEX "booking_eventSpaceId_idx" ON "booking"("eventSpaceId");
CREATE INDEX "booking_date_idx" ON "booking"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
