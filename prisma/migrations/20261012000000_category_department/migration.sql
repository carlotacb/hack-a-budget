-- Move departmentId from Subcategory up to Category, so all of a
-- category's subcategories inherit a single department.

-- 1. Add the new column as nullable so we can backfill existing rows.
ALTER TABLE "Category" ADD COLUMN "departmentId" TEXT;

-- 2. Backfill each category's departmentId from one of its existing
--    subcategories (first by id).
UPDATE "Category" c
SET "departmentId" = sub."departmentId"
FROM (
  SELECT DISTINCT ON ("categoryId") "categoryId", "departmentId"
  FROM "Subcategory"
  ORDER BY "categoryId", "id"
) sub
WHERE sub."categoryId" = c."id";

-- 3. Any category with no subcategories (e.g. "Unexpected expenses")
--    falls back to its hackathon's General department, creating it if
--    it doesn't exist yet.
INSERT INTO "Department" ("id", "code", "name", "hackathonId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'general', 'General', c."hackathonId", NOW(), NOW()
FROM "Category" c
WHERE c."departmentId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Department" d
    WHERE d."hackathonId" = c."hackathonId" AND d."code" = 'general'
  )
GROUP BY c."hackathonId";

UPDATE "Category" c
SET "departmentId" = d."id"
FROM "Department" d
WHERE c."departmentId" IS NULL
  AND d."hackathonId" = c."hackathonId"
  AND d."code" = 'general';

-- 4. Enforce NOT NULL + foreign key + index now that every row is set.
ALTER TABLE "Category" ALTER COLUMN "departmentId" SET NOT NULL;

ALTER TABLE "Category" ADD CONSTRAINT "Category_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Category_departmentId_idx" ON "Category"("departmentId");

-- 5. Drop the old per-subcategory department relation.
ALTER TABLE "Subcategory" DROP CONSTRAINT "Subcategory_departmentId_fkey";
DROP INDEX "Subcategory_departmentId_idx";
ALTER TABLE "Subcategory" DROP COLUMN "departmentId";
