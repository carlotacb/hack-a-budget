-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TravelMessageTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TravelMessageTemplate" ("active", "createdAt", "id", "message", "name", "updatedAt") SELECT "active", "createdAt", "id", "message", "name", "updatedAt" FROM "TravelMessageTemplate";
DROP TABLE "TravelMessageTemplate";
ALTER TABLE "new_TravelMessageTemplate" RENAME TO "TravelMessageTemplate";
CREATE UNIQUE INDEX "TravelMessageTemplate_name_key" ON "TravelMessageTemplate"("name");
CREATE INDEX "TravelMessageTemplate_active_idx" ON "TravelMessageTemplate"("active");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
