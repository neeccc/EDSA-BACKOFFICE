import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * @swagger
 * /backoffice/teachers:
 *   get:
 *     summary: List teachers
 *     description: Returns a list of teachers with optional search and class exclusion filters
 *     tags: [Backoffice - Teachers]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Filter by name or email
 *       - in: query
 *         name: excludeClassId
 *         schema:
 *           type: string
 *         description: Exclude teachers already in this class
 *     responses:
 *       200:
 *         description: List of teachers
 */
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") || "";
    const excludeClassId = request.nextUrl.searchParams.get("excludeClassId");

    const teachers = await prisma.user.findMany({
      where: {
        role: "TEACHER",
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }),
        ...(excludeClassId && {
          teacherClasses: { none: { classId: excludeClassId } },
        }),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        _count: { select: { teacherClasses: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(teachers);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * @swagger
 * /backoffice/teachers:
 *   post:
 *     summary: Create a teacher
 *     description: Create a new teacher account
 *     tags: [Backoffice - Teachers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Teacher created
 *       400:
 *         description: Validation error or duplicate email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, username: rawUsername } = body;

    if (!name || !email || !password) {
      return errorResponse("Name, email, and password are required");
    }

    const username: string =
      typeof rawUsername === "string" && rawUsername.trim().length > 0
        ? rawUsername.trim()
        : email.split("@")[0];

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse("A user with this email already exists");
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return errorResponse("A user with this username already exists");
    }

    const hashedPassword = await hash(password, 12);

    const teacher = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        role: "TEACHER",
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        _count: { select: { teacherClasses: true } },
      },
    });

    return successResponse(teacher, 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
