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
  changeLogs: BudgetChangeLogRecord[];
}

export const budgetService = {
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

    const semStart = new Date(semester.startDate);
    const semEnd = new Date(semester.endDate);

    // 1. Allocated Amount
    const budgetRecord = await this.getClubBudget(clubId, semester.id);
    const allocated = budgetRecord ? Math.round(Number(budgetRecord.allocatedAmount)) : 0;

    // 2. Fetch Events for this club in this semester
    const events = await query<any>(
      `SELECT e.*,
         COALESCE(e."approvedBudget", ROUND(COALESCE(e."estimatedCost", 0))::INT, 0) as "effectiveBudget"
       FROM "Event" e
       WHERE e."clubId" = $1
         AND (
           e."semesterId" = $2
           OR (e."startTime" >= $3 AND e."startTime" <= $4)
         )
       ORDER BY e."startTime" ASC`,
      [clubId, semester.id, semStart, semEnd]
    );

    // 3. Fetch Expenses for this club in this semester
    const expenses = await query<any>(
      `SELECT ex.*
       FROM "Expense" ex
       WHERE ex."clubId" = $1
         AND (
           ex."semesterId" = $2
           OR (ex."expenseDate" >= $3 AND ex."expenseDate" <= $4)
         )
       ORDER BY ex."expenseDate" ASC`,
      [clubId, semester.id, semStart, semEnd]
    );

    // 4. Committed Amount:
    // "sum of approvedBudget of that club's approved events that aren't rejected or archived"
    // Events with status APPROVED or COMPLETED (not REJECTED or CANCELLED)
    const approvedEvents = events.filter((e: any) =>
      e.status === 'APPROVED' || e.status === 'COMPLETED'
    );

    const committed = approvedEvents.reduce((sum: number, e: any) => {
      const b = Math.round(Number(e.effectiveBudget || 0));
      return sum + b;
    }, 0);

    // 5. Spent Amount: sum of expenses
    const spent = expenses.reduce((sum: number, ex: any) => {
      return sum + Math.round(Number(ex.amount) || 0);
    }, 0);

    // 6. Remaining: allocated - spent
    const remaining = allocated - spent;

    // 7. Available to Plan: allocated - committed
    const availableToPlan = allocated - committed;

    // 8. Per-event rows
    const perEventRows: PerEventRow[] = events.map((e: any) => {
      const evExpenses = expenses.filter((ex: any) => ex.eventId === e.id);
      const evSpent = evExpenses.reduce((sum: number, ex: any) => sum + Math.round(Number(ex.amount) || 0), 0);
      const evBudget = Math.round(Number(e.effectiveBudget || 0));
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
        expenses: evExpenses,
      };
    });

    // 9. Monthly spending totals for each month of the semester
    const monthlySpending: MonthlySpendingItem[] = [];
    const curMonth = new Date(semStart.getFullYear(), semStart.getMonth(), 1);
    const endMonth = new Date(semEnd.getFullYear(), semEnd.getMonth(), 1);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    while (curMonth <= endMonth) {
      const year = curMonth.getFullYear();
      const monthIdx = curMonth.getMonth(); // 0-11
      const monthLabel = `${monthNames[monthIdx]} ${year}`;

      const nextMonth = new Date(year, monthIdx + 1, 1);

      const matchingExpenses = expenses.filter((ex: any) => {
        const d = new Date(ex.expenseDate);
        return d >= curMonth && d < nextMonth;
      });

      const monthSpent = matchingExpenses.reduce(
        (sum: number, ex: any) => sum + Math.round(Number(ex.amount) || 0),
        0
      );

      monthlySpending.push({
        month: monthLabel,
        monthIndex: monthIdx + 1, // 1-12
        year,
        spent: monthSpent,
        expenseCount: matchingExpenses.length,
      });

      curMonth.setMonth(curMonth.getMonth() + 1);
    }

    // 10. Audit change logs
    let changeLogs: BudgetChangeLogRecord[] = [];
    if (budgetRecord) {
      changeLogs = await this.getBudgetChangeLogs(budgetRecord.id);
    }

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
