-- AlterTable
ALTER TABLE "CampaignUpdateHistory" ADD COLUMN IF NOT EXISTS "sent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CampaignUpdateHistory" ADD COLUMN IF NOT EXISTS "totalOpens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CampaignUpdateHistory" ADD COLUMN IF NOT EXISTS "totalClicks" INTEGER NOT NULL DEFAULT 0;

-- Migrate legacy columns when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'CampaignUpdateHistory' AND column_name = 'opens'
  ) THEN
    UPDATE "CampaignUpdateHistory"
    SET "totalOpens" = COALESCE("opens", 0)
    WHERE "totalOpens" = 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'CampaignUpdateHistory' AND column_name = 'clicks'
  ) THEN
    UPDATE "CampaignUpdateHistory"
    SET "totalClicks" = COALESCE("clicks", 0)
    WHERE "totalClicks" = 0;
  END IF;
END $$;

ALTER TABLE "CampaignUpdateHistory" DROP COLUMN IF EXISTS "opens";
ALTER TABLE "CampaignUpdateHistory" DROP COLUMN IF EXISTS "clicks";
