-- Sync DB1 schema with main Campaino Selzy backend (Domain / UserDomain / domainId)

CREATE TABLE IF NOT EXISTS "Domain" (
  "id" TEXT NOT NULL,
  "fromEmail" TEXT NOT NULL,
  "fromName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Domain_fromEmail_idx" ON "Domain"("fromEmail");

CREATE TABLE IF NOT EXISTS "UserDomain" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "domainId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserDomain_userId_domainId_key" ON "UserDomain"("userId", "domainId");
CREATE INDEX IF NOT EXISTS "UserDomain_userId_idx" ON "UserDomain"("userId");
CREATE INDEX IF NOT EXISTS "UserDomain_domainId_idx" ON "UserDomain"("domainId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserDomain_userId_fkey'
  ) THEN
    ALTER TABLE "UserDomain"
      ADD CONSTRAINT "UserDomain_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserDomain_domainId_fkey'
  ) THEN
    ALTER TABLE "UserDomain"
      ADD CONSTRAINT "UserDomain_domainId_fkey"
      FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "domainId" TEXT;
CREATE INDEX IF NOT EXISTS "Campaign_domainId_idx" ON "Campaign"("domainId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Campaign_domainId_fkey'
  ) THEN
    ALTER TABLE "Campaign"
      ADD CONSTRAINT "Campaign_domainId_fkey"
      FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
