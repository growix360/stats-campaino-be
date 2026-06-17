-- Sync DB1 schema with main campaino-mailchimp backend

DROP INDEX IF EXISTS "Campaign_selzyCampaignId_key";

ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "selzyCampaignId";
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "ctaText" TEXT NOT NULL DEFAULT 'Click Here';

ALTER TABLE "EmailList" DROP COLUMN IF EXISTS "selzyListId";

ALTER TABLE "Email" DROP COLUMN IF EXISTS "selzyCampaignId";

ALTER TABLE "Template" DROP COLUMN IF EXISTS "selzyTemplateId";
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "providerTemplateId" TEXT;

ALTER TABLE "Links" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
