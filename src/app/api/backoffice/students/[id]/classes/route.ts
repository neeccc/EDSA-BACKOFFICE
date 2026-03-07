import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * @swagger
 * /backoffice/students/{id}/classes:
 *   get:
 *     summary: List student's classes
 *     description: Returns the class assigned to a student (max one)
 *     tags: [Backoffice - Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student user ID
 *     responses:
 *       200:
 *         description: List of assigned classes
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const records = await prisma.classStudent.findMany({
      where: { userId: id },
      select: {
        class: { select: { id: true, name: true, description: true } },
      },
    });

    return successResponse(records.map((r) => r.class));
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * @swagger
 * /backoffice/students/{id}/classes:
 *   post:
 *     summary: Assign or remove a class from a student
 *     description: Assign or unassign a class to/from a student. A student can only be in one class at a time.
 *     tags: [Backoffice - Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, classId]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [add, remove]
 *               classId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Operation successful
 *       400:
 *         description: Student already assigned to a class or invalid action
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action, classId } = await request.json();

    if (!action || !classId) {
      return errorResponse("action and classId are required");
    }

    if (action === "add") {
      const existing = await prisma.classStudent.findFirst({
        where: { userId: id },
        include: { class: { select: { name: true } } },
      });
      if (existing) {
        return errorResponse(
          `Student is already assigned to class "${existing.class.name}"`
        );
      }
      await prisma.classStudent.create({ data: { userId: id, classId } });
    } else if (action === "remove") {
      await prisma.classStudent.delete({
        where: { userId_classId: { userId: id, classId } },
      });
    } else {
      return errorResponse("action must be 'add' or 'remove'");
    }

    return successResponse({ ok: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
