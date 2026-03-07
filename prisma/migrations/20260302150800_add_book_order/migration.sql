-- AlterTable: add nullable order column
ALTER TABLE "Book" ADD COLUMN "order" INTEGER;

-- Backfill existing rows with sequential order based on createdAt
UPDATE "Book" SET "order" = sub.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM "Book"
) AS sub
WHERE "Book"."id" = sub."id";

-- Make order NOT NULL
ALTER TABLE "Book" ALTER COLUMN "order" SET NOT NULL;

-- Add unique constraint
CREATE UNIQUE INDEX "Book_order_key" ON "Book"("order");
