import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireSession } from "@/lib/require-session";

/**
 * @swagger
 * /backoffice/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Returns counts of teachers, students, classes, books, and student progress stats
 *     tags: [Backoffice - Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
export async function GET() {
  try {
    const { error } = await requireSession();
    if (error) return error;
    // Only count story pages (exclude cover page 0 and assessment 9999)
    const storyPageFilter = { page: { pageNumber: { gt: 0, lt: 9999 } } };

    const [teachers, students, classes, books, progressAgg] =
      await Promise.all([
        prisma.user.count({ where: { role: "TEACHER" } }),
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.class.count(),
        prisma.book.count(),
        prisma.studentProgress.aggregate({
          where: storyPageFilter,
          _count: { id: true },
          _avg: { score: true },
        }),
      ]);

    const completedCount = await prisma.studentProgress.count({
      where: { completed: true, ...storyPageFilter },
    });

    const totalProgress = progressAgg._count.id;
    const avgScore = progressAgg._avg.score;
    const completionRate =
      totalProgress > 0
        ? Math.round((completedCount / totalProgress) * 100)
        : 0;

    return successResponse({
      teachers,
      students,
      classes,
      books,
      progress: {
        total: totalProgress,
        completed: completedCount,
        completionRate,
        avgScore: avgScore !== null ? Math.round(avgScore) : null,
      },
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
