import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * @swagger
 * /backoffice/students:
 *   get:
 *     summary: List students
 *     description: Returns a list of students with optional search, class exclusion, and unassigned filters
 *     tags: [Backoffice - Students]
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
 *         description: Exclude students already in this class
 *       - in: query
 *         name: unassigned
 *         schema:
 *           type: string
 *           enum: ["true"]
 *         description: Only return students not assigned to any class
 *     responses:
 *       200:
 *         description: List of students
 */
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") || "";
    const excludeClassId = request.nextUrl.searchParams.get("excludeClassId");
    const unassigned = request.nextUrl.searchParams.get("unassigned");

    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }),
        ...(excludeClassId &&
          unassigned !== "true" && {
            studentClasses: { none: { classId: excludeClassId } },
          }),
        ...(unassigned === "true" && {
          studentClasses: { none: {} },
        }),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        _count: { select: { studentClasses: true } },
        studentClasses: {
          select: { class: { select: { id: true, name: true } } },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(students);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * @swagger
 * /backoffice/students:
 *   post:
 *     summary: Create a student
 *     description: Create a new student account
 *     tags: [Backoffice - Students]
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
 *         description: Student created
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

    const student = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
        _count: { select: { studentClasses: true } },
      },
    });

    return successResponse(student, 201);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
