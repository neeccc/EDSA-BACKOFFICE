import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * DELETE /api/backoffice/students/[id]/progress?bookId=xxx
 * Deletes progress for a student. If bookId is provided, only that book's progress is deleted.
 * Otherwise all progress for the student is deleted.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookId = request.nextUrl.searchParams.get("bookId");

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!existing || existing.role !== "STUDENT") {
      return errorResponse("Student not found", 404);
    }

    const where: { studentId: string; bookId?: string } = { studentId: id };
    if (bookId) {
      where.bookId = bookId;
    }

    const result = await prisma.studentProgress.deleteMany({ where });

    return successResponse({ deleted: result.count });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
