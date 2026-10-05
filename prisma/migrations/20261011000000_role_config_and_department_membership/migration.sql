-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ORGANIZER_LEAD';

-- AlterTable
ALTER TABLE "HackathonMembership" ADD COLUMN     "departmentId" TEXT;

-- CreateIndex
CREATE INDEX "HackathonMembership_departmentId_idx" ON "HackathonMembership"("departmentId");

-- AddForeignKey
ALTER TABLE "HackathonMembership" ADD CONSTRAINT "HackathonMembership_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
