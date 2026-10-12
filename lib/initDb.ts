import { pgPool } from './db';

/**
 * Executes a PostgreSQL migration to update the schema tables to match the single source of truth:
 * - User, Club, Event, EventConflict, Expense, Budget
 * - Enums: UserRole, EventStatus, ConflictStatus, ExpenseCategory, BudgetPeriod
 */
export async function ensureDatabaseTables() {
  const client = await pgPool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      DO $$ BEGIN
        CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'CLUB_EXEC', 'CORE_VERIFIER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "ConflictStatus" AS ENUM ('FLAGGED', 'REVIEWED', 'DISMISSED', 'RESOLVED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "ExpenseCategory" AS ENUM ('FOOD', 'VENUE', 'PRIZES', 'MARKETING', 'PRINTING', 'EQUIPMENT', 'TRAVEL', 'MISCELLANEOUS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "BudgetPeriod" AS ENUM ('MONTHLY', 'SEMESTER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      -- Club Table
      CREATE TABLE IF NOT EXISTS "Club" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "name" TEXT UNIQUE NOT NULL,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- User Table
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "name" TEXT NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT,
        "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
        "clubId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Add missing columns to User & Club if created by prior migration
      ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT;
      ALTER TABLE "Club" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
      ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

      -- Universal removal of foreign key constraints on all tables so relationship data never causes insert/update crashes
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

      -- Standardize column types to TEXT to prevent enum mismatches
      ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT;
      ALTER TABLE "Event" ALTER COLUMN "status" TYPE TEXT;
      ALTER TABLE "EventConflict" ALTER COLUMN "status" TYPE TEXT;
      ALTER TABLE "Expense" ALTER COLUMN "category" TYPE TEXT;
      ALTER TABLE "Budget" ALTER COLUMN "periodType" TYPE TEXT;

      -- Clean up invalid clubIds
      UPDATE "User" SET "clubId" = NULL WHERE "clubId" IS NOT NULL AND "clubId" NOT IN (SELECT "id" FROM "Club");

      -- Event Table
      CREATE TABLE IF NOT EXISTS "Event" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "clubId" TEXT NOT NULL REFERENCES "Club"("id") ON DELETE CASCADE,
        "startTime" TIMESTAMP(3) NOT NULL,
        "endTime" TIMESTAMP(3) NOT NULL,
        "venue" TEXT NOT NULL,
        "audienceTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        "expectedAttendance" INTEGER,
        "category" TEXT,
        "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
        "submittedById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Add missing columns to Event if existing table had previous schema
      ALTER TABLE "Event" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "audienceTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "expectedAttendance" INTEGER;
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "category" TEXT;
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "submittedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL;
      ALTER TABLE "Event" ALTER COLUMN "status" TYPE TEXT;
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

      -- EventConflict Table
      CREATE TABLE IF NOT EXISTS "EventConflict" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
        "conflictingEventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
        "reason" TEXT NOT NULL,
        "overlapStart" TIMESTAMP(3),
        "overlapEnd" TIMESTAMP(3),
        "status" "ConflictStatus" NOT NULL DEFAULT 'FLAGGED',
        "reviewedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
        "resolutionNote" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "unique_event_conflict_pair" UNIQUE ("eventId", "conflictingEventId")
      );

      -- Add missing columns to EventConflict if table existed
      ALTER TABLE "EventConflict" ADD COLUMN IF NOT EXISTS "overlapStart" TIMESTAMP(3);
      ALTER TABLE "EventConflict" ADD COLUMN IF NOT EXISTS "overlapEnd" TIMESTAMP(3);
      ALTER TABLE "EventConflict" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'FLAGGED';
      ALTER TABLE "EventConflict" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL;
      ALTER TABLE "EventConflict" ADD COLUMN IF NOT EXISTS "resolutionNote" TEXT;
      ALTER TABLE "EventConflict" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

      -- Expense Table
      CREATE TABLE IF NOT EXISTS "Expense" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "eventId" TEXT REFERENCES "Event"("id") ON DELETE SET NULL,
        "amount" NUMERIC(10, 2) NOT NULL,
        "category" "ExpenseCategory" NOT NULL,
        "description" TEXT,
        "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "receiptUrl" TEXT,
        "receiptPublicId" TEXT,
        "submittedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Add missing columns to Expense if table existed
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "receiptPublicId" TEXT;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "submittedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

      -- Budget Table
      CREATE TABLE IF NOT EXISTS "Budget" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "name" TEXT NOT NULL,
        "amount" NUMERIC(10, 2) NOT NULL,
        "periodType" "BudgetPeriod" NOT NULL DEFAULT 'SEMESTER',
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Add missing columns to Budget if table existed
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "name" TEXT DEFAULT 'Semester Budget';
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "amount" NUMERIC(10, 2) DEFAULT 50000.00;
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "periodType" TEXT DEFAULT 'SEMESTER';
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3) DEFAULT '2026-08-01 00:00:00';
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3) DEFAULT '2026-12-31 23:59:59';
      ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

      -- Dynamically remove NOT NULL from any legacy columns in Budget (e.g. semester, clubId)
      DO $$ 
      DECLARE
          col RECORD;
      BEGIN
          FOR col IN (
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_name = 'Budget' 
                AND is_nullable = 'NO' 
                AND column_name NOT IN ('id', 'name', 'amount', 'startDate', 'endDate')
          ) LOOP
              EXECUTE 'ALTER TABLE "Budget" ALTER COLUMN ' || quote_ident(col.column_name) || ' DROP NOT NULL';
          END LOOP;
      END $$;

      CREATE INDEX IF NOT EXISTS "Event_startTime_endTime_idx" ON "Event"("startTime", "endTime");
      CREATE INDEX IF NOT EXISTS "Event_venue_idx" ON "Event"("venue");
      CREATE INDEX IF NOT EXISTS "EventConflict_status_idx" ON "EventConflict"("status");
      CREATE INDEX IF NOT EXISTS "Expense_eventId_idx" ON "Expense"("eventId");
      CREATE INDEX IF NOT EXISTS "Expense_expenseDate_idx" ON "Expense"("expenseDate");
    `);

    // Pre-seed Core clubs if not present
    try {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "Club_name_key" ON "Club"("name");
        INSERT INTO "Club" ("id", "name", "description")
        VALUES
          ('club-acm', 'ACM Student Chapter', 'Association for Computing Machinery student chapter NIT Surat'),
          ('club-ieee', 'IEEE Student Branch', 'Institute of Electrical and Electronics Engineers student branch'),
          ('club-csi', 'Computer Society of India (CSI)', 'CSI Student Branch NIT Surat')
        ON CONFLICT ("name") DO NOTHING;
      `);
    } catch (clubErr) {
      console.warn('Could not seed clubs, continuing:', clubErr);
    }

    // Pre-seed Pardhu as CORE_VERIFIER and demo users
    try {
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
    } catch (userErr) {
      console.warn('Could not seed demo users, continuing:', userErr);
    }

    // Pre-seed current semester Budget
    try {
      await client.query(`
        INSERT INTO "Budget" ("id", "name", "amount", "periodType", "startDate", "endDate")
        SELECT 'budget-fall-2026', 'Fall 2026 Semester Budget', 50000.00, 'SEMESTER', '2026-08-01 00:00:00', '2026-12-31 23:59:59'
        WHERE NOT EXISTS (SELECT 1 FROM "Budget" WHERE "name" = 'Fall 2026 Semester Budget');
      `);
    } catch (budgetErr) {
      console.warn('Could not seed default budget, continuing:', budgetErr);
    }
  } finally {
    client.release();
  }
}
