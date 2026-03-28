-- AlterTable
ALTER TABLE "lendings" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
