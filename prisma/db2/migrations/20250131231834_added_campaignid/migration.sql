/*
  Warnings:

  - A unique constraint covering the columns `[campaignId]` on the table `Campaign` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `campaignId` to the `Campaign` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "campaignId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_campaignId_key" ON "Campaign"("campaignId");
