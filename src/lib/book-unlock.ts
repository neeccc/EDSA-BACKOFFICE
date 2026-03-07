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
    select: {
      id: true,
      _count: { select: { pages: true } },
    },
  });

  // No previous book means this is the first — always unlocked
  if (!previousBook) return true;

  // If previous book has no pages, consider it complete
  if (previousBook._count.pages === 0) return true;

  // Count completed pages for the previous book
  const completedCount = await prisma.studentProgress.count({
    where: {
      studentId,
      bookId: previousBook.id,
      completed: true,
    },
  });

  return completedCount >= previousBook._count.pages;
}
