import { NextRequest } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const UPLOAD_DIR = join(process.cwd(), "public/uploads/avatars");

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

    // Remove old avatar if it exists with a different extension
    if (user.avatar) {
      const oldPath = join(process.cwd(), "public", user.avatar);
      if (existsSync(oldPath)) {
        await unlink(oldPath);
      }
    }

    const ext = extname(file.name) || `.${file.type.split("/")[1]}`;
    const filename = `${userId}${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const avatarPath = `/uploads/avatars/${filename}`;
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarPath },
    });

    return successResponse({ avatar: avatarPath });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
