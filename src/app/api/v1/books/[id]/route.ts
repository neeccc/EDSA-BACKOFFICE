import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { verifyAuth } from "@/lib/auth";
import { isBookUnlocked } from "@/lib/book-unlock";
import { addCors, OPTIONS as corsOptions } from "@/lib/cors";

export const OPTIONS = corsOptions;

/**
 * @swagger
 * /v1/books/{id}:
 *   get:
 *     summary: Get book details with pages
 *     description: Returns a single book with its pages and the student's per-page progress. Returns 403 if the book is locked.
 *     tags: [Game - Books]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Book with pages and progress
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Book is locked
 *       404:
 *         description: Book not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return addCors(errorResponse("Unauthorized", 401));

    const { id } = await params;

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        puzzleType: true,
        coverImage: true,
        order: true,
        pages: {
          orderBy: { pageNumber: "asc" },
          select: {
            id: true,
            pageNumber: true,
            puzzleData: true,
          },
        },
      },
    });

    if (!book) return addCors(errorResponse("Book not found", 404));

    // Check unlock status
    const unlocked = await isBookUnlocked(book.order, auth.userId);
    if (!unlocked) return addCors(errorResponse("Book is locked", 403));

    // Fetch progress for all pages of this book in one query
    const progressRecords = await prisma.studentProgress.findMany({
      where: { studentId: auth.userId, bookId: id },
      select: {
        pageId: true,
        completed: true,
        score: true,
        data: true,
      },
    });

    const progressMap = new Map(
      progressRecords.map((p) => [p.pageId, p])
    );

    const pages = book.pages.map((page) => {
      const prog = progressMap.get(page.id);
      return {
        id: page.id,
        pageNumber: page.pageNumber,
        puzzleData: page.puzzleData,
        progress: prog
          ? { completed: prog.completed, score: prog.score, data: prog.data }
          : null,
      };
    });

    return addCors(successResponse({
      id: book.id,
      title: book.title,
      slug: book.slug,
      description: book.description,
      puzzleType: book.puzzleType,
      coverImage: book.coverImage,
      order: book.order,
      pages,
    }));
  } catch {
    return addCors(errorResponse("Internal server error", 500));
  }
}
