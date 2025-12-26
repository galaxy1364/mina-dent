import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

async function main() {
  const prisma = new PrismaClient();
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@mina.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe_12345";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    process.stdout.write("seed: admin exists\n");
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, passwordHash, role: Role.MANAGER } });

  process.stdout.write(`seed: admin created ${email}\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  process.stderr.write(String(e) + "\n");
  process.exit(1);
});
