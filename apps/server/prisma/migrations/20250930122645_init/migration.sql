-- CreateEnum
CREATE TYPE "Role" AS ENUM ('HOST', 'ADMIN', 'CREATOR');

-- CreateEnum
CREATE TYPE "MatchMode" AS ENUM ('NINE_INNINGS', 'BEST_OF_3', 'BEST_OF_5');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('LOBBY', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'HOST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pack" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "meta" JSONB NOT NULL,
    "innings" JSONB NOT NULL,
    "tags" TEXT[],
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isKidsSafe" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "mode" "MatchMode" NOT NULL DEFAULT 'NINE_INNINGS',
    "status" "MatchStatus" NOT NULL DEFAULT 'LOBBY',
    "settings" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchPlayer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT,
    "city" TEXT,
    "socketId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "MatchPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchAnswer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "inningIdx" INTEGER NOT NULL,
    "questionIdx" INTEGER NOT NULL,
    "choice" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answerMs" INTEGER NOT NULL,
    "bonusAwarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT,
    "playerId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Pack_ownerId_idx" ON "Pack"("ownerId");

-- CreateIndex
CREATE INDEX "Pack_isFeatured_idx" ON "Pack"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "Match_joinCode_key" ON "Match"("joinCode");

-- CreateIndex
CREATE INDEX "Match_hostId_idx" ON "Match"("hostId");

-- CreateIndex
CREATE INDEX "Match_joinCode_idx" ON "Match"("joinCode");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "MatchPlayer_matchId_idx" ON "MatchPlayer"("matchId");

-- CreateIndex
CREATE INDEX "MatchPlayer_socketId_idx" ON "MatchPlayer"("socketId");

-- CreateIndex
CREATE INDEX "MatchAnswer_matchId_playerId_idx" ON "MatchAnswer"("matchId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchAnswer_matchId_playerId_inningIdx_questionIdx_key" ON "MatchAnswer"("matchId", "playerId", "inningIdx", "questionIdx");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_matchId_idx" ON "AnalyticsEvent"("matchId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_idx" ON "AnalyticsEvent"("eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAnswer" ADD CONSTRAINT "MatchAnswer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAnswer" ADD CONSTRAINT "MatchAnswer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "MatchPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
