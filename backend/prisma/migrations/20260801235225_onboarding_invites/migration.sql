-- AlterTable
ALTER TABLE "users" ADD COLUMN     "invite_token" TEXT,
ADD COLUMN     "invite_token_expires_at" TIMESTAMP(3),
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_invite_token_key" ON "users"("invite_token");

