import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function addCors(response: NextResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

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
 *             required: [email, password]
 *             properties:
 *               email:
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
    const { email, password } = await request.json();

    if (!email || !password) {
      return addCors(errorResponse("Email and password are required", 400));
    }

    const user = await prisma.user.findUnique({ where: { email } });

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
        email: user.email,
        name: user.name,
        language: user.language,
      },
    }));
  } catch {
    return addCors(errorResponse("Internal server error", 500));
  }
}
