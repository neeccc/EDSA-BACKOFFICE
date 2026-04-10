import { NextRequest } from "next/server";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { verifyAuth } from "@/lib/auth";
import { addCors, OPTIONS as corsOptions } from "@/lib/cors";

export const OPTIONS = corsOptions;

/**
 * @swagger
 * /v1/profile:
 *   get:
 *     summary: Get authenticated student's profile
 *     tags: [Game - Profile]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Student profile
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return addCors(errorResponse("Unauthorized", 401));

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        language: true,
        createdAt: true,
        studentClasses: {
          select: { class: { select: { id: true, name: true } } },
        },
      },
    });

    if (!user) return addCors(errorResponse("User not found", 404));

    const className = user.studentClasses[0]?.class?.name ?? null;

    return addCors(
      successResponse({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        language: user.language,
        class_name: className,
        joined_at: user.createdAt,
      })
    );
  } catch {
    return addCors(errorResponse("Internal server error", 500));
  }
}

/**
 * @swagger
 * /v1/profile:
 *   put:
 *     summary: Update authenticated student's profile
 *     tags: [Game - Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               language:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return addCors(errorResponse("Unauthorized", 401));

    const body = await request.json();
    const { name, username, email, language } = body;

    const data: Record<string, string> = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof language === "string") data.language = language;

    if (typeof email === "string" && email.trim()) {
      const conflict = await prisma.user.findFirst({
        where: { email: email.trim(), id: { not: auth.userId } },
      });
      if (conflict) return addCors(errorResponse("Email sudah dipakai"));
      data.email = email.trim();
    }

    if (typeof username === "string" && username.trim()) {
      const conflict = await prisma.user.findFirst({
        where: { username: username.trim(), id: { not: auth.userId } },
      });
      if (conflict) return addCors(errorResponse("Username sudah dipakai"));
      data.username = username.trim();
    }

    if (Object.keys(data).length === 0) {
      return addCors(errorResponse("No fields to update"));
    }

    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        language: true,
      },
    });

    return addCors(successResponse(updated));
  } catch {
    return addCors(errorResponse("Internal server error", 500));
  }
}

/**
 * @swagger
 * /v1/profile:
 *   patch:
 *     summary: Change password
 *     tags: [Game - Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized or wrong current password
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return addCors(errorResponse("Unauthorized", 401));

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return addCors(errorResponse("currentPassword and newPassword are required"));
    }

    if (newPassword.length < 6) {
      return addCors(errorResponse("Password minimal 6 karakter"));
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { password: true },
    });

    if (!user) return addCors(errorResponse("User not found", 404));

    const valid = await compare(currentPassword, user.password);
    if (!valid) return addCors(errorResponse("Password lama salah", 401));

    const hashed = await hash(newPassword, 12);
    await prisma.user.update({
      where: { id: auth.userId },
      data: { password: hashed },
    });

    return addCors(successResponse({ changed: true }));
  } catch {
    return addCors(errorResponse("Internal server error", 500));
  }
}
