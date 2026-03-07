import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

const PUZZLE_TYPES = ["MATCHING", "ORDERING", "FILL_BLANK", "MULTIPLE_CHOICE"];

/**
 * @swagger
 * /backoffice/books:
 *   get:
 *     summary: List books
 *     description: Returns a list of books with optional search filter
 *     tags: [Backoffice - Books]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Filter by title
 *     responses:
 *       200:
 *         description: List of books
 */
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") || "";

    const books = await prisma.book.findMany({
      where: {
        ...(search && {
          title: { contains: search, mode: "insensitive" as const },
        }),
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
      orderBy: { order: "asc" },
    });

    return successResponse(books);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * @swagger
 * /backoffice/books:
 *   post:
 *     summary: Create a book
 *     description: Create a new book with a puzzle type
 *     tags: [Backoffice - Books]
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
 *       201:
 *         description: Book created
 *       400:
 *         description: Missing required fields or invalid puzzle type
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, puzzleType } = body;

    if (!title || !puzzleType) {
      return errorResponse("Title and puzzle type are required");
    }

    if (!PUZZLE_TYPES.includes(puzzleType)) {
      return errorResponse("Invalid puzzle type");
    }

    // Auto-assign order as max + 1
    const maxOrder = await prisma.book.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? 0) + 1;

    const book = await prisma.book.create({
      data: {
        title,
        description: description || null,
        puzzleType,
        order: nextOrder,
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

    return successResponse(book, 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
