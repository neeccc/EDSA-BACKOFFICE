import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * GET /api/backoffice/students/[id]/unlocks
 * Returns all manual book unlocks for a student.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const unlocks = await prisma.bookUnlock.findMany({
      where: { studentId: id },
      select: { bookId: true },
    });

    return successResponse(unlocks.map((u) => u.bookId));
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/backoffice/students/[id]/unlocks
 * Manually unlock books for a student.
 * Body: { bookIds: string[] } — unlock specific books
 *        { all: true }        — unlock all books
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!existing || existing.role !== "STUDENT") {
      return errorResponse("Student not found", 404);
    }

    let bookIds: string[];

    if (body.all) {
      const books = await prisma.book.findMany({ select: { id: true } });
      bookIds = books.map((b) => b.id);
    } else if (Array.isArray(body.bookIds) && body.bookIds.length > 0) {
      bookIds = body.bookIds;
    } else {
      return errorResponse("bookIds array or all:true is required");
    }

    // Upsert unlocks (skip existing ones)
    await prisma.$transaction(
      bookIds.map((bookId) =>
        prisma.bookUnlock.upsert({
          where: { studentId_bookId: { studentId: id, bookId } },
          create: { studentId: id, bookId },
          update: {},
        })
      )
    );

    return successResponse({ unlocked: bookIds.length });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * DELETE /api/backoffice/students/[id]/unlocks?bookId=xxx
 * Remove manual unlock for a specific book.
 * If no bookId, removes all manual unlocks.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookId = request.nextUrl.searchParams.get("bookId");

    const where: { studentId: string; bookId?: string } = { studentId: id };
    if (bookId) {
      where.bookId = bookId;
    }

    const result = await prisma.bookUnlock.deleteMany({ where });

    return successResponse({ removed: result.count });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
