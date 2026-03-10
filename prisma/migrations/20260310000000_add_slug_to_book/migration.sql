-- AlterTable
ALTER TABLE "Book" ADD COLUMN "slug" TEXT;

-- Backfill existing rows with a slug derived from title
UPDATE "Book" SET "slug" = LOWER(REGEXP_REPLACE(TRIM("title"), '[^a-zA-Z0-9]+', '-', 'g')) WHERE "slug" IS NULL;

-- Make slug NOT NULL and UNIQUE
ALTER TABLE "Book" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Book_slug_key" ON "Book"("slug");
