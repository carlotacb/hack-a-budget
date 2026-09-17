/*
  Warnings:

  - Added the required column `departmentId` to the `Subcategory` table without a default value. This is not possible if the table is not empty.

  Backfill: ensures a protected "General" department (code "general") exists,
  used as the default department for any subcategory created before this
  migration. The app treats the "general" department code as non-deletable
  and always-active.
*/
INSERT INTO "Department" ("id", "code", "name", "active", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(12))), 'general', 'General', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Department" WHERE "code" = 'general');

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Subcategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "budgetCents" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subcategory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Subcategory" ("active", "budgetCents", "categoryId", "createdAt", "departmentId", "id", "name", "updatedAt")
SELECT "active", "budgetCents", "categoryId", "createdAt", (SELECT "id" FROM "Department" WHERE "code" = 'general'), "id", "name", "updatedAt" FROM "Subcategory";
DROP TABLE "Subcategory";
ALTER TABLE "new_Subcategory" RENAME TO "Subcategory";
CREATE INDEX "Subcategory_departmentId_idx" ON "Subcategory"("departmentId");
CREATE UNIQUE INDEX "Subcategory_categoryId_name_key" ON "Subcategory"("categoryId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
