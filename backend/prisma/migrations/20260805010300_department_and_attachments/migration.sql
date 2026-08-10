-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "attachment_name" TEXT,
ADD COLUMN     "attachment_path" TEXT,
ADD COLUMN     "attachment_uploaded_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "department" TEXT;

