-- AlterTable
ALTER TABLE "GroupPost" ADD COLUMN     "payloadJson" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'text';

