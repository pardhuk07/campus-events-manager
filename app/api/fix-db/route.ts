import { NextResponse } from 'next/server';
import { pgPool } from '@/lib/db';

export async function GET() {
  const client = await pgPool.connect();
  try {
    // 1. Drop any FK constraint on User table referencing Club
    await client.query(`
      ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_clubId_fkey";
      ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "user_clubid_fkey";
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = 'User' AND constraint_type = 'FOREIGN KEY' AND constraint_name ILIKE '%club%'
        ) LOOP
          EXECUTE 'ALTER TABLE "User" DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `);

    // 2. Ensure Club table has unique name and standard seed rows
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Club_name_key" ON "Club"("name");
      INSERT INTO "Club" ("id", "name", "description")
      VALUES
        ('club-acm', 'ACM Student Chapter', 'Association for Computing Machinery student chapter NIT Surat'),
        ('club-ieee', 'IEEE Student Branch', 'Institute of Electrical and Electronics Engineers student branch'),
        ('club-csi', 'Computer Society of India (CSI)', 'CSI Student Branch NIT Surat')
      ON CONFLICT ("name") DO NOTHING;
    `);

    // 3. Ensure Budget table has all columns
    await client.query(`
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "name" TEXT DEFAULT 'Semester Budget';
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "amount" NUMERIC(10, 2) DEFAULT 50000.00;
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "periodType" TEXT DEFAULT 'SEMESTER';
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3) DEFAULT '2026-08-01 00:00:00';
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3) DEFAULT '2026-12-31 23:59:59';
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);

    // 4. Clean up invalid clubIds on User table
    await client.query(`
      UPDATE "User" SET "clubId" = NULL 
      WHERE "role" IN ('CORE_VERIFIER', 'MEMBER') 
         OR ("clubId" IS NOT NULL AND "clubId" NOT IN (SELECT "id" FROM "Club"));
    `);

    // 4. Ensure demo users exist and are valid
    await client.query(`
      INSERT INTO "User" ("id", "name", "email", "role", "clubId")
      VALUES
        ('user-pardhu', 'Pardhu (Core Lead)', 'pardhu120907@gmail.com', 'CORE_VERIFIER', NULL),
        ('user-core-admin', 'ACM Core Admin', 'acmcore@gmail.com', 'CORE_VERIFIER', NULL),
        ('user-club-exec', 'Club Executive', 'acmexec@gmail.com', 'CLUB_EXEC', (SELECT "id" FROM "Club" WHERE "name" ILIKE '%ACM%' LIMIT 1)),
        ('user-ieee-exec', 'IEEE Executive', 'ieeelead@gmail.com', 'CLUB_EXEC', (SELECT "id" FROM "Club" WHERE "name" ILIKE '%IEEE%' LIMIT 1)),
        ('user-member', 'General Student', 'student@gmail.com', 'MEMBER', NULL)
      ON CONFLICT ("email") DO UPDATE SET "role" = EXCLUDED."role", "clubId" = EXCLUDED."clubId";
    `);

    // 5. Query and return current state
    const usersRes = await client.query('SELECT "id", "name", "email", "role", "clubId" FROM "User" ORDER BY "email" ASC');
    const clubsRes = await client.query('SELECT "id", "name" FROM "Club" ORDER BY "name" ASC');

    return NextResponse.json({
      success: true,
      message: 'Database constraints cleaned up successfully. User_clubId_fkey removed.',
      users: usersRes.rows,
      clubs: clubsRes.rows,
    });
  } catch (err: any) {
    console.error('Error fixing database:', err);
    return NextResponse.json(
      { success: false, error: err.message, stack: err.stack },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
