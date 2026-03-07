import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@edsa.local";
  const password = "admin123";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Superadmin already exists: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name: "Super Admin",
      password: hashSync(password, 10),
      role: "SUPERADMIN",
    },
  });

  console.log("Superadmin created:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log("  ⚠ Change this password after first login!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
