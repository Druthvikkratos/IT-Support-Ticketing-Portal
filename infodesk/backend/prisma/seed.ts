import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@infomapglobal.com';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Seed admin already exists, skipping.');
    return;
  }

  const password = await bcrypt.hash('Aster@123', 10);

  await prisma.user.create({
    data: {
      role: Role.admin,
      name: 'Default Admin',
      email,
      password,
    },
  });

  console.log('Seed admin created:', email);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
