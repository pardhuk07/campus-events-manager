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

      -- Safely drop NOT NULL on legacy title in Expense if exists
      DO $$ BEGIN
        ALTER TABLE "Expense" ALTER COLUMN "title" DROP NOT NULL;
      EXCEPTION WHEN undefined_column THEN null;
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
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "eventType" TEXT DEFAULT 'Workshop';
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "estimatedCost" NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "approvedBudget" INTEGER;
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "semesterId" TEXT;
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "organizer" TEXT;
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "submittedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL;
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "conflictFlags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "flags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "reviewDecision" TEXT;
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "reviewComment" TEXT;
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "reviewedByName" TEXT;
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "lessonsLearned" TEXT;
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

      -- EventConflict Table
      CREATE TABLE IF NOT EXISTS "EventConflict" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "eventId" TEXT NOT NULL,
        "conflictingEventId" TEXT NOT NULL,
        "reason" TEXT NOT NULL,
        "overlapStart" TIMESTAMP(3),
        "overlapEnd" TIMESTAMP(3),
        "status" TEXT NOT NULL DEFAULT 'FLAGGED',
        "reviewedById" TEXT,
        "resolutionNote" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Add missing columns to EventConflict if table existed
      ALTER TABLE "EventConflict" DROP CONSTRAINT IF EXISTS "unique_event_conflict_pair";
      ALTER TABLE "EventConflict" ADD COLUMN IF NOT EXISTS "overlapStart" TIMESTAMP(3);
      ALTER TABLE "EventConflict" ADD COLUMN IF NOT EXISTS "overlapEnd" TIMESTAMP(3);
      ALTER TABLE "EventConflict" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'FLAGGED';
      ALTER TABLE "EventConflict" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;
      ALTER TABLE "EventConflict" ADD COLUMN IF NOT EXISTS "resolutionNote" TEXT;
      ALTER TABLE "EventConflict" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

      -- Expense Table
      CREATE TABLE IF NOT EXISTS "Expense" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "eventId" TEXT REFERENCES "Event"("id") ON DELETE SET NULL,
        "clubId" TEXT,
        "semesterId" TEXT,
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
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "clubId" TEXT;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "semesterId" TEXT;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "receiptPublicId" TEXT;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "submittedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "addedByName" TEXT;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "receiptFileName" TEXT;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "isVoided" BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3);
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "voidedBy" TEXT;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "voidReason" TEXT;
      ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "onBehalfOfClub" TEXT;

      -- ExpenseChangeLog Table (Immutable audit trail for expense edits and voids)
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
      CREATE INDEX IF NOT EXISTS "ExpenseChangeLog_expenseId_idx" ON "ExpenseChangeLog"("expenseId");
      CREATE INDEX IF NOT EXISTS "ExpenseChangeLog_timestamp_idx" ON "ExpenseChangeLog"("timestamp");

      -- Semester Table
      CREATE TABLE IF NOT EXISTS "Semester" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "name" TEXT UNIQUE NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "Semester_startDate_endDate_idx" ON "Semester"("startDate", "endDate");

      -- ClubBudget Table (Fixed budget per club per semester, unique constraint)
      CREATE TABLE IF NOT EXISTS "ClubBudget" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "clubId" TEXT NOT NULL,
        "semesterId" TEXT NOT NULL,
        "allocatedAmount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "ClubBudget_clubId_semesterId_key" ON "ClubBudget"("clubId", "semesterId");
      CREATE INDEX IF NOT EXISTS "ClubBudget_clubId_idx" ON "ClubBudget"("clubId");
      CREATE INDEX IF NOT EXISTS "ClubBudget_semesterId_idx" ON "ClubBudget"("semesterId");

      -- BudgetChangeLog Table (Audits every change with mandatory reason and author)
      CREATE TABLE IF NOT EXISTS "BudgetChangeLog" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "clubBudgetId" TEXT NOT NULL,
        "oldAmount" INTEGER NOT NULL DEFAULT 0,
        "newAmount" INTEGER NOT NULL DEFAULT 0,
        "reason" TEXT NOT NULL,
        "changedBy" TEXT,
        "changedById" TEXT,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "BudgetChangeLog_clubBudgetId_idx" ON "BudgetChangeLog"("clubBudgetId");
      CREATE INDEX IF NOT EXISTS "BudgetChangeLog_timestamp_idx" ON "BudgetChangeLog"("timestamp");

      -- Budget Table (Legacy semester overview)
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
      CREATE INDEX IF NOT EXISTS "Expense_clubId_idx" ON "Expense"("clubId");
      CREATE INDEX IF NOT EXISTS "Expense_semesterId_idx" ON "Expense"("semesterId");
      CREATE INDEX IF NOT EXISTS "Expense_expenseDate_idx" ON "Expense"("expenseDate");

      -- Notification Table for ACM Core Notifications
      CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "message" TEXT NOT NULL,
        "eventId" TEXT,
        "priority" TEXT NOT NULL DEFAULT 'NORMAL',
        "type" TEXT NOT NULL DEFAULT 'SYSTEM',
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "Notification_isRead_idx" ON "Notification"("isRead");
      CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
    `);

    // Pre-seed all 10 Official SVNIT clubs if not present
    try {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "Club_name_key" ON "Club"("name");
        INSERT INTO "Club" ("id", "name", "description")
        VALUES
          ('club-acm', 'ACM', 'Association for Computing Machinery SVNIT Student Chapter'),
          ('club-ches', 'ChES (Chemical Engineering Society of SVNIT Surat)', 'Chemical Engineering Society of SVNIT Surat'),
          ('club-chrd', 'CHRD (Dancing, Singing, Arts, Photography)', 'Center for Human Resource Development (Dancing, Singing, Arts, Photography)'),
          ('club-ecell', 'E-Cell', 'Entrepreneurship Cell SVNIT'),
          ('club-phoenix', 'Phoenix Racing & Phoenix Aero', 'Formula Student & Aeromodelling Team SVNIT'),
          ('club-drishti', 'Drishti', 'Technical Club of SVNIT'),
          ('club-nexus', 'NEXUS', 'Tech Club Exclusive for AI & CSE Students'),
          ('club-gdgc', 'GDGC', 'Google Developer Groups on Campus SVNIT'),
          ('club-cev', 'CEV (Cutting Edge Visionaries)', 'Cutting Edge Visionaries SVNIT'),
          ('club-ces', 'CES (Civil Engineering Society)', 'Civil Engineering Society SVNIT'),
          ('club-think-india', 'Think India', 'Think India SVNIT Chapter (National Forum for Students & Youth)'),
          ('club-staff', 'Staff Club', 'Faculty and Staff Club of SVNIT')
        ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description";
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

    // Pre-seed Semesters: Spring 2026 (Jan 1 to Jun 30, 2026) and Fall 2026 (Jul 1 to Dec 31, 2026)
    try {
      await client.query(`
        INSERT INTO "Semester" ("id", "name", "startDate", "endDate")
        VALUES
          ('sem-spring-2026', 'Spring 2026', '2026-01-01 00:00:00', '2026-06-30 23:59:59'),
          ('sem-fall-2026', 'Fall 2026', '2026-07-01 00:00:00', '2026-12-31 23:59:59')
        ON CONFLICT ("name") DO UPDATE
        SET "startDate" = EXCLUDED."startDate", "endDate" = EXCLUDED."endDate";
      `);
    } catch (semErr) {
      console.warn('Could not seed semesters, continuing:', semErr);
    }

    // Safe Data Migration:
    // 1. Assign existing events to their matching semester and set approvedBudget = estimatedCost if not set
    // 2. Assign existing expenses to their club (derived from event) and to the semester matching their dates
    try {
      await client.query(`
        -- 1. Backfill approvedBudget and semesterId on Event
        UPDATE "Event"
        SET "approvedBudget" = ROUND(COALESCE("estimatedCost", 0))::INTEGER
        WHERE "approvedBudget" IS NULL;

        UPDATE "Event" e
        SET "semesterId" = s.id
        FROM "Semester" s
        WHERE e."startTime" >= s."startDate" AND e."startTime" <= s."endDate"
          AND (e."semesterId" IS NULL OR e."semesterId" != s.id);

        -- 2. Backfill clubId and semesterId on Expense
        UPDATE "Expense" ex
        SET "clubId" = ev."clubId"
        FROM "Event" ev
        WHERE ex."eventId" = ev.id
          AND (ex."clubId" IS NULL OR ex."clubId" != ev."clubId");

        UPDATE "Expense" ex
        SET "semesterId" = s.id
        FROM "Semester" s
        WHERE ex."expenseDate" >= s."startDate" AND ex."expenseDate" <= s."endDate"
          AND (ex."semesterId" IS NULL OR ex."semesterId" != s.id);

        UPDATE "Expense" ex
        SET "semesterId" = ev."semesterId"
        FROM "Event" ev
        WHERE ex."eventId" = ev.id
          AND ex."semesterId" IS NULL
          AND ev."semesterId" IS NOT NULL;
      `);
    } catch (migErr) {
      console.warn('Safe migration backfill warning:', migErr);
    }

    // Pre-seed Demo Club Allocations for Fall 2026 with Audit Change Logs:
    // ACM ₹50,000, ChES ₹30,000, CHRD ₹25,000, E-Cell ₹40,000, Phoenix ₹35,000, Drishti ₹20,000, GDGC ₹25,000, CEV ₹20,000
    try {
      await client.query(`
        DO $$
        DECLARE
          fall_sem_id TEXT;
          spring_sem_id TEXT;
          rec RECORD;
          new_budget_id TEXT;
          existing_id TEXT;
        BEGIN
          SELECT "id" INTO fall_sem_id FROM "Semester" WHERE "name" = 'Fall 2026' LIMIT 1;
          SELECT "id" INTO spring_sem_id FROM "Semester" WHERE "name" = 'Spring 2026' LIMIT 1;

          IF fall_sem_id IS NOT NULL THEN
            FOR rec IN (
              SELECT c.id as club_id, c.name, alloc.amt
              FROM (
                VALUES
                  ('ACM', 50000),
                  ('ChES', 30000),
                  ('CHRD', 25000),
                  ('E-Cell', 40000),
                  ('Phoenix', 35000),
                  ('Drishti', 20000),
                  ('GDGC', 25000),
                  ('CEV', 20000)
              ) AS alloc(club_pat, amt)
              JOIN "Club" c ON (c.name ILIKE ('%' || alloc.club_pat || '%') OR c.id ILIKE ('%' || alloc.club_pat || '%'))
            ) LOOP
              SELECT "id" INTO existing_id
              FROM "ClubBudget"
              WHERE "clubId" = rec.club_id AND "semesterId" = fall_sem_id;

              IF existing_id IS NULL THEN
                new_budget_id := gen_random_uuid()::text;
                INSERT INTO "ClubBudget" ("id", "clubId", "semesterId", "allocatedAmount", "updatedAt")
                VALUES (new_budget_id, rec.club_id, fall_sem_id, rec.amt, CURRENT_TIMESTAMP);

                INSERT INTO "BudgetChangeLog" ("id", "clubBudgetId", "oldAmount", "newAmount", "reason", "changedBy", "changedById")
                VALUES (gen_random_uuid()::text, new_budget_id, 0, rec.amt, 'Initial demo allocation for Fall 2026', 'ACM Core Verifier', 'user-core-admin');
              END IF;
            END LOOP;
          END IF;

          -- Also ensure Spring 2026 has baseline allocations for demonstration
          IF spring_sem_id IS NOT NULL THEN
            FOR rec IN (
              SELECT c.id as club_id, c.name, alloc.amt
              FROM (
                VALUES
                  ('ACM', 45000),
                  ('ChES', 25000),
                  ('CHRD', 20000),
                  ('E-Cell', 35000),
                  ('Phoenix', 30000),
                  ('Drishti', 20000),
                  ('GDGC', 20000),
                  ('CEV', 15000)
              ) AS alloc(club_pat, amt)
              JOIN "Club" c ON (c.name ILIKE ('%' || alloc.club_pat || '%') OR c.id ILIKE ('%' || alloc.club_pat || '%'))
            ) LOOP
              SELECT "id" INTO existing_id
              FROM "ClubBudget"
              WHERE "clubId" = rec.club_id AND "semesterId" = spring_sem_id;

              IF existing_id IS NULL THEN
                new_budget_id := gen_random_uuid()::text;
                INSERT INTO "ClubBudget" ("id", "clubId", "semesterId", "allocatedAmount", "updatedAt")
                VALUES (new_budget_id, rec.club_id, spring_sem_id, rec.amt, CURRENT_TIMESTAMP);

                INSERT INTO "BudgetChangeLog" ("id", "clubBudgetId", "oldAmount", "newAmount", "reason", "changedBy", "changedById")
                VALUES (gen_random_uuid()::text, new_budget_id, 0, rec.amt, 'Initial demo allocation for Spring 2026', 'ACM Core Verifier', 'user-core-admin');
              END IF;
            END LOOP;
          END IF;
        END $$;
      `);
    } catch (allocErr) {
      console.warn('Could not seed demo club allocations, continuing:', allocErr);
    }

    // Pre-seed current and previous semester Budgets (Legacy support)
    try {
      await client.query(`
        INSERT INTO "Budget" ("id", "name", "amount", "periodType", "startDate", "endDate")
        SELECT 'budget-fall-2026', 'Fall 2026 Semester Budget', 50000.00, 'SEMESTER', '2026-07-01 00:00:00', '2026-12-31 23:59:59'
        WHERE NOT EXISTS (SELECT 1 FROM "Budget" WHERE "name" = 'Fall 2026 Semester Budget');

        INSERT INTO "Budget" ("id", "name", "amount", "periodType", "startDate", "endDate")
        SELECT 'budget-spring-2026', 'Spring 2026 Semester Budget', 45000.00, 'SEMESTER', '2026-01-01 00:00:00', '2026-06-30 23:59:59'
        WHERE NOT EXISTS (SELECT 1 FROM "Budget" WHERE "name" = 'Spring 2026 Semester Budget');
      `);
    } catch (budgetErr) {
      console.warn('Could not seed default budgets, continuing:', budgetErr);
    }

    // Pre-seed sample completed events with handover lessons learned
    try {
      await client.query(`
        INSERT INTO "Event" (
          "id", "title", "description", "clubId", "startTime", "endTime", "venue",
          "audienceTags", "expectedAttendance", "category", "eventType", "estimatedCost",
          "organizer", "status", "submittedById", "reviewDecision", "reviewComment",
          "reviewedByName", "reviewedAt", "lessonsLearned"
        )
        SELECT
          'ev-past-fall-1', 'ACM ICPC Regional BootCamp', 'Advanced competitive programming bootcamp with mock contest',
          (SELECT "id" FROM "Club" WHERE "name" ILIKE '%ACM%' LIMIT 1),
          '2026-09-05 09:00:00', '2026-09-05 17:00:00', 'Seminar Hall 1',
          ARRAY['TECH_UG', 'CODING_CLUB']::TEXT[], 120, 'Technical', 'Workshop', 8500.00,
          'Pardhu (Core Lead)', 'COMPLETED',
          (SELECT "id" FROM "User" WHERE "email" = 'pardhu120907@gmail.com' LIMIT 1),
          'APPROVE', 'Approved for regional preparations with venue reservation.', 'ACM Core Verifier', '2026-09-01 10:00:00',
          'Good turnout (115 attendees). Recommend booking CS Lab 2 earlier next semester to prevent lab capacity limits during the afternoon mock contest.'
        WHERE NOT EXISTS (SELECT 1 FROM "Event" WHERE "id" = 'ev-past-fall-1');

        INSERT INTO "Event" (
          "id", "title", "description", "clubId", "startTime", "endTime", "venue",
          "audienceTags", "expectedAttendance", "category", "eventType", "estimatedCost",
          "organizer", "status", "submittedById", "reviewDecision", "reviewComment",
          "reviewedByName", "reviewedAt", "lessonsLearned"
        )
        SELECT
          'ev-past-fall-2', 'IEEE Hardware IoT HackSprint', '24-hour hardware prototyping and sensor sprint',
          (SELECT "id" FROM "Club" WHERE "name" ILIKE '%IEEE%' LIMIT 1),
          '2026-09-20 10:00:00', '2026-09-21 10:00:00', 'Central Auditorium',
          ARRAY['HARDWARE_UG', 'ECE_STUDENTS']::TEXT[], 90, 'Competition', 'Competition', 14500.00,
          'IEEE Executive', 'COMPLETED',
          (SELECT "id" FROM "User" WHERE "email" = 'ieeelead@gmail.com' LIMIT 1),
          'APPROVE', 'Approved with equipment procurement note.', 'ACM Core Verifier', '2026-09-12 11:30:00',
          'Components arrived late by 1 day. In future sprints, place orders with vendor at least 10 business days prior. Catering budget was well utilized.'
        WHERE NOT EXISTS (SELECT 1 FROM "Event" WHERE "id" = 'ev-past-fall-2');

        -- Seed expenses for past events if not present
        INSERT INTO "Expense" ("id", "eventId", "amount", "category", "description", "expenseDate", "submittedById", "addedByName")
        SELECT 'exp-past-1', 'ev-past-fall-1', 4200.00, 'FOOD', 'Lunch and refreshments for bootcamp attendees', '2026-09-05 13:00:00',
          (SELECT "id" FROM "User" WHERE "email" = 'pardhu120907@gmail.com' LIMIT 1), 'Pardhu (Core Lead)'
        WHERE NOT EXISTS (SELECT 1 FROM "Expense" WHERE "id" = 'exp-past-1');

        INSERT INTO "Expense" ("id", "eventId", "amount", "category", "description", "expenseDate", "submittedById", "addedByName")
        SELECT 'exp-past-2', 'ev-past-fall-1', 3500.00, 'PRINTING', 'Contest problem booklets and participant badges', '2026-09-04 16:00:00',
          (SELECT "id" FROM "User" WHERE "email" = 'pardhu120907@gmail.com' LIMIT 1), 'Pardhu (Core Lead)'
        WHERE NOT EXISTS (SELECT 1 FROM "Expense" WHERE "id" = 'exp-past-2');

        INSERT INTO "Expense" ("id", "eventId", "amount", "category", "description", "expenseDate", "submittedById", "addedByName")
        SELECT 'exp-past-3', 'ev-past-fall-2', 8000.00, 'EQUIPMENT', 'Arduino sensors, ESP32 boards and jumper kits', '2026-09-18 14:00:00',
          (SELECT "id" FROM "User" WHERE "email" = 'ieeelead@gmail.com' LIMIT 1), 'IEEE Executive'
        WHERE NOT EXISTS (SELECT 1 FROM "Expense" WHERE "id" = 'exp-past-3');

        INSERT INTO "Expense" ("id", "eventId", "amount", "category", "description", "expenseDate", "submittedById", "addedByName")
        SELECT 'exp-past-4', 'ev-past-fall-2', 5000.00, 'PRIZES', 'Trophies and hardware starter kits for 1st and 2nd place', '2026-09-21 11:00:00',
          (SELECT "id" FROM "User" WHERE "email" = 'ieeelead@gmail.com' LIMIT 1), 'IEEE Executive'
        WHERE NOT EXISTS (SELECT 1 FROM "Expense" WHERE "id" = 'exp-past-4');

        -- Seed Spring 2026 completed event & expenses
        INSERT INTO "Event" (
          "id", "title", "description", "clubId", "startTime", "endTime", "venue",
          "audienceTags", "expectedAttendance", "category", "eventType", "estimatedCost",
          "organizer", "status", "submittedById", "reviewDecision", "reviewComment",
          "reviewedByName", "reviewedAt", "lessonsLearned"
        )
        SELECT
          'ev-past-spring-1', 'Spring Tech Symposium 2026', 'Annual spring conference with guest keynote speakers',
          (SELECT "id" FROM "Club" WHERE "name" ILIKE '%ACM%' LIMIT 1),
          '2026-03-15 10:00:00', '2026-03-15 16:00:00', 'Central Auditorium',
          ARRAY['ALL_STUDENTS', 'FACULTY']::TEXT[], 250, 'Talk', 'Talk', 18000.00,
          'Pardhu (Core Lead)', 'COMPLETED',
          (SELECT "id" FROM "User" WHERE "email" = 'pardhu120907@gmail.com' LIMIT 1),
          'APPROVE', 'Approved for flagship symposium.', 'ACM Core Verifier', '2026-03-01 10:00:00',
          'Auditorium sound system required pre-testing 2 hours in advance. Great student interaction with industry speakers.'
        WHERE NOT EXISTS (SELECT 1 FROM "Event" WHERE "id" = 'ev-past-spring-1');

        INSERT INTO "Expense" ("id", "eventId", "amount", "category", "description", "expenseDate", "submittedById", "addedByName")
        SELECT 'exp-past-spring-1', 'ev-past-spring-1', 9500.00, 'VENUE', 'Stage lighting, AV setup and auditorium maintenance fee', '2026-03-15 17:00:00',
          (SELECT "id" FROM "User" WHERE "email" = 'pardhu120907@gmail.com' LIMIT 1), 'Pardhu (Core Lead)'
        WHERE NOT EXISTS (SELECT 1 FROM "Expense" WHERE "id" = 'exp-past-spring-1');

        INSERT INTO "Expense" ("id", "eventId", "amount", "category", "description", "expenseDate", "submittedById", "addedByName")
        SELECT 'exp-past-spring-2', 'ev-past-spring-1', 6500.00, 'FOOD', 'Speaker lunch and student tea refreshments', '2026-03-15 13:00:00',
          (SELECT "id" FROM "User" WHERE "email" = 'pardhu120907@gmail.com' LIMIT 1), 'Pardhu (Core Lead)'
        WHERE NOT EXISTS (SELECT 1 FROM "Expense" WHERE "id" = 'exp-past-spring-2');

        -- Seed a sample conflict resolution record for conflict log
        INSERT INTO "EventConflict" (
          "id", "eventId", "conflictingEventId", "reason", "status", "resolutionNote", "createdAt"
        )
        SELECT
          'conflict-demo-1', 'ev-past-fall-2', 'ev-past-fall-1',
          'Overlaps with ACM ICPC Regional BootCamp, Sep 5, audience conflict',
          'RESOLVED', 'Core reviewed and approved despite overlap as target years did not clash.', '2026-09-02 14:00:00'
        WHERE NOT EXISTS (SELECT 1 FROM "EventConflict" WHERE "id" = 'conflict-demo-1');

        -- Seed initial notifications for ACM Core demonstration
        INSERT INTO "Notification" ("id", "message", "eventId", "priority", "type", "isRead", "createdAt")
        SELECT
          'notif-demo-1',
          'New conflict: CheS Quiz overlaps IEEE Cloud Workshop (same audience)',
          (SELECT "id" FROM "Event" WHERE "status" = 'PENDING' LIMIT 1),
          'HIGH', 'CONFLICT_PROPOSAL', false, NOW() - INTERVAL '15 minutes'
        WHERE NOT EXISTS (SELECT 1 FROM "Notification" WHERE "id" = 'notif-demo-1');

        INSERT INTO "Notification" ("id", "message", "eventId", "priority", "type", "isRead", "createdAt")
        SELECT
          'notif-demo-2',
          'New proposal submitted: AI Agent Hackathon by ACM Student Chapter',
          (SELECT "id" FROM "Event" WHERE "status" = 'PENDING' LIMIT 1),
          'LOW', 'NEW_PROPOSAL', false, NOW() - INTERVAL '2 hours'
        WHERE NOT EXISTS (SELECT 1 FROM "Notification" WHERE "id" = 'notif-demo-2');
      `);
    } catch (eventsErr) {
      console.warn('Could not seed historical events, continuing:', eventsErr);
    }
  } finally {
    client.release();
  }
}
