import { prisma } from "@/lib/prisma";

/**
 * Check if a book is unlocked for a student.
 * The first book (lowest order) is always unlocked.
 * Subsequent books require all pages of the previous book to be completed.
 */
export async function isBookUnlocked(
  bookOrder: number,
  studentId: string
): Promise<boolean> {
  // Find the previous book (highest order less than this one)
  const previousBook = await prisma.book.findFirst({
    where: { order: { lt: bookOrder } },
    orderBy: { order: "desc" },
    select: { id: true },
  });

  // No previous book means this is the first — always unlocked
  if (!previousBook) return true;

  // Count only story pages (pageNumber > 0), exclude cover page
  const storyPageCount = await prisma.page.count({
    where: { bookId: previousBook.id, pageNumber: { gt: 0 } },
  });

  if (storyPageCount === 0) return true;

  // Count completed story pages for the previous book
  const completedCount = await prisma.studentProgress.count({
    where: {
      studentId,
      bookId: previousBook.id,
      completed: true,
      page: { pageNumber: { gt: 0 } },
    },
  });

  return completedCount >= storyPageCount;
}
