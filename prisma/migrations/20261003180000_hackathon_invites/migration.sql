-- CreateTable
CREATE TABLE "Hackathon" (
    "id" TEXT NOT NULL DEFAULT 'hackathon',
    "name" TEXT NOT NULL,
    "travelReimbursementEnabled" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hackathon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HackerInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HackerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HackerInvite_token_key" ON "HackerInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "HackerInvite_usedById_key" ON "HackerInvite"("usedById");

-- CreateIndex
CREATE INDEX "HackerInvite_createdById_idx" ON "HackerInvite"("createdById");
