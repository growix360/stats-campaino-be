-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "hasMultiplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "statMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
