import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * @swagger
 * /backoffice/classes/{id}:
 *   put:
 *     summary: Update a class
 *     description: Update an existing class's name or description
 *     tags: [Backoffice - Classes]
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Class updated
 *       400:
 *         description: Name is required
 *       404:
 *         description: Class not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return errorResponse("Name is required");
    }

    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Class not found", 404);
    }

    const cls = await prisma.class.update({
      where: { id },
      data: { name, description: description || null },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: { select: { teachers: true, students: true } },
      },
    });

    return successResponse(cls);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * @swagger
 * /backoffice/classes/{id}:
 *   delete:
 *     summary: Delete a class
 *     description: Permanently delete a class and all its member assignments
 *     tags: [Backoffice - Classes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Class deleted
 *       404:
 *         description: Class not found
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Class not found", 404);
    }

    await prisma.class.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
