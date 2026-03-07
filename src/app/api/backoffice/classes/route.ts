import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * @swagger
 * /backoffice/classes:
 *   get:
 *     summary: List classes
 *     description: Returns a list of classes with optional search and member exclusion filters
 *     tags: [Backoffice - Classes]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Filter by class name
 *       - in: query
 *         name: excludeTeacherId
 *         schema:
 *           type: string
 *         description: Exclude classes this teacher is already in
 *       - in: query
 *         name: excludeStudentId
 *         schema:
 *           type: string
 *         description: Exclude classes this student is already in
 *     responses:
 *       200:
 *         description: List of classes
 */
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") || "";
    const excludeTeacherId =
      request.nextUrl.searchParams.get("excludeTeacherId");
    const excludeStudentId =
      request.nextUrl.searchParams.get("excludeStudentId");

    const classes = await prisma.class.findMany({
      where: {
        ...(search && {
          name: { contains: search, mode: "insensitive" as const },
        }),
        ...(excludeTeacherId && {
          teachers: { none: { userId: excludeTeacherId } },
        }),
        ...(excludeStudentId && {
          students: { none: { userId: excludeStudentId } },
        }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: { select: { teachers: true, students: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(classes);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * @swagger
 * /backoffice/classes:
 *   post:
 *     summary: Create a class
 *     description: Create a new class
 *     tags: [Backoffice - Classes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Class created
 *       400:
 *         description: Name is required
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return errorResponse("Name is required");
    }

    const cls = await prisma.class.create({
      data: { name, description: description || null },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: { select: { teachers: true, students: true } },
      },
    });

    return successResponse(cls, 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
