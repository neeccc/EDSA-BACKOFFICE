import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * @swagger
 * /backoffice/students/{id}:
 *   get:
 *     summary: Get student detail
 *     description: Get a student's profile, class assignment, and per-book progress
 *     tags: [Backoffice - Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student detail with progress
 *       404:
 *         description: Student not found
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!existing || existing.role !== "STUDENT") {
      return errorResponse("Student not found", 404);
    }

    const student = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        studentClasses: {
          select: { class: { select: { id: true, name: true } } },
        },
      },
    });

    const books = await prisma.book.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        puzzleType: true,
        order: true,
        _count: { select: { pages: true } },
        progress: {
          where: { studentId: id },
          select: { completed: true, score: true, updatedAt: true },
        },
      },
    });

    const bookProgress = books.map((book) => {
      const totalPages = book._count.pages;
      const completedPages = book.progress.filter((p) => p.completed).length;
      const scores = book.progress
        .map((p) => p.score)
        .filter((s): s is number => s !== null);
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

      let lastActivity: Date | null = null;
      for (const p of book.progress) {
        if (!lastActivity || p.updatedAt > lastActivity) {
          lastActivity = p.updatedAt;
        }
      }

      let status: "not_started" | "in_progress" | "completed" = "not_started";
      if (completedPages > 0 && completedPages >= totalPages && totalPages > 0) {
        status = "completed";
      } else if (book.progress.length > 0) {
        status = "in_progress";
      }

      return {
        id: book.id,
        title: book.title,
        puzzleType: book.puzzleType,
        order: book.order,
        totalPages,
        completedPages,
        avgScore,
        lastActivity,
        status,
      };
    });

    const totalBooks = bookProgress.length;
    const booksStarted = bookProgress.filter((b) => b.status !== "not_started").length;
    const booksCompleted = bookProgress.filter((b) => b.status === "completed").length;
    const allScores = bookProgress
      .map((b) => b.avgScore)
      .filter((s): s is number => s !== null);
    const overallAvgScore = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : null;

    return successResponse({
      student,
      stats: {
        totalBooks,
        booksStarted,
        booksCompleted,
        completionRate: totalBooks > 0 ? Math.round((booksCompleted / totalBooks) * 100) : 0,
        avgScore: overallAvgScore,
      },
      bookProgress,
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * @swagger
 * /backoffice/students/{id}:
 *   put:
 *     summary: Update a student
 *     description: Update an existing student's name, email, or password
 *     tags: [Backoffice - Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 description: Leave empty to keep current
 *     responses:
 *       200:
 *         description: Student updated
 *       400:
 *         description: Validation error or duplicate email
 *       404:
 *         description: Student not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email) {
      return errorResponse("Name and email are required");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== "STUDENT") {
      return errorResponse("Student not found", 404);
    }

    const emailConflict = await prisma.user.findFirst({
      where: { email, id: { not: id } },
    });
    if (emailConflict) {
      return errorResponse("A user with this email already exists");
    }

    const data: { name: string; email: string; password?: string } = {
      name,
      email,
    };

    if (password) {
      data.password = await hash(password, 12);
    }

    const student = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        _count: { select: { studentClasses: true } },
      },
    });

    return successResponse(student);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * @swagger
 * /backoffice/students/{id}:
 *   delete:
 *     summary: Delete a student
 *     description: Permanently delete a student account
 *     tags: [Backoffice - Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student deleted
 *       404:
 *         description: Student not found
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== "STUDENT") {
      return errorResponse("Student not found", 404);
    }

    await prisma.user.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
