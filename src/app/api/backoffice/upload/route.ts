import { NextRequest } from "next/server";
import { extname } from "path";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * @swagger
 * /backoffice/upload:
 *   post:
 *     summary: Upload user avatar
 *     description: Upload a profile picture for a user. Accepts JPEG, PNG, WebP, GIF up to 2MB.
 *     tags: [Backoffice - Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, userId]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *       400:
 *         description: Invalid file type, size, or missing fields
 *       404:
 *         description: User not found
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file || !userId) {
      return errorResponse("file and userId are required");
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse("Only JPEG, PNG, WebP, and GIF images are allowed");
    }

    if (file.size > MAX_SIZE) {
      return errorResponse("File size must be under 2MB");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Delete old blob if the avatar is a blob URL
    if (user.avatar && user.avatar.startsWith("http")) {
      try {
        await del(user.avatar);
      } catch {
        // Old blob may already be gone — ignore
      }
    }

    const ext = extname(file.name) || `.${file.type.split("/")[1]}`;
    const blob = await put(`avatars/${userId}${ext}`, file, {
      access: "public",
    });

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: blob.url },
    });

    return successResponse({ avatar: blob.url });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
