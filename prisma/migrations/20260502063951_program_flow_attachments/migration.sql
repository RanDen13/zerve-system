-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sapf_attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BLOB NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'SDS_CLEARANCE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sapf_attachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_sapf_attachment" ("createdAt", "data", "fileName", "id", "mimeType", "requestId", "size") SELECT "createdAt", "data", "fileName", "id", "mimeType", "requestId", "size" FROM "sapf_attachment";
DROP TABLE "sapf_attachment";
ALTER TABLE "new_sapf_attachment" RENAME TO "sapf_attachment";
CREATE INDEX "sapf_attachment_requestId_idx" ON "sapf_attachment"("requestId");
CREATE INDEX "sapf_attachment_purpose_idx" ON "sapf_attachment"("purpose");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
