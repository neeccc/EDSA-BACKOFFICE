import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * @swagger
 * /backoffice/classes/{id}/members:
 *   get:
 *     summary: List class members
 *     description: Returns all teachers and students assigned to a class
 *     tags: [Backoffice - Classes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Class ID
 *     responses:
 *       200:
 *         description: Object with teachers and students arrays
 *       404:
 *         description: Class not found
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cls = await prisma.class.findUnique({
      where: { id },
      select: {
        teachers: {
          select: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        students: {
          select: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
      },
    });

    if (!cls) return errorResponse("Class not found", 404);

    return successResponse({
      teachers: cls.teachers.map((t) => t.user),
      students: cls.students.map((s) => s.user),
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * @swagger
 * /backoffice/classes/{id}/members:
 *   post:
 *     summary: Add or remove a class member
 *     description: Add or remove a teacher or student from a class
 *     tags: [Backoffice - Classes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Class ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, role, userId]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [add, remove]
 *               role:
 *                 type: string
 *                 enum: [teacher, student]
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Operation successful
 *       400:
 *         description: Invalid action/role, missing fields, or student already assigned
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action, role, userId } = await request.json();

    if (!action || !role || !userId) {
      return errorResponse("action, role, and userId are required");
    }

    if (!["add", "remove"].includes(action)) {
      return errorResponse("action must be 'add' or 'remove'");
    }

    if (!["teacher", "student"].includes(role)) {
      return errorResponse("role must be 'teacher' or 'student'");
    }

    if (action === "add" && role === "student") {
      const existing = await prisma.classStudent.findFirst({
        where: { userId },
        include: { class: { select: { name: true } } },
      });
      if (existing) {
        return errorResponse(
          `Student is already assigned to class "${existing.class.name}"`
        );
      }
    }

    if (role === "teacher") {
      if (action === "add") {
        await prisma.classTeacher.create({ data: { classId: id, userId } });
      } else {
        await prisma.classTeacher.delete({
          where: { userId_classId: { userId, classId: id } },
        });
      }
    } else {
      if (action === "add") {
        await prisma.classStudent.create({ data: { classId: id, userId } });
      } else {
        await prisma.classStudent.delete({
          where: { userId_classId: { userId, classId: id } },
        });
      }
    }

    return successResponse({ ok: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
