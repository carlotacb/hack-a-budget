-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TravelReimbursement" (
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
    "totalCurrencyCode" TEXT NOT NULL DEFAULT 'EUR',
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
INSERT INTO "new_TravelReimbursement" ("approvedAmountCents", "approvedAt", "createdAt", "demoComment", "demoSubmittedAt", "demoUrl", "finalApprovedAt", "finalReviewerId", "hackerId", "id", "initialReviewedAt", "initialReviewerId", "luggagePaid", "luggagePriceCents", "organizerNote", "originCity", "originCountry", "outboundArrivalAt", "outboundArrivalPlace", "outboundCarrier", "outboundDepartureAt", "outboundDeparturePlace", "outboundServiceNumber", "returnArrivalAt", "returnArrivalPlace", "returnCarrier", "returnDepartureAt", "returnDeparturePlace", "returnServiceNumber", "status", "submittedAt", "ticketPath", "totalPriceCents", "transportMode", "updatedAt") SELECT "approvedAmountCents", "approvedAt", "createdAt", "demoComment", "demoSubmittedAt", "demoUrl", "finalApprovedAt", "finalReviewerId", "hackerId", "id", "initialReviewedAt", "initialReviewerId", "luggagePaid", "luggagePriceCents", "organizerNote", "originCity", "originCountry", "outboundArrivalAt", "outboundArrivalPlace", "outboundCarrier", "outboundDepartureAt", "outboundDeparturePlace", "outboundServiceNumber", "returnArrivalAt", "returnArrivalPlace", "returnCarrier", "returnDepartureAt", "returnDeparturePlace", "returnServiceNumber", "status", "submittedAt", "ticketPath", "totalPriceCents", "transportMode", "updatedAt" FROM "TravelReimbursement";
DROP TABLE "TravelReimbursement";
ALTER TABLE "new_TravelReimbursement" RENAME TO "TravelReimbursement";
CREATE UNIQUE INDEX "TravelReimbursement_hackerId_key" ON "TravelReimbursement"("hackerId");
CREATE INDEX "TravelReimbursement_status_submittedAt_idx" ON "TravelReimbursement"("status", "submittedAt");
CREATE INDEX "TravelReimbursement_initialReviewerId_idx" ON "TravelReimbursement"("initialReviewerId");
CREATE INDEX "TravelReimbursement_finalReviewerId_idx" ON "TravelReimbursement"("finalReviewerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
