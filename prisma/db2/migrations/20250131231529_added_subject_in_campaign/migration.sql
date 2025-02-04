/*
  Warnings:

  - Added the required column `subject` to the `Campaign` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "subject" TEXT NOT NULL;
