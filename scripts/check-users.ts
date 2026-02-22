import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
  console.log("Users:", users);

  const notifications = await prisma.notification.findMany();
  console.log("Notifications:", notifications);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
