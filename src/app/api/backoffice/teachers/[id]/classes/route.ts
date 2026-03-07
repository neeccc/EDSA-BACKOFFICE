import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * @swagger
 * /backoffice/teachers/{id}/classes:
 *   get:
 *     summary: List teacher's classes
 *     description: Returns all classes assigned to a teacher
 *     tags: [Backoffice - Teachers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher user ID
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

    const records = await prisma.classTeacher.findMany({
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
 * /backoffice/teachers/{id}/classes:
 *   post:
 *     summary: Add or remove a class from a teacher
 *     description: Assign or unassign a class to/from a teacher
 *     tags: [Backoffice - Teachers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher user ID
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
 *         description: Invalid action or missing fields
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
      await prisma.classTeacher.create({ data: { userId: id, classId } });
    } else if (action === "remove") {
      await prisma.classTeacher.delete({
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
