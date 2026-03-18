import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { addCors, OPTIONS as corsOptions } from "@/lib/cors";

export const OPTIONS = corsOptions;

/**
 * @swagger
 * /v1/auth/register:
 *   post:
 *     summary: Student registration
 *     description: Create a new student account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username, password]
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student registered
 *       400:
 *         description: Validation error or duplicate
 */
export async function POST(request: NextRequest) {
  try {
    const { email, username, password, name } = await request.json();

    if (!email || !username || !password) {
      return addCors(errorResponse("Email, username, and password are required", 400));
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return addCors(errorResponse("Email sudah terdaftar", 400));
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return addCors(errorResponse("Username sudah dipakai", 400));
    }

    const hashedPassword = await hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        username,
        name: name || username,
        password: hashedPassword,
        role: "STUDENT",
      },
    });

    return addCors(successResponse({ registered: true }, 201));
  } catch {
    return addCors(errorResponse("Internal server error", 500));
  }
}
