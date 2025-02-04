/*
  Warnings:

  - You are about to drop the column `createdByUser` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `Links` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Links" DROP CONSTRAINT "Links_campaignId_fkey";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "createdByUser";

-- AlterTable
ALTER TABLE "Links" DROP COLUMN "campaignId";
