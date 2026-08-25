import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = 'demo-user-id-5';
  const sessionToken = 'verify-session-token-phase5';
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: 'demo@sudomeet.dev' }
  });

  await prisma.session.upsert({
    where: { sessionToken },
    update: { expires },
    create: { sessionToken, userId, expires }
  });

  console.log('✓ Test session created');
  await prisma.$disconnect();
}

main().catch(console.error);
