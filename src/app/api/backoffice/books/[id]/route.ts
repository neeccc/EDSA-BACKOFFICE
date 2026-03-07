import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

const PUZZLE_TYPES = ["MATCHING", "ORDERING", "FILL_BLANK", "MULTIPLE_CHOICE"];

/**
 * @swagger
 * /backoffice/books/{id}:
 *   put:
 *     summary: Update a book
 *     description: Update an existing book's title, description, or puzzle type
 *     tags: [Backoffice - Books]
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
 *             required: [title, puzzleType]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               puzzleType:
 *                 type: string
 *                 enum: [MATCHING, ORDERING, FILL_BLANK, MULTIPLE_CHOICE]
 *     responses:
 *       200:
 *         description: Book updated
 *       400:
 *         description: Missing required fields or invalid puzzle type
 *       404:
 *         description: Book not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, puzzleType, order } = body;

    if (!title || !puzzleType) {
      return errorResponse("Title and puzzle type are required");
    }

    if (!PUZZLE_TYPES.includes(puzzleType)) {
      return errorResponse("Invalid puzzle type");
    }

    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Book not found", 404);
    }

    const book = await prisma.book.update({
      where: { id },
      data: {
        title,
        description: description || null,
        puzzleType,
        ...(order !== undefined && { order }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        puzzleType: true,
        order: true,
        createdAt: true,
        _count: { select: { pages: true } },
      },
    });

    return successResponse(book);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * @swagger
 * /backoffice/books/{id}:
 *   delete:
 *     summary: Delete a book
 *     description: Permanently delete a book and all its pages and progress
 *     tags: [Backoffice - Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book deleted
 *       404:
 *         description: Book not found
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Book not found", 404);
    }

    await prisma.book.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
