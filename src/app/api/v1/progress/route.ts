import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { verifyAuth } from "@/lib/auth";
import { isBookUnlocked } from "@/lib/book-unlock";
import { addCors, OPTIONS as corsOptions } from "@/lib/cors";

export const OPTIONS = corsOptions;

/**
 * @swagger
 * /v1/progress:
 *   get:
 *     summary: Get student progress
 *     description: Returns progress records for the authenticated student, optionally filtered by book
 *     tags: [Game - Progress]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bookId
 *         schema:
 *           type: string
 *         description: Filter by book ID
 *     responses:
 *       200:
 *         description: Student progress records
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return addCors(errorResponse("Unauthorized", 401));

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

    const where: { studentId: string; bookId?: string } = {
      studentId: auth.userId,
    };
    if (bookId) where.bookId = bookId;

    const progress = await prisma.studentProgress.findMany({
      where,
      include: { book: true, page: true },
      orderBy: { updatedAt: "desc" },
    });

    return addCors(successResponse(progress));
  } catch {
    return addCors(errorResponse("Internal server error", 500));
  }
}

/**
 * @swagger
 * /v1/progress:
 *   post:
 *     summary: Submit page progress
 *     description: Create or update progress for a specific page. The book must be unlocked for the student.
 *     tags: [Game - Progress]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pageId, completed]
 *             properties:
 *               pageId:
 *                 type: string
 *               completed:
 *                 type: boolean
 *               score:
 *                 type: integer
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Progress saved
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Book is locked
 *       404:
 *         description: Page not found
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return addCors(errorResponse("Unauthorized", 401));

    const body = await request.json();
    const { pageId, completed, score, data } = body;

    if (!pageId || typeof completed !== "boolean") {
      return addCors(errorResponse("pageId and completed (boolean) are required"));
    }

    // Validate page exists and get its book
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: {
        id: true,
        bookId: true,
        book: { select: { order: true } },
      },
    });

    if (!page) return addCors(errorResponse("Page not found", 404));

    // Check if book is unlocked
    const unlocked = await isBookUnlocked(page.book.order, auth.userId);
    if (!unlocked) return addCors(errorResponse("Book is locked", 403));

    // Upsert progress
    const progress = await prisma.studentProgress.upsert({
      where: {
        studentId_pageId: {
          studentId: auth.userId,
          pageId,
        },
      },
      create: {
        studentId: auth.userId,
        bookId: page.bookId,
        pageId,
        completed,
        score: score ?? null,
        data: data ?? null,
      },
      update: {
        completed,
        ...(score !== undefined && { score }),
        ...(data !== undefined && { data }),
      },
    });

    return addCors(successResponse(progress));
  } catch {
    return addCors(errorResponse("Internal server error", 500));
  }
}
