-- Sessions are JWT-based (invalidated via User.sessionVersion); this table was never used.
-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropTable
DROP TABLE "Session";
