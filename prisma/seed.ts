import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  AudienceType,
  EventStatus,
  Role,
} from "../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 1. Create the semester budget
  const budget = await prisma.budget.upsert({
    where: { semester: "Fall 2026" },
    update: {},
    create: {
      semester: "Fall 2026",
      totalAllocated: 50000,
    },
  });

  console.log(`Budget created: ${budget.semester} (₹${budget.totalAllocated})`);

  // 2. Create starter clubs
  const clubs = [
    {
      name: "ACM Student Chapter",
      description: "Association for Computing Machinery student chapter",
    },
    {
      name: "IEEE Student Branch",
      description: "Technical society fostering technological innovation",
    },
    {
      name: "Computer Society of India (CSI)",
      description: "Computer science student society",
    },
  ];

  const createdClubs = [];

  for (const club of clubs) {
    const result = await prisma.club.upsert({
      where: { name: club.name },
      update: {},
      create: club,
    });

    createdClubs.push(result);
    console.log(`Club ready: ${result.name}`);
  }

  // 3. Register Pardhu as official ACM Core Verifier in PostgreSQL
  const acmClub = createdClubs.find((c) => c.name === "ACM Student Chapter");
  const pardhuUser = await prisma.user.upsert({
    where: { email: "pardhu120907@gmail.com" },
    update: {
      role: Role.ACM_CORE,
      name: "Pardhu (Core Lead)",
      clubId: acmClub ? acmClub.id : null,
    },
    create: {
      email: "pardhu120907@gmail.com",
      name: "Pardhu (Core Lead)",
      role: Role.ACM_CORE,
      clubId: acmClub ? acmClub.id : null,
    },
  });
  console.log(`✅ Registered ACM Core Lead: ${pardhuUser.name} (${pardhuUser.email})`);

  // 4. Create a sample IEEE event without duplicates
  const ieee = createdClubs.find(
    (club) => club.name === "IEEE Student Branch"
  );

  if (ieee) {
    const existingEvent = await prisma.event.findFirst({
      where: { title: "IEEE Cloud Computing Workshop" },
    });

    const event = existingEvent
      ? existingEvent
      : await prisma.event.create({
          data: {
            title: "IEEE Cloud Computing Workshop",
            description: "Hands-on cloud architecture workshop for UG students",
            startTime: new Date("2026-10-15T17:00:00+05:30"),
            endTime: new Date("2026-10-15T19:00:00+05:30"),
            venue: "Seminar Hall 1",
            audienceType: AudienceType.TECH_UG,
            expectedAudience: 120,
            clubId: ieee.id,
            status: EventStatus.APPROVED,
          },
        });
    console.log(`Sample event ready: ${event.title}`);
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
