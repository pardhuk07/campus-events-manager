import { query } from './db';
import { randomUUID } from 'crypto';
import { dbService } from './dbService';

export interface SemesterRecord {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ClubBudgetRecord {
  id: string;
  clubId: string;
  semesterId: string;
  allocatedAmount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface BudgetChangeLogRecord {
  id: string;
  clubBudgetId: string;
  oldAmount: number;
  newAmount: number;
  reason: string;
  changedBy: string | null;
  changedById: string | null;
  timestamp: string | Date;
  createdAt: string | Date;
}

export interface MonthlySpendingItem {
  month: string;
  monthIndex: number;
  year: number;
  spent: number;
  expenseCount: number;
}

export interface PerEventRow {
  id: string;
  title: string;
  status: string;
  startTime: string | Date;
  endTime: string | Date;
  venue: string;
  eventType: string;
  organizer: string;
  budget: number;
  spent: number;
  left: number;
  expenses: any[];
}

export interface ExpenseChangeLogRecord {
  id: string;
  expenseId: string;
  action: 'CREATED' | 'EDITED' | 'VOIDED';
  performedBy: string;
  performedById: string | null;
  onBehalfOfClub: string | null;
  reason: string;
  oldValues: any;
  newValues: any;
  timestamp: string | Date;
  createdAt: string | Date;
}

export interface NeedsAttentionItem {
  expenseId: string;
  title: string;
  amount: number;
  expenseDate: string;
  eventTitle?: string;
  eventId?: string;
  reason: string;
}

export interface ClubBudgetDetails {
  club: {
    id: string;
    name: string;
    description?: string;
  };
  semester: {
    id: string;
    name: string;
    startDate: string | Date;
    endDate: string | Date;
  };
  allocated: number;
  committed: number;
  spent: number;
  remaining: number;
  availableToPlan: number;
  perEventRows: PerEventRow[];
  monthlySpending: MonthlySpendingItem[];
  expenses: any[];
  needsAttention: NeedsAttentionItem[];
  changeLogs?: BudgetChangeLogRecord[];
}

export function isDateInSemester(
  dateInput: Date | string,
  semester: { startDate: Date | string; endDate: Date | string }
): boolean {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return false;
  const semStart = new Date(semester.startDate);
  const semEnd = new Date(semester.endDate);

  const startMs = Math.min(
    new Date(semStart.getFullYear(), semStart.getMonth(), semStart.getDate(), 0, 0, 0, 0).getTime(),
    new Date(Date.UTC(semStart.getUTCFullYear(), semStart.getUTCMonth(), semStart.getUTCDate(), 0, 0, 0, 0)).getTime()
  );

  const endMs = Math.max(
    new Date(semEnd.getFullYear(), semEnd.getMonth(), semEnd.getDate(), 23, 59, 59, 999).getTime(),
    new Date(Date.UTC(semEnd.getUTCFullYear(), semEnd.getUTCMonth(), semEnd.getUTCDate(), 23, 59, 59, 999)).getTime()
  );

  const dMs = d.getTime();
  return dMs >= startMs && dMs <= endMs;
}

export const budgetService = {
  isDateInSemester,
  // --- SEMESTERS ---
  async getSemesters(): Promise<SemesterRecord[]> {
    return query<SemesterRecord>(`SELECT * FROM "Semester" ORDER BY "startDate" DESC`);
  },

  async getSemesterById(idOrName: string): Promise<SemesterRecord | null> {
    const rows = await query<SemesterRecord>(
      `SELECT * FROM "Semester" WHERE "id" = $1 OR "name" ILIKE $1 LIMIT 1`,
      [idOrName.trim()]
    );
    return rows[0] || null;
  },

  async getActiveSemester(): Promise<SemesterRecord | null> {
    const now = new Date();
    const rows = await query<SemesterRecord>(
      `SELECT * FROM "Semester" 
       WHERE $1 >= "startDate" AND $1 <= "endDate"
       ORDER BY "startDate" DESC LIMIT 1`,
      [now]
    );
    if (rows[0]) return rows[0];

    // Fallback to Fall 2026, or the latest available semester
    const fallback = await query<SemesterRecord>(
      `SELECT * FROM "Semester" ORDER BY "startDate" DESC LIMIT 1`
    );
    return fallback[0] || null;
  },

  // --- CLUB BUDGET RECORD ---
  async getClubBudget(clubId: string, semesterId: string): Promise<ClubBudgetRecord | null> {
    const rows = await query<ClubBudgetRecord>(
      `SELECT * FROM "ClubBudget" WHERE "clubId" = $1 AND "semesterId" = $2 LIMIT 1`,
      [clubId, semesterId]
    );
    return rows[0] || null;
  },

  // --- UPSERT CLUB BUDGET (CORE ONLY, MANDATORY REASON & CHANGE LOG) ---
  async upsertClubBudget(params: {
    clubId: string;
    semesterId: string;
    allocatedAmount: number;
    reason: string;
    changedBy?: string | null;
    changedById?: string | null;
  }): Promise<{ budget: ClubBudgetRecord; changeLog: BudgetChangeLogRecord }> {
    const { clubId, semesterId, reason, changedBy, changedById } = params;

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw new Error('A reason is strictly required for creating or updating a club budget allocation.');
    }

    const roundedAmount = Math.round(Number(params.allocatedAmount));
    if (isNaN(roundedAmount) || roundedAmount < 0) {
      throw new Error('Budget allocation amount must be a positive integer in rupees.');
    }

    // Verify Club and Semester exist
    const club = await dbService.getClubById(clubId);
    if (!club) throw new Error(`Club with id '${clubId}' not found.`);

    const semester = await this.getSemesterById(semesterId);
    if (!semester) throw new Error(`Semester with id '${semesterId}' not found.`);

    // Check existing budget
    const existing = await this.getClubBudget(clubId, semester.id);
    const oldAmount = existing ? existing.allocatedAmount : 0;
    const budgetId = existing ? existing.id : randomUUID();

    let budgetRow: ClubBudgetRecord;
    if (existing) {
      const updated = await query<ClubBudgetRecord>(
        `UPDATE "ClubBudget"
         SET "allocatedAmount" = $1, "updatedAt" = NOW()
         WHERE "id" = $2
         RETURNING *`,
        [roundedAmount, existing.id]
      );
      budgetRow = updated[0];
    } else {
      const inserted = await query<ClubBudgetRecord>(
        `INSERT INTO "ClubBudget" ("id", "clubId", "semesterId", "allocatedAmount", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [budgetId, clubId, semester.id, roundedAmount]
      );
      budgetRow = inserted[0];
    }

    // Create Audit Change Log
    const logId = randomUUID();
    const logRows = await query<BudgetChangeLogRecord>(
      `INSERT INTO "BudgetChangeLog" ("id", "clubBudgetId", "oldAmount", "newAmount", "reason", "changedBy", "changedById", "timestamp", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        logId,
        budgetRow.id,
        oldAmount,
        roundedAmount,
        reason.trim(),
        changedBy || 'ACM Core Verifier',
        changedById || null,
      ]
    );

    return {
      budget: budgetRow,
      changeLog: logRows[0],
    };
  },

  async getBudgetChangeLogs(clubBudgetId: string): Promise<BudgetChangeLogRecord[]> {
    return query<BudgetChangeLogRecord>(
      `SELECT * FROM "BudgetChangeLog" WHERE "clubBudgetId" = $1 ORDER BY "timestamp" DESC`,
      [clubBudgetId]
    );
  },

  // --- EXPENSE AUDIT LOG & OPERATIONS ---
  async logExpenseChange(data: {
    expenseId: string;
    action: 'CREATED' | 'EDITED' | 'VOIDED';
    performedBy: string;
    performedById?: string | null;
    onBehalfOfClub?: string | null;
    reason: string;
    oldValues?: any;
    newValues?: any;
  }): Promise<ExpenseChangeLogRecord> {
    const id = randomUUID();
    const rows = await query<ExpenseChangeLogRecord>(
      `INSERT INTO "ExpenseChangeLog" (
        "id", "expenseId", "action", "performedBy", "performedById", "onBehalfOfClub",
        "reason", "oldValues", "newValues", "timestamp", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *`,
      [
        id,
        data.expenseId,
        data.action,
        data.performedBy,
        data.performedById || null,
        data.onBehalfOfClub || null,
        data.reason,
        data.oldValues ? JSON.stringify(data.oldValues) : null,
        data.newValues ? JSON.stringify(data.newValues) : null,
      ]
    );
    return rows[0];
  },

  async getExpenseHistory(expenseId: string): Promise<ExpenseChangeLogRecord[]> {
    return query<ExpenseChangeLogRecord>(
      `SELECT * FROM "ExpenseChangeLog" WHERE "expenseId" = $1 ORDER BY "timestamp" DESC`,
      [expenseId]
    );
  },

  async editExpense(
    expenseId: string,
    updates: {
      amount?: number;
      category?: string;
      expenseDate?: string | Date;
      description?: string;
      eventId?: string;
      receiptUrl?: string | null;
      receiptPublicId?: string | null;
      receiptFileName?: string | null;
    },
    meta: {
      performedBy: string;
      performedById?: string | null;
      reason: string;
      onBehalfOfClub?: string | null;
    }
  ) {
    if (!meta.reason || !meta.reason.trim()) {
      throw new Error('A reason is required to edit an expense.');
    }

    const existing = await dbService.getExpenseById(expenseId);
    if (!existing) {
      throw new Error(`Expense with ID '${expenseId}' not found.`);
    }

    if (existing.isVoided) {
      throw new Error('Cannot edit an expense that has already been voided.');
    }

    // If event is changed, ensure it belongs to the same club
    let targetEventId = existing.eventId;
    let targetSemesterId = existing.semesterId;
    if (updates.eventId && updates.eventId !== existing.eventId) {
      const newEvent = await dbService.getEventById(updates.eventId);
      if (!newEvent) {
        throw new Error('Target event does not exist.');
      }
      if (newEvent.clubId !== existing.clubId) {
        throw new Error('Cannot move an expense to an event of a different club.');
      }
      targetEventId = newEvent.id;
      if (newEvent.semesterId) {
        targetSemesterId = newEvent.semesterId;
      }
    }

    const oldValues = {
      amount: existing.amount,
      category: existing.category,
      description: existing.description,
      expenseDate: existing.expenseDate,
      eventId: existing.eventId,
      receiptUrl: existing.receiptUrl,
    };

    const newValues: any = {};
    const dbUpdates: any = {};

    if (updates.amount !== undefined) {
      const intAmount = Math.round(Number(updates.amount));
      if (isNaN(intAmount) || intAmount <= 0) {
        throw new Error('Amount must be greater than zero.');
      }
      dbUpdates.amount = intAmount;
      newValues.amount = intAmount;
    }

    if (updates.category) {
      dbUpdates.category = updates.category;
      newValues.category = updates.category;
    }

    if (updates.description !== undefined) {
      dbUpdates.description = updates.description.trim();
      newValues.description = updates.description.trim();
    }

    if (updates.expenseDate) {
      const d = new Date(updates.expenseDate);
      if (isNaN(d.getTime())) {
        throw new Error('Invalid expense date.');
      }
      dbUpdates.expenseDate = d;
      newValues.expenseDate = d.toISOString();
    }

    if (updates.receiptUrl !== undefined) {
      dbUpdates.receiptUrl = updates.receiptUrl;
      newValues.receiptUrl = updates.receiptUrl;
    }
    if (updates.receiptPublicId !== undefined) {
      dbUpdates.receiptPublicId = updates.receiptPublicId;
    }
    if (updates.receiptFileName !== undefined) {
      dbUpdates.receiptFileName = updates.receiptFileName;
    }

    if (updates.eventId !== undefined) {
      dbUpdates.eventId = targetEventId;
      newValues.eventId = targetEventId;
    }

    // Update in DB
    const updated = await dbService.updateExpense(expenseId, dbUpdates);

    // Write audit log
    await this.logExpenseChange({
      expenseId,
      action: 'EDITED',
      performedBy: meta.performedBy,
      performedById: meta.performedById,
      onBehalfOfClub: meta.onBehalfOfClub || existing.onBehalfOfClub,
      reason: meta.reason.trim(),
      oldValues,
      newValues,
    });

    return updated;
  },

  async voidExpense(
    expenseId: string,
    meta: {
      performedBy: string;
      performedById?: string | null;
      reason: string;
      onBehalfOfClub?: string | null;
    }
  ) {
    if (!meta.reason || !meta.reason.trim()) {
      throw new Error('A reason is strictly required to void an expense.');
    }

    const existing = await dbService.getExpenseById(expenseId);
    if (!existing) {
      throw new Error(`Expense with ID '${expenseId}' not found.`);
    }

    if (existing.isVoided) {
      throw new Error('Expense is already voided.');
    }

    // Soft delete: Mark isVoided = true, voidedAt, voidedBy, voidReason
    const rows = await query<any>(
      `UPDATE "Expense"
       SET "isVoided" = TRUE,
           "voidedAt" = NOW(),
           "voidedBy" = $1,
           "voidReason" = $2,
           "updatedAt" = NOW()
       WHERE id = $3
       RETURNING *`,
      [meta.performedBy, meta.reason.trim(), expenseId]
    );

    // Audit log
    await this.logExpenseChange({
      expenseId,
      action: 'VOIDED',
      performedBy: meta.performedBy,
      performedById: meta.performedById,
      onBehalfOfClub: meta.onBehalfOfClub || existing.onBehalfOfClub,
      reason: meta.reason.trim(),
      oldValues: { isVoided: false },
      newValues: {
        isVoided: true,
        voidedBy: meta.performedBy,
        voidReason: meta.reason.trim(),
      },
    });

    return rows[0];
  },

  async updateEventApprovedBudget(
    eventId: string,
    approvedBudget: number,
    meta?: {
      performedBy?: string;
      reason?: string;
    }
  ) {
    const intBudget = Math.round(Number(approvedBudget));
    if (isNaN(intBudget) || intBudget < 0) {
      throw new Error('Approved budget must be a non-negative integer in rupees.');
    }

    const rows = await query<any>(
      `UPDATE "Event"
       SET "approvedBudget" = $1, "updatedAt" = NOW()
       WHERE id = $2
       RETURNING *`,
      [intBudget, eventId]
    );
    return rows[0];
  },

  // --- EXPENSE CONTEXT DERIVATION (SERVER-SIDE ONLY) ---
  async deriveExpenseContext(eventId: string, expenseDate?: Date | string): Promise<{
    clubId: string;
    semesterId: string;
    event: any;
  }> {
    const event = await dbService.getEventById(eventId);
    if (!event) {
      throw new Error(`Cannot record expense: Linked event '${eventId}' does not exist.`);
    }

    const clubId = event.clubId;
    if (!clubId) {
      throw new Error(`Cannot record expense: Linked event '${eventId}' does not belong to any club.`);
    }

    const dateToMatch = expenseDate ? new Date(expenseDate) : new Date();

    // Find semester covering expenseDate
    const matchingSemesters = await query<SemesterRecord>(
      `SELECT * FROM "Semester"
       WHERE $1 >= "startDate" AND $1 <= "endDate"
       ORDER BY "startDate" DESC LIMIT 1`,
      [dateToMatch]
    );

    let semesterId = matchingSemesters[0]?.id;

    // Fallback: If expenseDate is outside known semesters, match with event's semester or active semester
    if (!semesterId && event.semesterId) {
      semesterId = event.semesterId;
    }
    if (!semesterId) {
      const active = await this.getActiveSemester();
      if (active) semesterId = active.id;
    }

    if (!semesterId) {
      throw new Error('No valid semester found to associate this expense.');
    }

    return {
      clubId,
      semesterId,
      event,
    };
  },

  // --- DETAILED CALCULATIONS FOR A CLUB AND SEMESTER ---
  async getClubBudgetDetails(clubId: string, semesterId: string): Promise<ClubBudgetDetails> {
    const club = await dbService.getClubById(clubId);
    if (!club) {
      throw new Error(`Club with id '${clubId}' not found.`);
    }

    const semester = await this.getSemesterById(semesterId);
    if (!semester) {
      throw new Error(`Semester with id '${semesterId}' not found.`);
    }

    const allSemesters = await this.getSemesters();
    const semStart = new Date(semester.startDate);
    const semEnd = new Date(semester.endDate);

    // 1. Allocated Amount
    const budgetRecord = await this.getClubBudget(clubId, semester.id);
    const allocated = budgetRecord ? Math.round(Number(budgetRecord.allocatedAmount)) : 0;

    // 2. Fetch all events for this club
    const allEvents = await query<any>(
      `SELECT e.*,
         COALESCE(e."approvedBudget", ROUND(COALESCE(e."estimatedCost", 0))::INT, 0) as "effectiveBudget"
       FROM "Event" e
       WHERE e."clubId" = $1
       ORDER BY e."startTime" ASC`,
      [clubId]
    );

    // Events belonging to this semester
    const semEvents = allEvents.filter((e: any) => {
      if (e.semesterId === semester.id) return true;
      return isDateInSemester(e.startTime, semester);
    });

    // 3. Fetch all expenses for this club with event info
    const allClubExpenses = await query<any>(
      `SELECT ex.*,
         e.title as "eventTitle",
         e."startTime" as "eventStartTime",
         e."semesterId" as "eventSemesterId"
       FROM "Expense" ex
       LEFT JOIN "Event" e ON ex."eventId" = e.id
       WHERE ex."clubId" = $1
       ORDER BY ex."expenseDate" DESC, ex."createdAt" DESC`,
      [clubId]
    );

    // 4. Check for 'Needs Attention' expenses
    // "If any expense falls outside every defined semester, or its date doesn’t match its event’s semester,
    // list it in a warning panel for Core (‘Needs attention’) instead of silently counting it."
    const needsAttention: NeedsAttentionItem[] = [];
    const needsAttentionIds = new Set<string>();

    for (const ex of allClubExpenses) {
      if (ex.isVoided) continue; // voided expenses are excluded from active alerts

      const exDate = new Date(ex.expenseDate);
      const exSemester = allSemesters.find((s) => isDateInSemester(exDate, s));

      // Case A: expense falls outside every defined semester
      if (!exSemester) {
        needsAttention.push({
          expenseId: ex.id,
          title: ex.description || 'Expense',
          amount: Math.round(Number(ex.amount) || 0),
          expenseDate: ex.expenseDate,
          eventTitle: ex.eventTitle || 'Unknown Event',
          eventId: ex.eventId,
          reason: `Expense date (${exDate.toLocaleDateString()}) falls outside all defined academic semesters.`,
        });
        needsAttentionIds.add(ex.id);
        continue;
      }

      // Case B: expense date does not match its event's semester
      if (ex.eventId) {
        let evSemester = allSemesters.find((s) => s.id === ex.eventSemesterId);
        if (!evSemester && ex.eventStartTime) {
          evSemester = allSemesters.find((s) => isDateInSemester(ex.eventStartTime, s));
        }

        if (evSemester && evSemester.id !== exSemester.id) {
          needsAttention.push({
            expenseId: ex.id,
            title: ex.description || 'Expense',
            amount: Math.round(Number(ex.amount) || 0),
            expenseDate: ex.expenseDate,
            eventTitle: ex.eventTitle || 'Linked Event',
            eventId: ex.eventId,
            reason: `Expense date falls in ${exSemester.name}, but event "${ex.eventTitle || 'Event'}" belongs to ${evSemester.name}.`,
          });
          needsAttentionIds.add(ex.id);
        }
      }
    }

    // 5. Valid Active Expenses for this semester:
    // Exclude voided, exclude outside semester, exclude needsAttention
    const validSemesterExpenses = allClubExpenses.filter((ex: any) => {
      if (ex.isVoided) return false;
      if (needsAttentionIds.has(ex.id)) return false;
      return isDateInSemester(ex.expenseDate, semester);
    });

    // 6. Committed Amount:
    // "sum of approvedBudget of that club's approved events that aren't rejected or archived"
    const approvedEvents = semEvents.filter((e: any) =>
      e.status === 'APPROVED' || e.status === 'COMPLETED'
    );

    const committed = approvedEvents.reduce((sum: number, e: any) => {
      const b = Math.round(Number(e.effectiveBudget || 0));
      return sum + b;
    }, 0);

    // 7. Spent Amount: sum of valid expenses in this semester
    const spent = validSemesterExpenses.reduce((sum: number, ex: any) => {
      return sum + Math.round(Number(ex.amount) || 0);
    }, 0);

    // 8. Remaining: allocated - spent
    const remaining = allocated - spent;

    // 9. Available to Plan: allocated - committed
    const availableToPlan = allocated - committed;

    // 10. Per-event rows
    const perEventRows: PerEventRow[] = semEvents.map((e: any) => {
      const evValidExpenses = validSemesterExpenses.filter((ex: any) => ex.eventId === e.id);
      const evSpent = evValidExpenses.reduce((sum: number, ex: any) => sum + Math.round(Number(ex.amount) || 0), 0);
      const evBudget = Math.round(Number(e.effectiveBudget || 0));
      // Include all expenses for this event (including voided) so user can see history/voids if inspected
      const evAllExpenses = allClubExpenses.filter((ex: any) => ex.eventId === e.id);

      return {
        id: e.id,
        title: e.title,
        status: e.status,
        startTime: e.startTime,
        endTime: e.endTime,
        venue: e.venue,
        eventType: e.eventType || e.category || 'Event',
        organizer: e.organizer || 'Club Executive',
        budget: evBudget,
        spent: evSpent,
        left: evBudget - evSpent,
        expenses: evAllExpenses,
      };
    });

    // 11. Monthly spending totals for each month of the semester
    // "The monthly chart must show every month of the semester in order (for Fall 2026: Jul to Dec), including empty ones, and never months outside it."
    const monthlySpending: MonthlySpendingItem[] = [];
    const curMonth = new Date(semStart.getFullYear(), semStart.getMonth(), 1);
    const endMonth = new Date(semEnd.getFullYear(), semEnd.getMonth(), 1);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    while (curMonth <= endMonth) {
      const year = curMonth.getFullYear();
      const monthIdx = curMonth.getMonth(); // 0-11
      const monthLabel = `${monthNames[monthIdx]} ${year}`;

      const mStart = new Date(year, monthIdx, 1, 0, 0, 0, 0);
      const mEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);

      const matchingExpenses = validSemesterExpenses.filter((ex: any) => {
        const d = new Date(ex.expenseDate);
        return d >= mStart && d <= mEnd;
      });

      const monthSpent = matchingExpenses.reduce(
        (sum: number, ex: any) => sum + Math.round(Number(ex.amount) || 0),
        0
      );

      monthlySpending.push({
        month: monthLabel,
        monthIndex: monthIdx + 1,
        year,
        spent: monthSpent,
        expenseCount: matchingExpenses.length,
      });

      curMonth.setMonth(curMonth.getMonth() + 1);
    }

    // 12. Audit change logs
    let changeLogs: BudgetChangeLogRecord[] = [];
    if (budgetRecord) {
      changeLogs = await this.getBudgetChangeLogs(budgetRecord.id);
    }

    // Expenses returned for the semester view: all expenses dated in this semester
    // (includes voided so 'Show voided' toggle works, plus attribution)
    const semesterDatedExpenses = allClubExpenses.filter((ex: any) =>
      isDateInSemester(ex.expenseDate, semester)
    );

    return {
      club: {
        id: club.id,
        name: club.name,
        description: club.description || '',
      },
      semester: {
        id: semester.id,
        name: semester.name,
        startDate: semester.startDate,
        endDate: semester.endDate,
      },
      allocated,
      committed,
      spent,
      remaining,
      availableToPlan,
      perEventRows,
      monthlySpending,
      expenses: semesterDatedExpenses,
      needsAttention,
      changeLogs,
    };
  },

  // --- OVERVIEW FOR CORE VERIFIER: ALL CLUBS SUMMARY ---
  async getAllClubsSummary(semesterId: string) {
    const clubs = await dbService.getClubs();
    const semester = await this.getSemesterById(semesterId);
    if (!semester) throw new Error(`Semester with id '${semesterId}' not found.`);

    const summaries = await Promise.all(
      clubs.map(async (c: any) => {
        try {
          const details = await this.getClubBudgetDetails(c.id, semester.id);
          return {
            clubId: c.id,
            clubName: c.name,
            allocated: details.allocated,
            committed: details.committed,
            spent: details.spent,
            remaining: details.remaining,
            availableToPlan: details.availableToPlan,
            eventsCount: details.perEventRows.length,
            approvedEventsCount: details.perEventRows.filter(
              (r) => r.status === 'APPROVED' || r.status === 'COMPLETED'
            ).length,
          };
        } catch (e) {
          return {
            clubId: c.id,
            clubName: c.name,
            allocated: 0,
            committed: 0,
            spent: 0,
            remaining: 0,
            availableToPlan: 0,
            eventsCount: 0,
            approvedEventsCount: 0,
          };
        }
      })
    );

    const totalAllocated = summaries.reduce((s, c) => s + c.allocated, 0);
    const totalCommitted = summaries.reduce((s, c) => s + c.committed, 0);
    const totalSpent = summaries.reduce((s, c) => s + c.spent, 0);
    const totalRemaining = totalAllocated - totalSpent;
    const totalAvailableToPlan = totalAllocated - totalCommitted;

    return {
      semester: {
        id: semester.id,
        name: semester.name,
        startDate: semester.startDate,
        endDate: semester.endDate,
      },
      totalAllocated,
      totalCommitted,
      totalSpent,
      totalRemaining,
      totalAvailableToPlan,
      clubs: summaries,
    };
  },
};
