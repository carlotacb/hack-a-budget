-- CreateEnum
CREATE TYPE "Role" AS ENUM ('HACKER', 'ORGANIZER', 'DIRECTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('WOMAN', 'MAN', 'NON_BINARY', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('BUS', 'TRAIN', 'AIRPLANE');

-- CreateEnum
CREATE TYPE "TravelReimbursementStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'APPROVED', 'FINAL_REVIEW', 'FINAL_APPROVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'HACKER',
    "gender" "Gender",
    "city" TEXT,
    "major" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "incurredAt" TIMESTAMP(3) NOT NULL,
    "vendor" TEXT,
    "ticketPath" TEXT,
    "organizerId" TEXT NOT NULL,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "budgetCents" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "budgetCents" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelReimbursement" (
    "id" TEXT NOT NULL,
    "hackerId" TEXT NOT NULL,
    "status" "TravelReimbursementStatus" NOT NULL DEFAULT 'DRAFT',
    "originCity" TEXT NOT NULL,
    "originCountry" TEXT NOT NULL,
    "transportMode" "TransportMode" NOT NULL,
    "outboundDepartureAt" TIMESTAMP(3) NOT NULL,
    "outboundDeparturePlace" TEXT NOT NULL,
    "outboundArrivalAt" TIMESTAMP(3) NOT NULL,
    "outboundArrivalPlace" TEXT NOT NULL,
    "outboundCarrier" TEXT NOT NULL,
    "outboundServiceNumber" TEXT,
    "returnDepartureAt" TIMESTAMP(3) NOT NULL,
    "returnDeparturePlace" TEXT NOT NULL,
    "returnArrivalAt" TIMESTAMP(3) NOT NULL,
    "returnArrivalPlace" TEXT NOT NULL,
    "returnCarrier" TEXT NOT NULL,
    "returnServiceNumber" TEXT,
    "totalPriceCents" INTEGER NOT NULL,
    "totalCurrencyCode" TEXT NOT NULL DEFAULT 'EUR',
    "luggagePaid" BOOLEAN NOT NULL DEFAULT false,
    "luggagePriceCents" INTEGER,
    "ticketPath" TEXT NOT NULL,
    "organizerNote" TEXT,
    "approvedAmountCents" INTEGER,
    "submittedAt" TIMESTAMP(3),
    "initialReviewedAt" TIMESTAMP(3),
    "initialReviewerId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "demoUrl" TEXT,
    "demoComment" TEXT,
    "demoSubmittedAt" TIMESTAMP(3),
    "finalReviewerId" TEXT,
    "finalApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelReimbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelStatusEvent" (
    "id" TEXT NOT NULL,
    "reimbursementId" TEXT NOT NULL,
    "fromStatus" "TravelReimbursementStatus",
    "toStatus" "TravelReimbursementStatus" NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelEventSettings" (
    "id" TEXT NOT NULL DEFAULT 'event',
    "hackathonStartAt" TIMESTAMP(3),
    "reimbursementInstructions" TEXT NOT NULL DEFAULT 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    "finalReviewInstructions" TEXT NOT NULL DEFAULT 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelEventSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelMessageTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelMessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelFinalRequirement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelFinalRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelRequirementCheck" (
    "reimbursementId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3),
    "checkedById" TEXT,

    CONSTRAINT "TravelRequirementCheck_pkey" PRIMARY KEY ("reimbursementId","requirementId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Expense_organizerId_incurredAt_idx" ON "Expense"("organizerId", "incurredAt");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Expense_subcategoryId_idx" ON "Expense"("subcategoryId");

-- CreateIndex
CREATE INDEX "Expense_departmentId_idx" ON "Expense"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Subcategory_departmentId_idx" ON "Subcategory"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategory_categoryId_name_key" ON "Subcategory"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TravelReimbursement_hackerId_key" ON "TravelReimbursement"("hackerId");

-- CreateIndex
CREATE INDEX "TravelReimbursement_status_submittedAt_idx" ON "TravelReimbursement"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "TravelReimbursement_initialReviewerId_idx" ON "TravelReimbursement"("initialReviewerId");

-- CreateIndex
CREATE INDEX "TravelReimbursement_finalReviewerId_idx" ON "TravelReimbursement"("finalReviewerId");

-- CreateIndex
CREATE INDEX "TravelStatusEvent_reimbursementId_createdAt_idx" ON "TravelStatusEvent"("reimbursementId", "createdAt");

-- CreateIndex
CREATE INDEX "TravelStatusEvent_actorId_idx" ON "TravelStatusEvent"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelMessageTemplate_name_key" ON "TravelMessageTemplate"("name");

-- CreateIndex
CREATE INDEX "TravelMessageTemplate_active_idx" ON "TravelMessageTemplate"("active");

-- CreateIndex
CREATE UNIQUE INDEX "TravelFinalRequirement_name_key" ON "TravelFinalRequirement"("name");

-- CreateIndex
CREATE INDEX "TravelRequirementCheck_requirementId_idx" ON "TravelRequirementCheck"("requirementId");

-- CreateIndex
CREATE INDEX "TravelRequirementCheck_checkedById_idx" ON "TravelRequirementCheck"("checkedById");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelReimbursement" ADD CONSTRAINT "TravelReimbursement_hackerId_fkey" FOREIGN KEY ("hackerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelReimbursement" ADD CONSTRAINT "TravelReimbursement_initialReviewerId_fkey" FOREIGN KEY ("initialReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelReimbursement" ADD CONSTRAINT "TravelReimbursement_finalReviewerId_fkey" FOREIGN KEY ("finalReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelStatusEvent" ADD CONSTRAINT "TravelStatusEvent_reimbursementId_fkey" FOREIGN KEY ("reimbursementId") REFERENCES "TravelReimbursement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelStatusEvent" ADD CONSTRAINT "TravelStatusEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequirementCheck" ADD CONSTRAINT "TravelRequirementCheck_reimbursementId_fkey" FOREIGN KEY ("reimbursementId") REFERENCES "TravelReimbursement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequirementCheck" ADD CONSTRAINT "TravelRequirementCheck_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "TravelFinalRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequirementCheck" ADD CONSTRAINT "TravelRequirementCheck_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

