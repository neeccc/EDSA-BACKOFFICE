import { prisma } from "@/lib/prisma";

/**
 * Check if a book is unlocked for a student.
 * A book is unlocked if:
 * 1. It's the first book (lowest order) — always unlocked
 * 2. All story pages of the previous book are completed (auto unlock)
 * 3. A manual BookUnlock record exists for this student+book
 */
export async function isBookUnlocked(
  bookOrder: number,
  studentId: string,
  bookId?: string
): Promise<boolean> {
  // Check manual unlock first (if bookId is provided)
  if (bookId) {
    const manualUnlock = await prisma.bookUnlock.findUnique({
      where: { studentId_bookId: { studentId, bookId } },
    });
    if (manualUnlock) return true;
  }

  // Find the previous book (highest order less than this one)
  const previousBook = await prisma.book.findFirst({
    where: { order: { lt: bookOrder } },
    orderBy: { order: "desc" },
    select: { id: true },
  });

  // No previous book means this is the first — always unlocked
  if (!previousBook) return true;

  // Count only story pages (pageNumber > 0), exclude cover (0) and assessment (9999)
  const storyPageCount = await prisma.page.count({
    where: { bookId: previousBook.id, pageNumber: { gt: 0, lt: 9999 } },
  });

  if (storyPageCount === 0) return true;

  // Count completed story pages for the previous book
  const completedCount = await prisma.studentProgress.count({
    where: {
      studentId,
      bookId: previousBook.id,
      completed: true,
      page: { pageNumber: { gt: 0, lt: 9999 } },
    },
  });

  return completedCount >= storyPageCount;
}
