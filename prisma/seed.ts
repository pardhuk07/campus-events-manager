import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up existing demo data
  await prisma.eventConflict.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.budget.deleteMany({});

  // ─── Clubs ───────────────────────────────────────────
  let acmClub = await prisma.club.findFirst({
    where: { name: "ACM NIT Surat" },
  });
  if (!acmClub) {
    acmClub = await prisma.club.create({
      data: {
        name: "ACM NIT Surat",
        description: "Association for Computing Machinery - NIT Surat Chapter",
      },
    });
  }

  let csiClub = await prisma.club.findFirst({
    where: { name: "CSI NIT Surat" },
  });
  if (!csiClub) {
    csiClub = await prisma.club.create({
      data: {
        name: "CSI NIT Surat",
        description: "Computer Society of India - NIT Surat Chapter",
      },
    });
  }

  console.log("✅ Clubs seeded");

  // ─── Users ───────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("password123", 12);

  const coreVerifier = await prisma.user.upsert({
    where: { email: "core@acm.nitsu.ac.in" },
    update: {},
    create: {
      name: "ACM Core Verifier",
      email: "core@acm.nitsu.ac.in",
      passwordHash: hashedPassword,
      role: "CORE_VERIFIER",
      clubId: acmClub.id,
    },
  });

  const clubExec = await prisma.user.upsert({
    where: { email: "exec@acm.nitsu.ac.in" },
    update: {},
    create: {
      name: "Club Executive",
      email: "exec@acm.nitsu.ac.in",
      passwordHash: hashedPassword,
      role: "CLUB_EXEC",
      clubId: acmClub.id,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@acm.nitsu.ac.in" },
    update: {},
    create: {
      name: "Regular Member",
      email: "member@acm.nitsu.ac.in",
      passwordHash: hashedPassword,
      role: "MEMBER",
      clubId: acmClub.id,
    },
  });

  console.log("✅ Users seeded");

  // ─── Budget ───────────────────────────────────────────
  const budget = await prisma.budget.create({
    data: {
      name: "Semester 1 - 2025/26",
      amount: 50000,
      periodType: "SEMESTER",
      startDate: new Date("2025-07-01"),
      endDate: new Date("2025-12-31"),
    },
  });

  console.log("✅ Budget seeded");

  // ─── Events ───────────────────────────────────────────
  const event1 = await prisma.event.create({
    data: {
      title: "ACM Technical Workshop",
      description: "Hands-on workshop on web development using React and Next.js",
      clubId: acmClub.id,
      startTime: new Date("2025-10-20T10:00:00"),
      endTime: new Date("2025-10-20T14:00:00"),
      venue: "LT-1, Main Block",
      audienceTags: ["ALL_STUDENTS", "CS_DEPT"],
      expectedAttendance: 150,
      category: "WORKSHOP",
      status: "APPROVED",
      submittedById: clubExec.id,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: "CSI Seminar",
      description: "Industry seminar on Cloud Computing",
      clubId: csiClub.id,
      startTime: new Date("2025-10-20T12:00:00"),
      endTime: new Date("2025-10-20T16:00:00"),
      venue: "Seminar Hall, Block B",
      audienceTags: ["ALL_STUDENTS"],
      expectedAttendance: 200,
      category: "SEMINAR",
      status: "APPROVED",
      submittedById: clubExec.id,
    },
  });

  const event3 = await prisma.event.create({
    data: {
      title: "ACM Hackathon 2025",
      description: "24-hour coding hackathon with prizes worth ₹20,000",
      clubId: acmClub.id,
      startTime: new Date("2025-11-15T09:00:00"),
      endTime: new Date("2025-11-16T09:00:00"),
      venue: "Computer Centre",
      audienceTags: ["ALL_STUDENTS", "CS_DEPT"],
      expectedAttendance: 100,
      category: "HACKATHON",
      status: "PENDING",
      submittedById: clubExec.id,
    },
  });

  console.log("✅ Events seeded");

  // ─── Conflict ───────────────────────────────────────────
  await prisma.eventConflict.create({
    data: {
      eventId: event1.id,
      conflictingEventId: event2.id,
      reason:
        "Time overlap (12:00-14:00) with audience overlap (ALL_STUDENTS)",
      overlapStart: new Date("2025-10-20T12:00:00"),
      overlapEnd: new Date("2025-10-20T14:00:00"),
      status: "FLAGGED",
    },
  });

  console.log("✅ Conflict seeded");

  // ─── Expenses ───────────────────────────────────────────
  await prisma.expense.createMany({
    data: [
      {
        eventId: event1.id,
        amount: 5000,
        category: "FOOD",
        description: "Snacks and refreshments for workshop participants",
        expenseDate: new Date("2025-10-20"),
        submittedById: clubExec.id,
      },
      {
        eventId: event1.id,
        amount: 3500,
        category: "PRINTING",
        description: "Workshop handouts and banners",
        expenseDate: new Date("2025-10-19"),
        submittedById: clubExec.id,
      },
      {
        eventId: event3.id,
        amount: 20000,
        category: "PRIZES",
        description: "Prize money for hackathon winners",
        expenseDate: new Date("2025-11-15"),
        submittedById: clubExec.id,
      },
    ],
  });

  console.log("✅ Expenses seeded");

  console.log("\n🎉 Seeding complete!");
  console.log("\n📋 Demo Login Credentials:");
  console.log("  Core Verifier: core@acm.nitsu.ac.in / password123");
  console.log("  Club Executive: exec@acm.nitsu.ac.in / password123");
  console.log("  Member:         member@acm.nitsu.ac.in / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
