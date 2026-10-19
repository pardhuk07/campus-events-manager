import { NextRequest, NextResponse } from 'next/server';
import { pgPool } from '@/lib/db';
import { requireCore } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // STRICT SECURITY CHECK: Only ACM Core administrators can execute DB schema fixes
  const auth = await requireCore(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const client = await pgPool.connect();
  try {
    // 1. Universal drop of all foreign key constraints across tables
    await client.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT table_name, constraint_name
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND constraint_type = 'FOREIGN KEY'
            AND table_name IN ('User', 'Event', 'Expense', 'EventConflict', 'Budget')
        ) LOOP
          EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
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

    // 3. Ensure Budget table has all columns and drop legacy NOT NULL constraints
    await client.query(`
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "name" TEXT DEFAULT 'Semester Budget';
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "amount" NUMERIC(10, 2) DEFAULT 50000.00;
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "periodType" TEXT DEFAULT 'SEMESTER';
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3) DEFAULT '2026-08-01 00:00:00';
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3) DEFAULT '2026-12-31 23:59:59';
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "isVoided" BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3);
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "voidedBy" TEXT;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "voidReason" TEXT;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "onBehalfOfClub" TEXT;

      CREATE TABLE IF NOT EXISTS "ExpenseChangeLog" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "expenseId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "performedBy" TEXT NOT NULL,
        "performedById" TEXT,
        "onBehalfOfClub" TEXT,
        "reason" TEXT NOT NULL,
        "oldValues" JSONB,
        "newValues" JSONB,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Universal removal of NOT NULL on any legacy columns across all tables
      DO $$ 
      DECLARE
        col RECORD;
      BEGIN
        FOR col IN (
          SELECT table_name, column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public'
            AND table_name IN ('User', 'Club', 'Event', 'EventConflict', 'Expense', 'Budget')
            AND is_nullable = 'NO' 
            AND column_name NOT IN ('id', 'name', 'email', 'title', 'venue', 'startTime', 'endTime', 'amount')
        ) LOOP
          EXECUTE 'ALTER TABLE ' || quote_ident(col.table_name) || ' ALTER COLUMN ' || quote_ident(col.column_name) || ' DROP NOT NULL';
        END LOOP;
      END $$;

      -- Standardize column types to TEXT to avoid enum mismatches
      ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT;
      ALTER TABLE "Event" ALTER COLUMN "status" TYPE TEXT;
      ALTER TABLE "EventConflict" ALTER COLUMN "status" TYPE TEXT;
      ALTER TABLE "Expense" ALTER COLUMN "category" TYPE TEXT;
      ALTER TABLE "Budget" ALTER COLUMN "periodType" TYPE TEXT;
    `);

    // 4. Clean up invalid clubIds on User table
    await client.query(`
      UPDATE "User" SET "clubId" = NULL 
      WHERE "role" IN ('CORE_VERIFIER', 'MEMBER') 
         OR ("clubId" IS NOT NULL AND "clubId" NOT IN (SELECT "id" FROM "Club"));
    `);

    // 5. Ensure demo users exist and are valid
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

    // 6. Query and return current state
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
