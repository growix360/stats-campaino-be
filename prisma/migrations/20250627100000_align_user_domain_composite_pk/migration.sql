-- Align UserDomain with main Campaino backend (composite PK on userId + domainId).
-- No-op when the table already matches main-backend shape (no "id" column).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'UserDomain'
      AND column_name = 'id'
  ) THEN
    ALTER TABLE "UserDomain" DROP CONSTRAINT IF EXISTS "UserDomain_pkey";
    DROP INDEX IF EXISTS "UserDomain_userId_domainId_key";
    ALTER TABLE "UserDomain" DROP COLUMN "id";
    ALTER TABLE "UserDomain" ADD CONSTRAINT "UserDomain_pkey" PRIMARY KEY ("userId", "domainId");
  END IF;
END $$;
