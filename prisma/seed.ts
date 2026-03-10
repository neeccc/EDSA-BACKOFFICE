import { PrismaClient, PuzzleType } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

const BOOKS = [
  {
    slug: "the-deer-and-the-crocodile",
    title: "The Deer and the Crocodile",
    puzzleType: PuzzleType.MATCHING,
    order: 1,
    storyPages: 13, // pages 0-12
  },
  {
    slug: "timun-mas-count-to-ten",
    title: "Timun Mas Count to Ten",
    puzzleType: PuzzleType.ORDERING,
    order: 2,
    storyPages: 12, // pages 1-12
  },
  {
    slug: "bawang-putih-and-the-scarf",
    title: "Bawang Putih and the Scarf",
    puzzleType: PuzzleType.MATCHING,
    order: 3,
    storyPages: 12,
  },
  {
    slug: "lutung-kasarung",
    title: "Lutung Kasarung",
    puzzleType: PuzzleType.FILL_BLANK,
    order: 4,
    storyPages: 9,
  },
  {
    slug: "malin-kundang-finding-a-job",
    title: "Malin Kundang Finding a Job",
    puzzleType: PuzzleType.MULTIPLE_CHOICE,
    order: 5,
    storyPages: 0,
  },
  {
    slug: "the-golden-snail",
    title: "The Golden Snail",
    puzzleType: PuzzleType.MATCHING,
    order: 6,
    storyPages: 0,
  },
  {
    slug: "the-clever-mouse-deer",
    title: "The Clever Mouse Deer",
    puzzleType: PuzzleType.MATCHING,
    order: 7,
    storyPages: 0,
  },
  {
    slug: "the-snail-and-the-rabbit",
    title: "The Snail and the Rabbit",
    puzzleType: PuzzleType.MATCHING,
    order: 8,
    storyPages: 0,
  },
];

async function main() {
  // Seed superadmin
  const email = "admin@edsa.local";
  const password = "admin123";

  const existingAdmin = await prisma.user.findUnique({ where: { email } });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email,
        username: "admin",
        name: "Super Admin",
        password: hashSync(password, 10),
        role: "SUPERADMIN",
      },
    });

    console.log("Superadmin created:");
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log("  ⚠ Change this password after first login!");
  } else {
    console.log(`Superadmin already exists: ${email}`);
  }

  // Seed books with pages
  for (const bookDef of BOOKS) {
    const existingBook = await prisma.book.findUnique({
      where: { slug: bookDef.slug },
    });

    if (existingBook) {
      console.log(`Book already exists: ${bookDef.slug}`);
      continue;
    }

    const pages: Array<{ pageNumber: number; puzzleData: object }> = [];

    // Create story pages
    for (let i = 0; i < bookDef.storyPages; i++) {
      pages.push({ pageNumber: i, puzzleData: {} });
    }

    // Create assessment page (pageNumber 9999)
    if (bookDef.storyPages > 0) {
      pages.push({ pageNumber: 9999, puzzleData: { type: "assessment" } });
    }

    await prisma.book.create({
      data: {
        slug: bookDef.slug,
        title: bookDef.title,
        puzzleType: bookDef.puzzleType,
        order: bookDef.order,
        pages: {
          create: pages,
        },
      },
    });

    console.log(`Book seeded: ${bookDef.slug} (${pages.length} pages)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
