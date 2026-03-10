import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { verifyAuth } from "@/lib/auth";
import { addCors, OPTIONS as corsOptions } from "@/lib/cors";

export const OPTIONS = corsOptions;

/**
 * @swagger
 * /v1/books:
 *   get:
 *     summary: List all books with unlock status
 *     description: Returns all books ordered by sequence, with page counts, completion progress, and unlock status for the authenticated student
 *     tags: [Game - Books]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of books with unlock status
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return addCors(errorResponse("Unauthorized", 401));

    // Query 1: all books with page counts
    const books = await prisma.book.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        puzzleType: true,
        coverImage: true,
        order: true,
        _count: { select: { pages: true } },
      },
    });

    // Query 2: completed page counts grouped by book for this student
    const progressByBook = await prisma.studentProgress.groupBy({
      by: ["bookId"],
      where: { studentId: auth.userId, completed: true },
      _count: { id: true },
    });

    const completedMap = new Map(
      progressByBook.map((p) => [p.bookId, p._count.id])
    );

    // Walk sequentially to compute unlock status
    const result = books.map((book, index) => {
      const pageCount = book._count.pages;
      const completedPages = completedMap.get(book.id) || 0;

      let unlocked: boolean;
      if (index === 0) {
        // First book is always unlocked
        unlocked = true;
      } else {
        // Check if previous book is fully completed
        const prev = books[index - 1];
        const prevPageCount = prev._count.pages;
        const prevCompleted = completedMap.get(prev.id) || 0;
        unlocked = prevPageCount === 0 || prevCompleted >= prevPageCount;
      }

      return {
        id: book.id,
        title: book.title,
        slug: book.slug,
        description: book.description,
        puzzleType: book.puzzleType,
        coverImage: book.coverImage,
        order: book.order,
        pageCount,
        completedPages,
        unlocked,
      };
    });

    return addCors(successResponse(result));
  } catch {
    return addCors(errorResponse("Internal server error", 500));
  }
}
