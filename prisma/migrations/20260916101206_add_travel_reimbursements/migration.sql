-- CreateTable
CREATE TABLE "TravelReimbursement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hackerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "originCity" TEXT NOT NULL,
    "originCountry" TEXT NOT NULL,
    "transportMode" TEXT NOT NULL,
    "outboundDepartureAt" DATETIME NOT NULL,
    "outboundDeparturePlace" TEXT NOT NULL,
    "outboundArrivalAt" DATETIME NOT NULL,
    "outboundArrivalPlace" TEXT NOT NULL,
    "outboundCarrier" TEXT NOT NULL,
    "outboundServiceNumber" TEXT,
    "returnDepartureAt" DATETIME NOT NULL,
    "returnDeparturePlace" TEXT NOT NULL,
    "returnArrivalAt" DATETIME NOT NULL,
    "returnArrivalPlace" TEXT NOT NULL,
    "returnCarrier" TEXT NOT NULL,
    "returnServiceNumber" TEXT,
    "totalPriceCents" INTEGER NOT NULL,
    "luggagePaid" BOOLEAN NOT NULL DEFAULT false,
    "luggagePriceCents" INTEGER,
    "ticketPath" TEXT NOT NULL,
    "organizerNote" TEXT,
    "approvedAmountCents" INTEGER,
    "submittedAt" DATETIME,
    "initialReviewedAt" DATETIME,
    "initialReviewerId" TEXT,
    "approvedAt" DATETIME,
    "demoUrl" TEXT,
    "demoComment" TEXT,
    "demoSubmittedAt" DATETIME,
    "finalReviewerId" TEXT,
    "finalApprovedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TravelReimbursement_hackerId_fkey" FOREIGN KEY ("hackerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TravelReimbursement_initialReviewerId_fkey" FOREIGN KEY ("initialReviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TravelReimbursement_finalReviewerId_fkey" FOREIGN KEY ("finalReviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TravelStatusEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reimbursementId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TravelStatusEvent_reimbursementId_fkey" FOREIGN KEY ("reimbursementId") REFERENCES "TravelReimbursement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TravelStatusEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TravelEventSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'event',
    "hackathonStartAt" DATETIME,
    "reimbursementInstructions" TEXT NOT NULL DEFAULT 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    "finalReviewInstructions" TEXT NOT NULL DEFAULT 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TravelFinalRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TravelRequirementCheck" (
    "reimbursementId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" DATETIME,
    "checkedById" TEXT,

    PRIMARY KEY ("reimbursementId", "requirementId"),
    CONSTRAINT "TravelRequirementCheck_reimbursementId_fkey" FOREIGN KEY ("reimbursementId") REFERENCES "TravelReimbursement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TravelRequirementCheck_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "TravelFinalRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TravelRequirementCheck_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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
CREATE UNIQUE INDEX "TravelFinalRequirement_name_key" ON "TravelFinalRequirement"("name");

-- CreateIndex
CREATE INDEX "TravelRequirementCheck_requirementId_idx" ON "TravelRequirementCheck"("requirementId");

-- CreateIndex
CREATE INDEX "TravelRequirementCheck_checkedById_idx" ON "TravelRequirementCheck"("checkedById");
