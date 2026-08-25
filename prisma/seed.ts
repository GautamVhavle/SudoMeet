/**
 * Seed script — demo user + meeting for local development.
 *
 * Usage: npm run db:seed
 * Idempotent: upserts by unique fields so it can be re-run safely.
 */

import { PrismaClient, MeetingStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@sudomeet.dev" },
    update: {},
    create: {
      email: "demo@sudomeet.dev",
      name: "Demo Host",
    },
  });

  const meeting = await prisma.meeting.upsert({
    where: { roomCode: "demo-room" },
    update: {},
    create: {
      roomCode: "demo-room",
      slug: "demo-meeting",
      title: "SudoMeet Demo Meeting",
      hostId: user.id,
      mediaProvider: "P2P",
      status: MeetingStatus.DRAFT,
      maxParticipants: 4,
      requiresHostApproval: false,
    },
  });

  console.log("Seeded:");
  console.log(`  User:    ${user.email} (${user.id})`);
  console.log(`  Meeting: ${meeting.title} (${meeting.roomCode})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
