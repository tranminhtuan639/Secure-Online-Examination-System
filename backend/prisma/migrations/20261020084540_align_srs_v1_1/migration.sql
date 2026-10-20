/*
  Warnings:

  - The values [DRAFT,PUBLISHED,LOCKED] on the enum `ExamStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [TEACHER,ADMIN] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `secure_mode` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `shuffle` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `tag` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `family_id` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `role_codes` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `role_codes` table. All the data in the column will be lost.
  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('WEB', 'DESKTOP');

-- CreateEnum
CREATE TYPE "ExamEventType" AS ENUM ('ATTEMPT_STARTED', 'ATTEMPT_SUBMITTED', 'ATTEMPT_EXPIRED', 'SECURE_MODE_ENTER', 'FOCUS_LOST', 'FOCUS_GAINED', 'SECURE_MODE_EXIT', 'WINDOW_CLOSE_REQUESTED');

-- Drop this column before replacing Role; it still depends on the old enum type.
ALTER TABLE "role_codes" DROP COLUMN "role";

-- AlterEnum
BEGIN;
CREATE TYPE "ExamStatus_new" AS ENUM ('ACTIVE', 'CLOSED');
ALTER TABLE "public"."exams" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "exams" ALTER COLUMN "status" TYPE "ExamStatus_new" USING ("status"::text::"ExamStatus_new");
ALTER TYPE "ExamStatus" RENAME TO "ExamStatus_old";
ALTER TYPE "ExamStatus_new" RENAME TO "ExamStatus";
DROP TYPE "public"."ExamStatus_old";
ALTER TABLE "exams" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('STUDENT', 'LECTURER');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'STUDENT';
COMMIT;

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "role_codes" DROP CONSTRAINT "role_codes_created_by_fkey";

-- DropIndex
DROP INDEX "refresh_tokens_family_id_idx";

-- AlterTable
ALTER TABLE "attempts" ADD COLUMN     "client" "ClientType";

-- AlterTable
ALTER TABLE "exams" DROP COLUMN "secure_mode",
DROP COLUMN "shuffle",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "tag";

-- AlterTable
ALTER TABLE "refresh_tokens" DROP COLUMN "family_id";

-- AlterTable
ALTER TABLE "role_codes" DROP COLUMN "created_by";

-- DropTable
DROP TABLE "audit_logs";

-- CreateTable
CREATE TABLE "exam_events" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "type" "ExamEventType" NOT NULL,
    "client_occurred_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "exam_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_events_attempt_id_received_at_idx" ON "exam_events"("attempt_id", "received_at");

-- CreateIndex
CREATE INDEX "attempts_status_deadline_idx" ON "attempts"("status", "deadline");

-- AddForeignKey
ALTER TABLE "exam_events" ADD CONSTRAINT "exam_events_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
