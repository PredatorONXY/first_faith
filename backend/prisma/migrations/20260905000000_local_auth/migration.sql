-- Replace the legacy external-auth identity with backend-managed credentials.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

DROP INDEX IF EXISTS "User_supabaseAuthId_key";
ALTER TABLE "User" DROP COLUMN "supabaseAuthId";