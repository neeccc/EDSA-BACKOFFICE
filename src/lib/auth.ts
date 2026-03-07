import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export async function verifyAuth(
  request: NextRequest
): Promise<AuthPayload | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice(7);
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || !payload.email || !payload.role) return null;
    return {
      userId: payload.sub,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}
