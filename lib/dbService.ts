import { ensureDatabaseTables } from './initDb';
import { query } from './db';
import { randomUUID } from 'crypto';
import {
  UserRole,
  EventStatus,
  ConflictStatus,
  ExpenseCategory,
  BudgetPeriod,
} from './constants';

let isInitialized = false;

async function checkInit() {
  if (!isInitialized) {
    await ensureDatabaseTables();
    isInitialized = true;
  }
}

export const dbService = {
  // --- USERS ---
  async getUserByEmail(email: string) {
    await checkInit();
    const rows = await query('SELECT * FROM "User" WHERE email = $1 LIMIT 1', [
      email.toLowerCase().trim(),
    ]);
    return rows[0] || null;
  },

  async upsertUser(user: { id?: string; name: string; email: string; role: string; clubId?: string | null }) {
    await checkInit();
    const email = user.email.toLowerCase().trim();
    const id = user.id || randomUUID();
    const clubId = user.clubId !== undefined ? user.clubId : null;
    const rows = await query(
      `INSERT INTO "User" ("id", "name", "email", "role", "clubId", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT ("email") DO UPDATE
       SET "name" = EXCLUDED."name", 
           "role" = EXCLUDED."role", 
           "clubId" = EXCLUDED."clubId",
           "updatedAt" = NOW()
       RETURNING *`,
      [id, user.name, email, user.role, clubId]
    );
    return rows[0];
  },

  // --- CLUBS ---
  async getClubs() {
    await checkInit();
    return query('SELECT * FROM "Club" ORDER BY "name" ASC');
  },

  async getClubById(id: string) {
    await checkInit();
    const rows = await query('SELECT * FROM "Club" WHERE id = $1 LIMIT 1', [id]);
    return rows[0] || null;
  },

  // --- EVENTS ---
  async getEvents() {
    await checkInit();
    return query(`
      SELECT e.*,
        COALESCE(e."conflictFlags", ARRAY[]::TEXT[]) as flags,
        COALESCE(
          CASE WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'name', c.name, 'description', c.description) ELSE NULL END,
          json_build_object('id', e."clubId", 'name', 'General Campus Club', 'description', '')
        ) as club,
        COALESCE(
          CASE WHEN u.id IS NOT NULL THEN json_build_object('id', u.id, 'name', u.name, 'email', u.email) ELSE NULL END,
          json_build_object('id', e."submittedById", 'name', 'Campus Member', 'email', '')
        ) as "submittedBy",
        COALESCE(
          (SELECT json_agg(ex.*) FROM "Expense" ex WHERE ex."eventId" = e.id),
          '[]'::json
        ) as expenses
      FROM "Event" e
      LEFT JOIN "Club" c ON e."clubId" = c.id
      LEFT JOIN "User" u ON e."submittedById" = u.id
      ORDER BY e."startTime" ASC
    `);
  },

  async getEventById(id: string) {
    await checkInit();
    const rows = await query(
      `
      SELECT e.*,
        COALESCE(e."conflictFlags", ARRAY[]::TEXT[]) as flags,
        COALESCE(
          CASE WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'name', c.name, 'description', c.description) ELSE NULL END,
          json_build_object('id', e."clubId", 'name', 'General Campus Club', 'description', '')
        ) as club,
        COALESCE(
          CASE WHEN u.id IS NOT NULL THEN json_build_object('id', u.id, 'name', u.name, 'email', u.email) ELSE NULL END,
          json_build_object('id', e."submittedById", 'name', 'Campus Member', 'email', '')
        ) as "submittedBy",
        COALESCE(
          (SELECT json_agg(ex.*) FROM "Expense" ex WHERE ex."eventId" = e.id),
          '[]'::json
        ) as expenses,
        COALESCE(
          (SELECT json_agg(ec.*) FROM "EventConflict" ec WHERE ec."eventId" = e.id OR ec."conflictingEventId" = e.id),
          '[]'::json
        ) as conflicts
      FROM "Event" e
      LEFT JOIN "Club" c ON e."clubId" = c.id
      LEFT JOIN "User" u ON e."submittedById" = u.id
      WHERE e.id = $1
      LIMIT 1
    `,
      [id]
    );
    return rows[0] || null;
  },

  async createEvent(data: {
    title: string;
    description?: string | null;
    clubId: string;
    startTime: Date;
    endTime: Date;
    venue: string;
    audienceTags: string[];
    expectedAttendance?: number | null;
    category?: string | null;
    eventType?: string | null;
    estimatedCost?: number | null;
    organizer?: string | null;
    status?: string;
    conflictFlags?: string[];
    submittedById: string;
  }) {
    await checkInit();
    const eventId = randomUUID();
    const flags = data.conflictFlags || [];
    const eventType = data.eventType || data.category || 'Workshop';
    const estimatedCost = data.estimatedCost !== undefined && data.estimatedCost !== null ? Number(data.estimatedCost) : 0;
    const organizer = data.organizer || 'Club Organizer';
    const rows = await query(
      `
      INSERT INTO "Event" (
        "id", "title", "description", "clubId", "startTime", "endTime",
        "venue", "audienceTags", "expectedAttendance", "category",
        "eventType", "estimatedCost", "organizer",
        "status", "conflictFlags", "flags", "submittedById", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15, $16, NOW())
      RETURNING *
    `,
      [
        eventId,
        data.title,
        data.description || null,
        data.clubId,
        data.startTime,
        data.endTime,
        data.venue,
        data.audienceTags || [],
        data.expectedAttendance || 50,
        data.category || eventType,
        eventType,
        estimatedCost,
        organizer,
        data.status || EventStatus.PENDING,
        flags,
        data.submittedById,
      ]
    );
    return this.getEventById(rows[0].id);
  },

  async updateEvent(id: string, updates: Partial<{
    title: string;
    description: string | null;
    venue: string;
    startTime: Date;
    endTime: Date;
    audienceTags: string[];
    expectedAttendance: number | null;
    category: string | null;
    eventType: string | null;
    estimatedCost: number | null;
    organizer: string | null;
    status: string;
    conflictFlags: string[];
  }>) {
    await checkInit();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        fields.push(`"${key}" = $${idx++}`);
        values.push(val);
        if (key === 'conflictFlags') {
          fields.push(`"flags" = $${idx++}`);
          values.push(val);
        }
      }
    }

    if (fields.length === 0) return this.getEventById(id);

    fields.push(`"updatedAt" = NOW()`);
    values.push(id);

    await query(
      `UPDATE "Event" SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );
    return this.getEventById(id);
  },

  async setEventConflictFlags(eventId: string, flags: string[]) {
    await checkInit();
    await query(
      `UPDATE "Event" SET "conflictFlags" = $1, "flags" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [flags, eventId]
    );
  },

  async replaceEventConflicts(
    eventId: string,
    conflicts: Array<{
      conflictingEventId?: string;
      reason: string;
      overlapStart?: Date | null;
      overlapEnd?: Date | null;
      status?: string;
    }>
  ) {
    await checkInit();
    // Clear old conflicts where this event is the primary proposal
    await query(`DELETE FROM "EventConflict" WHERE "eventId" = $1`, [eventId]);

    for (const c of conflicts) {
      if (!c.conflictingEventId) continue;
      const cid = randomUUID();
      await query(
        `INSERT INTO "EventConflict" ("id", "eventId", "conflictingEventId", "reason", "overlapStart", "overlapEnd", "status", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          cid,
          eventId,
          c.conflictingEventId,
          c.reason,
          c.overlapStart || null,
          c.overlapEnd || null,
          c.status || ConflictStatus.FLAGGED,
        ]
      );
    }
  },

  async deleteEvent(id: string) {
    await checkInit();
    await query('DELETE FROM "EventConflict" WHERE "eventId" = $1 OR "conflictingEventId" = $1', [id]);
    const rows = await query('DELETE FROM "Event" WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },

  // --- CONFLICTS ---
  async getConflicts() {
    await checkInit();
    return query(`
      SELECT ec.*,
        json_build_object('id', e1.id, 'title', e1.title, 'venue', e1.venue, 'startTime', e1."startTime", 'endTime', e1."endTime", 'audienceTags', e1."audienceTags", 'clubName', COALESCE(c1.name, 'Campus Club')) as event,
        json_build_object('id', e2.id, 'title', e2.title, 'venue', e2.venue, 'startTime', e2."startTime", 'endTime', e2."endTime", 'audienceTags', e2."audienceTags", 'clubName', COALESCE(c2.name, 'Campus Club')) as "conflictingEvent",
        CASE WHEN u.id IS NOT NULL THEN json_build_object('id', u.id, 'name', u.name) ELSE NULL END as "reviewedBy"
      FROM "EventConflict" ec
      JOIN "Event" e1 ON ec."eventId" = e1.id
      LEFT JOIN "Club" c1 ON e1."clubId" = c1.id
      JOIN "Event" e2 ON ec."conflictingEventId" = e2.id
      LEFT JOIN "Club" c2 ON e2."clubId" = c2.id
      LEFT JOIN "User" u ON ec."reviewedById" = u.id
      ORDER BY ec."createdAt" DESC
    `);
  },

  async getConflictById(id: string) {
    await checkInit();
    const rows = await query(
      `
      SELECT ec.*,
        json_build_object('id', e1.id, 'title', e1.title, 'venue', e1.venue, 'startTime', e1."startTime", 'endTime', e1."endTime", 'audienceTags', e1."audienceTags", 'clubName', COALESCE(c1.name, 'Campus Club')) as event,
        json_build_object('id', e2.id, 'title', e2.title, 'venue', e2.venue, 'startTime', e2."startTime", 'endTime', e2."endTime", 'audienceTags', e2."audienceTags", 'clubName', COALESCE(c2.name, 'Campus Club')) as "conflictingEvent",
        CASE WHEN u.id IS NOT NULL THEN json_build_object('id', u.id, 'name', u.name) ELSE NULL END as "reviewedBy"
      FROM "EventConflict" ec
      JOIN "Event" e1 ON ec."eventId" = e1.id
      LEFT JOIN "Club" c1 ON e1."clubId" = c1.id
      JOIN "Event" e2 ON ec."conflictingEventId" = e2.id
      LEFT JOIN "Club" c2 ON e2."clubId" = c2.id
      LEFT JOIN "User" u ON ec."reviewedById" = u.id
      WHERE ec.id = $1
      LIMIT 1
    `,
      [id]
    );
    return rows[0] || null;
  },

  async createConflictRecord(conflict: {
    eventId: string;
    conflictingEventId: string;
    reason: string;
    overlapStart?: Date | null;
    overlapEnd?: Date | null;
    status?: string;
  }) {
    await checkInit();
    const conflictId = randomUUID();
    const rows = await query(
      `
      INSERT INTO "EventConflict" (
        "id", "eventId", "conflictingEventId", "reason", "overlapStart", "overlapEnd", "status", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT ("eventId", "conflictingEventId") DO UPDATE
      SET "reason" = EXCLUDED."reason",
          "overlapStart" = EXCLUDED."overlapStart",
          "overlapEnd" = EXCLUDED."overlapEnd",
          "updatedAt" = NOW()
      RETURNING *
    `,
      [
        conflictId,
        conflict.eventId,
        conflict.conflictingEventId,
        conflict.reason,
        conflict.overlapStart || null,
        conflict.overlapEnd || null,
        conflict.status || ConflictStatus.FLAGGED,
      ]
    );
    return rows[0];
  },

  async updateConflict(id: string, updates: {
    status?: string;
    reviewedById?: string | null;
    resolutionNote?: string | null;
  }) {
    await checkInit();
    const rows = await query(
      `
      UPDATE "EventConflict"
      SET "status" = COALESCE($1, "status"),
          "reviewedById" = COALESCE($2, "reviewedById"),
          "resolutionNote" = COALESCE($3, "resolutionNote"),
          "updatedAt" = NOW()
      WHERE id = $4
      RETURNING *
    `,
      [updates.status || null, updates.reviewedById || null, updates.resolutionNote || null, id]
    );
    return rows[0] || null;
  },

  // --- EXPENSES ---
  async getExpenses() {
    await checkInit();
    return query(`
      SELECT ex.*,
        json_build_object('id', ev.id, 'title', ev.title) as event,
        json_build_object('id', u.id, 'name', u.name) as "submittedBy"
      FROM "Expense" ex
      LEFT JOIN "Event" ev ON ex."eventId" = ev.id
      LEFT JOIN "User" u ON ex."submittedById" = u.id
      ORDER BY ex."expenseDate" DESC
    `);
  },

  async getExpenseById(id: string) {
    await checkInit();
    const rows = await query(
      `
      SELECT ex.*,
        json_build_object('id', ev.id, 'title', ev.title) as event,
        json_build_object('id', u.id, 'name', u.name) as "submittedBy"
      FROM "Expense" ex
      LEFT JOIN "Event" ev ON ex."eventId" = ev.id
      LEFT JOIN "User" u ON ex."submittedById" = u.id
      WHERE ex.id = $1
      LIMIT 1
    `,
      [id]
    );
    return rows[0] || null;
  },

  async createExpense(data: {
    eventId?: string | null;
    amount: number;
    category: string;
    description?: string | null;
    expenseDate?: Date;
    receiptUrl?: string | null;
    receiptPublicId?: string | null;
    submittedById: string;
  }) {
    await checkInit();
    const expenseId = randomUUID();
    const rows = await query(
      `
      INSERT INTO "Expense" (
        "id", "eventId", "amount", "category", "description", "expenseDate",
        "receiptUrl", "receiptPublicId", "submittedById", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `,
      [
        expenseId,
        data.eventId || null,
        data.amount,
        data.category,
        data.description || null,
        data.expenseDate || new Date(),
        data.receiptUrl || null,
        data.receiptPublicId || null,
        data.submittedById,
      ]
    );
    return this.getExpenseById(rows[0].id);
  },

  async updateExpense(id: string, updates: Partial<{
    amount: number;
    category: string;
    description: string | null;
    expenseDate: Date;
    receiptUrl: string | null;
    receiptPublicId: string | null;
    eventId: string | null;
  }>) {
    await checkInit();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        fields.push(`"${key}" = $${idx++}`);
        values.push(val);
      }
    }

    if (fields.length === 0) return this.getExpenseById(id);

    fields.push(`"updatedAt" = NOW()`);
    values.push(id);

    await query(
      `UPDATE "Expense" SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );
    return this.getExpenseById(id);
  },

  async deleteExpense(id: string) {
    await checkInit();
    const rows = await query('DELETE FROM "Expense" WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },

  // --- BUDGETS ---
  async getBudgets() {
    await checkInit();
    return query('SELECT * FROM "Budget" ORDER BY "startDate" DESC');
  },

  async getBudgetById(id: string) {
    await checkInit();
    const rows = await query('SELECT * FROM "Budget" WHERE id = $1 LIMIT 1', [id]);
    return rows[0] || null;
  },

  async createBudget(data: {
    name: string;
    amount: number;
    periodType?: string;
    startDate: Date;
    endDate: Date;
  }) {
    await checkInit();
    const budgetId = randomUUID();
    const rows = await query(
      `
      INSERT INTO "Budget" ("id", "name", "amount", "periodType", "startDate", "endDate", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `,
      [
        budgetId,
        data.name,
        data.amount,
        data.periodType || BudgetPeriod.SEMESTER,
        data.startDate,
        data.endDate,
      ]
    );
    return rows[0];
  },

  async updateBudget(id: string, updates: Partial<{
    name: string;
    amount: number;
    periodType: string;
    startDate: Date;
    endDate: Date;
  }>) {
    await checkInit();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        fields.push(`"${key}" = $${idx++}`);
        values.push(val);
      }
    }

    if (fields.length === 0) return this.getBudgetById(id);

    fields.push(`"updatedAt" = NOW()`);
    values.push(id);

    await query(
      `UPDATE "Budget" SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );
    return this.getBudgetById(id);
  },
};
