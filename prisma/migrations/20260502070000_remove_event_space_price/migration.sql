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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "image" BLOB
);
INSERT INTO "new_event_space" ("capacity", "createdAt", "description", "id", "image", "location", "name", "status", "updatedAt") SELECT "capacity", "createdAt", "description", "id", "image", "location", "name", "status", "updatedAt" FROM "event_space";
DROP TABLE "event_space";
ALTER TABLE "new_event_space" RENAME TO "event_space";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
