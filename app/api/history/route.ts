import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { dbService } from '@/lib/dbService';
import { getServerUser } from '@/lib/auth';
import { apiSuccess, apiError, ErrorCodes, ExpenseCategory, UserRole } from '@/lib/constants';

interface SemesterDef {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

const DEFAULT_SEMESTERS: SemesterDef[] = [
  {
    id: 'budget-fall-2026',
    name: 'Fall 2026',
    startDate: '2026-08-01T00:00:00.000Z',
    endDate: '2026-12-31T23:59:59.999Z',
  },
  {
    id: 'budget-spring-2026',
    name: 'Spring 2026',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-05-31T23:59:59.999Z',
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedSemesterId = searchParams.get('semester');

    // 1. Fetch all configured semesters from Budget table
    const budgetRows = await query('SELECT * FROM "Budget" ORDER BY "startDate" DESC');
    const semesters: SemesterDef[] = [];

    if (budgetRows.length > 0) {
      for (const b of budgetRows) {
        semesters.push({
          id: b.id,
          name: b.name.replace(' Semester Budget', '').replace(' Budget', ''),
          startDate: new Date(b.startDate).toISOString(),
          endDate: new Date(b.endDate).toISOString(),
        });
      }
    } else {
      semesters.push(...DEFAULT_SEMESTERS);
    }

    // Ensure Fall 2026 is at the top/current
    semesters.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    // Selected Semester
    const selectedSemester =
      semesters.find((s) => s.id === requestedSemesterId || s.name.toLowerCase() === requestedSemesterId?.toLowerCase()) ||
      semesters.find((s) => s.name.includes('Fall 2026')) ||
      semesters[0];

    const currentSemesterIndex = semesters.findIndex((s) => s.id === selectedSemester.id);
    const previousSemester =
      currentSemesterIndex >= 0 && currentSemesterIndex < semesters.length - 1
        ? semesters[currentSemesterIndex + 1]
        : null;

    const semStart = new Date(selectedSemester.startDate);
    const semEnd = new Date(selectedSemester.endDate);

    const user = await getServerUser(request);
    const userRole = user?.role || UserRole.MEMBER;

    // 2. Section 1: Past Events (Completed events with end date in the past, within semester)
    // Query events with club, organizer, date, venue, type, status, approval comment, and actual spend
    let pastEvents = await query(
      `
      SELECT e.*,
        c.name as "clubName",
        COALESCE(u.name, 'Campus Member') as "submitterName",
        COALESCE(
          (SELECT SUM(ex.amount) FROM "Expense" ex WHERE ex."eventId" = e.id),
          0
        )::NUMERIC as "actualSpend"
      FROM "Event" e
      LEFT JOIN "Club" c ON e."clubId" = c.id
      LEFT JOIN "User" u ON e."submittedById" = u.id
      WHERE e."startTime" >= $1 AND e."startTime" <= $2
        AND (e."endTime" < NOW() OR e."status" = 'COMPLETED')
      ORDER BY e."startTime" DESC
    `,
      [semStart, semEnd]
    );

    // Scoped visibility: members only see approved/completed events
    if (userRole === UserRole.MEMBER) {
      pastEvents = pastEvents.filter(
        (e: any) => e.status === 'APPROVED' || e.status === 'COMPLETED'
      );
    } else if (userRole === UserRole.CLUB_EXEC) {
      pastEvents = pastEvents.filter(
        (e: any) =>
          e.status === 'APPROVED' ||
          e.status === 'COMPLETED' ||
          (user?.clubId && e.clubId === user.clubId)
      );
    }

    // 3. Section 2: Conflict Log (Every conflict flagged for events in this semester)
    const conflicts = await query(
      `
      SELECT ec.*,
        json_build_object(
          'id', e1.id,
          'title', e1.title,
          'venue', e1.venue,
          'startTime', e1."startTime",
          'endTime', e1."endTime",
          'clubName', COALESCE(c1.name, 'Club 1'),
          'status', e1.status,
          'reviewDecision', e1."reviewDecision",
          'reviewComment', e1."reviewComment",
          'reviewedByName', e1."reviewedByName",
          'reviewedAt', e1."reviewedAt"
        ) as event,
        json_build_object(
          'id', e2.id,
          'title', e2.title,
          'venue', e2.venue,
          'startTime', e2."startTime",
          'endTime', e2."endTime",
          'clubName', COALESCE(c2.name, 'Club 2')
        ) as "conflictingEvent",
        CASE WHEN u.id IS NOT NULL THEN json_build_object('id', u.id, 'name', u.name) ELSE NULL END as "reviewedBy"
      FROM "EventConflict" ec
      JOIN "Event" e1 ON ec."eventId" = e1.id
      LEFT JOIN "Club" c1 ON e1."clubId" = c1.id
      JOIN "Event" e2 ON ec."conflictingEventId" = e2.id
      LEFT JOIN "Club" c2 ON e2."clubId" = c2.id
      LEFT JOIN "User" u ON ec."reviewedById" = u.id
      WHERE (ec."createdAt" >= $1 AND ec."createdAt" <= $2)
         OR (e1."startTime" >= $1 AND e1."startTime" <= $2)
      ORDER BY ec."createdAt" DESC
    `,
      [semStart, semEnd]
    );

    // Normalize resolution details on conflicts
    const normalizedConflicts = conflicts.map((c: any) => {
      const type = (c.reason || '').toLowerCase().includes('venue conflict')
        ? 'venue'
        : 'audience';

      let resolution = 'Pending Review';
      let reviewer = c.event?.reviewedByName || c.reviewedBy?.name || 'ACM Core';
      let comment = c.event?.reviewComment || c.resolutionNote || 'No review comment recorded.';

      if (c.event?.reviewDecision === 'APPROVE') {
        resolution = 'Approved anyway';
      } else if (c.event?.reviewDecision === 'REJECT') {
        resolution = 'Rejected';
      } else if (c.event?.reviewDecision === 'RESCHEDULE_REQUESTED') {
        resolution = 'Rescheduled';
      } else if (c.status === 'RESOLVED') {
        resolution = 'Approved anyway';
      } else if (c.status === 'DISMISSED') {
        resolution = 'Dismissed';
      }

      return {
        id: c.id,
        reason: c.reason,
        conflictType: type,
        dateFlagged: c.createdAt,
        event: c.event,
        conflictingEvent: c.conflictingEvent,
        resolution,
        reviewer,
        comment,
      };
    });

    // 4. Section 3: Spending Patterns
    // Current semester expenses
    const currExpenses = await query(
      `
      SELECT ex.*, e."eventType", e.title as "eventTitle", c.name as "clubName"
      FROM "Expense" ex
      LEFT JOIN "Event" e ON ex."eventId" = e.id
      LEFT JOIN "Club" c ON e."clubId" = c.id
      WHERE ex."expenseDate" >= $1 AND ex."expenseDate" <= $2
    `,
      [semStart, semEnd]
    );

    // Current semester category breakdown
    const currCategoryTotals: Record<string, number> = {};
    for (const cat of Object.values(ExpenseCategory)) {
      currCategoryTotals[cat] = 0;
    }
    let currentTotalSpend = 0;
    for (const ex of currExpenses) {
      const amt = parseFloat(ex.amount) || 0;
      currentTotalSpend += amt;
      if (currCategoryTotals[ex.category] !== undefined) {
        currCategoryTotals[ex.category] += amt;
      } else {
        currCategoryTotals[ex.category] = amt;
      }
    }

    // Previous semester expenses comparison
    const prevCategoryTotals: Record<string, number> = {};
    for (const cat of Object.values(ExpenseCategory)) {
      prevCategoryTotals[cat] = 0;
    }
    let prevTotalSpend = 0;

    if (previousSemester) {
      const pStart = new Date(previousSemester.startDate);
      const pEnd = new Date(previousSemester.endDate);
      const prevExpenses = await query(
        `SELECT * FROM "Expense" WHERE "expenseDate" >= $1 AND "expenseDate" <= $2`,
        [pStart, pEnd]
      );
      for (const ex of prevExpenses) {
        const amt = parseFloat(ex.amount) || 0;
        prevTotalSpend += amt;
        if (prevCategoryTotals[ex.category] !== undefined) {
          prevCategoryTotals[ex.category] += amt;
        } else {
          prevCategoryTotals[ex.category] = amt;
        }
      }
    }

    // 5 Most expensive events in this semester (ranked by actual spend)
    const topEventsQuery = await query(
      `
      SELECT e.id, e.title, e."eventType", e."startTime", e.venue,
        COALESCE(c.name, 'Campus Club') as "clubName",
        COALESCE(SUM(ex.amount), 0)::NUMERIC as "actualSpend",
        COALESCE(e."estimatedCost", 0)::NUMERIC as "estimatedCost"
      FROM "Event" e
      LEFT JOIN "Club" c ON e."clubId" = c.id
      LEFT JOIN "Expense" ex ON ex."eventId" = e.id
      WHERE e."startTime" >= $1 AND e."startTime" <= $2
      GROUP BY e.id, c.name
      ORDER BY "actualSpend" DESC, "estimatedCost" DESC
      LIMIT 5
    `,
      [semStart, semEnd]
    );

    // Average cost per event type
    const eventTypeStats = await query(
      `
      SELECT 
        COALESCE(e."eventType", 'Workshop') as "eventType",
        COUNT(DISTINCT e.id)::INT as "eventCount",
        COALESCE(SUM(ex.amount), 0)::NUMERIC as "totalSpent",
        CASE 
          WHEN COUNT(DISTINCT e.id) > 0 THEN ROUND(COALESCE(SUM(ex.amount), 0) / COUNT(DISTINCT e.id), 2)
          ELSE 0
        END as "avgCost"
      FROM "Event" e
      LEFT JOIN "Expense" ex ON ex."eventId" = e.id
      WHERE e."startTime" >= $1 AND e."startTime" <= $2
      GROUP BY COALESCE(e."eventType", 'Workshop')
      ORDER BY "avgCost" DESC
    `,
      [semStart, semEnd]
    );

    // Return complete structured payload for all 4 sections
    return apiSuccess({
      semesters,
      selectedSemester,
      previousSemester,
      pastEvents,
      conflicts: normalizedConflicts,
      spendingPatterns: {
        currentTotalSpend,
        prevTotalSpend,
        categoryBreakdown: currCategoryTotals,
        prevCategoryBreakdown: previousSemester ? prevCategoryTotals : null,
        top5Events: topEventsQuery,
        avgCostPerType: eventTypeStats,
      },
    });
  } catch (error: any) {
    console.error('GET /api/history error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch history data', 500);
  }
}
