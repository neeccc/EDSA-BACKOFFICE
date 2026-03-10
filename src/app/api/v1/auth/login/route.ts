import { NextRequest } from "next/server";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { addCors, OPTIONS as corsOptions } from "@/lib/cors";

export const OPTIONS = corsOptions;

/**
 * @swagger
 * /v1/auth/login:
 *   post:
 *     summary: Student login
 *     description: Authenticate a student and return a JWT for game API access
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return addCors(errorResponse("Username and password are required", 400));
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || user.role !== "STUDENT") {
      return addCors(errorResponse("Invalid credentials", 401));
    }

    const isValid = await compare(password, user.password);
    if (!isValid) {
      return addCors(errorResponse("Invalid credentials", 401));
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const token = await new SignJWT({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    return addCors(successResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        language: user.language,
      },
    }));
  } catch {
    return addCors(errorResponse("Internal server error", 500));
  }
}
