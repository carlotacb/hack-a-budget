-- Links expenses to the budget plan they were logged against, so
-- dashboards can report spend per budget (including past/inactive ones).
ALTER TABLE "Expense" ADD COLUMN "budgetId" TEXT;

-- Best-effort backfill: attribute existing expenses to whichever budget is
-- currently active for their hackathon (there's no historical record of
-- which budget was active when each expense was created).
UPDATE "Expense" e
SET "budgetId" = b.id
FROM "Budget" b
WHERE b."hackathonId" = e."hackathonId"
  AND b."isActive" = true
  AND e."budgetId" IS NULL;

CREATE INDEX "Expense_budgetId_idx" ON "Expense"("budgetId");

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_budgetId_fkey"
  FOREIGN KEY ("budgetId") REFERENCES "Budget"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
