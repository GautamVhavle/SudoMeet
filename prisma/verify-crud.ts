/**
 * Temporary Phase 2 verification: full CRUD on Meeting + Participant.
 * Run: npx tsx --env-file=.env prisma/verify-crud.ts
 */

import { PrismaClient, MeetingStatus } from "@prisma/client";

const prisma = new PrismaClient();
const stamp = Date.now();

async function main() {
  // CREATE
  const user = await prisma.user.create({
    data: { email: `crud-${stamp}@sudomeet.dev`, name: "CRUD Check" },
  });
  const meeting = await prisma.meeting.create({
    data: {
      roomCode: `crud-${stamp}`,
      slug: `crud-${stamp}`,
      title: "CRUD Verification",
      hostId: user.id,
      mediaProvider: "P2P",
      status: MeetingStatus.WAITING,
      maxParticipants: 4,
    },
  });
  const participant = await prisma.participant.create({
    data: {
      meetingId: meeting.id,
      userId: user.id,
      displayName: "CRUD Host",
      role: "host",
    },
  });

  // READ
  const loaded = await prisma.meeting.findUniqueOrThrow({
    where: { roomCode: `crud-${stamp}` },
    include: { participants: true },
  });
  if (loaded.title !== "CRUD Verification" || loaded.participants.length !== 1) {
    throw new Error("READ mismatch");
  }

  // UPDATE
  const updated = await prisma.meeting.update({
    where: { id: meeting.id },
    data: { status: MeetingStatus.ACTIVE, startedAt: new Date(), isLocked: true },
  });
  if (updated.status !== "ACTIVE" || !updated.startedAt || !updated.isLocked) {
    throw new Error("UPDATE mismatch");
  }

  // DELETE (participant, then meeting — cascade removes dependents)
  await prisma.participant.delete({ where: { id: participant.id } });
  await prisma.meeting.delete({ where: { id: meeting.id } });
  await prisma.user.delete({ where: { id: user.id } });

  const remainingMeetings = await prisma.meeting.count({
    where: { roomCode: `crud-${stamp}` },
  });
  const remainingParticipants = await prisma.participant.count({
    where: { displayName: "CRUD Host" },
  });
  if (remainingMeetings !== 0 || remainingParticipants !== 0) {
    throw new Error("DELETE/cascade mismatch");
  }

  console.log(
    "✅ CRUD verified: create → read → update → delete (with cascade) all succeeded.",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
