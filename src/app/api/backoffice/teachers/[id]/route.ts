import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * @swagger
 * /backoffice/teachers/{id}:
 *   put:
 *     summary: Update a teacher
 *     description: Update an existing teacher's name, email, or password
 *     tags: [Backoffice - Teachers]
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
 *             required: [name, email]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 description: Leave empty to keep current
 *     responses:
 *       200:
 *         description: Teacher updated
 *       400:
 *         description: Validation error or duplicate email
 *       404:
 *         description: Teacher not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, username, email, password } = body;

    if (!name || !email) {
      return errorResponse("Name and email are required");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== "TEACHER") {
      return errorResponse("Teacher not found", 404);
    }

    const emailConflict = await prisma.user.findFirst({
      where: { email, id: { not: id } },
    });
    if (emailConflict) {
      return errorResponse("A user with this email already exists");
    }

    if (username) {
      const usernameConflict = await prisma.user.findFirst({
        where: { username, id: { not: id } },
      });
      if (usernameConflict) {
        return errorResponse("A user with this username already exists");
      }
    }

    const data: { name: string; email: string; username?: string; password?: string } = {
      name,
      email,
    };

    if (username) {
      data.username = username;
    }

    if (password) {
      data.password = await hash(password, 12);
    }

    const teacher = await prisma.user.update({
      where: { id },
      data,
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

    return successResponse(teacher);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * @swagger
 * /backoffice/teachers/{id}:
 *   delete:
 *     summary: Delete a teacher
 *     description: Permanently delete a teacher account
 *     tags: [Backoffice - Teachers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Teacher deleted
 *       404:
 *         description: Teacher not found
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== "TEACHER") {
      return errorResponse("Teacher not found", 404);
    }

    await prisma.user.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
