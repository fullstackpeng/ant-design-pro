-- AlterTable
ALTER TABLE "app_files" ADD COLUMN "visibility" VARCHAR(20) NOT NULL DEFAULT 'private';

-- Site images are platform-owned and explicitly public; tenant files remain private.
CREATE INDEX "app_files_visibility_idx" ON "app_files"("visibility") WHERE "visibility" = 'public';
