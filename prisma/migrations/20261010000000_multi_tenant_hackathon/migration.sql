-- DropIndex
DROP INDEX "Category_name_key";

-- DropIndex
DROP INDEX "Department_code_key";

-- DropIndex
DROP INDEX "HackerInvite_usedById_key";

-- DropIndex
DROP INDEX "TravelFinalRequirement_name_key";

-- DropIndex
DROP INDEX "TravelMessageTemplate_name_key";

-- DropIndex
DROP INDEX "TravelReimbursement_hackerId_key";

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "hackathonId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "hackathonId" TEXT NOT NULL;

-- AlterTable
-- "hackathonId" is added nullable first because the pre-multi-tenant
-- "20260926000000_general_department" migration seeded a global,
-- unscoped "General" department row that has no hackathon to backfill to.
-- Departments are now created per-hackathon at registration time, so that
-- orphaned legacy row is removed before the column is made required.
ALTER TABLE "Department" ADD COLUMN     "hackathonId" TEXT;
DELETE FROM "Department" WHERE "hackathonId" IS NULL;
ALTER TABLE "Department" ALTER COLUMN "hackathonId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "hackathonId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Hackathon" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HackerInvite" ADD COLUMN     "hackathonId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TravelEventSettings" ADD COLUMN     "hackathonId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TravelFinalRequirement" ADD COLUMN     "hackathonId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TravelMessageTemplate" ADD COLUMN     "hackathonId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TravelReimbursement" ADD COLUMN     "hackathonId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role";

-- CreateTable
CREATE TABLE "HackathonMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'HACKER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HackathonMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HackathonMembership_hackathonId_idx" ON "HackathonMembership"("hackathonId");

-- CreateIndex
CREATE UNIQUE INDEX "HackathonMembership_userId_hackathonId_key" ON "HackathonMembership"("userId", "hackathonId");

-- CreateIndex
CREATE INDEX "Budget_hackathonId_idx" ON "Budget"("hackathonId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_hackathonId_name_key" ON "Category"("hackathonId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_hackathonId_code_key" ON "Department"("hackathonId", "code");

-- CreateIndex
CREATE INDEX "Expense_hackathonId_idx" ON "Expense"("hackathonId");

-- CreateIndex
CREATE INDEX "HackerInvite_hackathonId_idx" ON "HackerInvite"("hackathonId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelEventSettings_hackathonId_key" ON "TravelEventSettings"("hackathonId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelFinalRequirement_hackathonId_name_key" ON "TravelFinalRequirement"("hackathonId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TravelMessageTemplate_hackathonId_name_key" ON "TravelMessageTemplate"("hackathonId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TravelReimbursement_hackathonId_hackerId_key" ON "TravelReimbursement"("hackathonId", "hackerId");

-- AddForeignKey
ALTER TABLE "HackathonMembership" ADD CONSTRAINT "HackathonMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HackathonMembership" ADD CONSTRAINT "HackathonMembership_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelReimbursement" ADD CONSTRAINT "TravelReimbursement_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HackerInvite" ADD CONSTRAINT "HackerInvite_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelEventSettings" ADD CONSTRAINT "TravelEventSettings_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelMessageTemplate" ADD CONSTRAINT "TravelMessageTemplate_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelFinalRequirement" ADD CONSTRAINT "TravelFinalRequirement_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

