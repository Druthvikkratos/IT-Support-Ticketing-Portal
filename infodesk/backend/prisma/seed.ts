import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@infomapglobal.com';
  const issueTypeNames = [
    'Network',
    'Pc/Hardware',
    'Excel/Office',
    'Email/Outlook',
    'Printer',
    'Software Installation',
    'VPN/Remote Access',
    'Security Alert',
    'Storage/One-Drive',
    'Others',
  ];

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Seed admin already exists, skipping.');
  } else {
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

  for (const name of issueTypeNames) {
    await prisma.issueType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('Issue types seeded.');
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
