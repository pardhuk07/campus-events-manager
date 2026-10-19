import { test, describe } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { budgetService } from '../lib/budgetService';
import { dbService } from '../lib/dbService';
import { UserRole } from '../lib/constants';
import { ensureDatabaseTables } from '../lib/initDb';
import { GET as getSemesters } from '../app/api/semesters/route';
import { GET as getClubBudgets, POST as postClubBudgets } from '../app/api/club-budgets/route';
import { GET as getBudgets } from '../app/api/budgets/route';
import { GET as getBudgetSingle } from '../app/api/budget/route';
import { POST as createEvent } from '../app/api/events/route';
import { GET as getPendingEvents } from '../app/api/events/pending/route';
import { POST as reviewEvent } from '../app/api/events/[id]/review/route';

describe('Club Semester Budget System Restructure Tests', () => {
  // Ensure DB tables, safe migration, and seeds are loaded
  test('initializes and migrates database tables with safe backfill and seeds', async () => {
    await ensureDatabaseTables();
    const semesters = await budgetService.getSemesters();
    assert.ok(semesters.length >= 2, 'Should have at least 2 seeded semesters');

    const spring = semesters.find((s) => s.name === 'Spring 2026');
    const fall = semesters.find((s) => s.name === 'Fall 2026');

    assert.ok(spring, 'Spring 2026 semester must be seeded');
    assert.ok(fall, 'Fall 2026 semester must be seeded');

    const springStart = new Date(spring.startDate);
    const springEnd = new Date(spring.endDate);
    assert.strictEqual(springStart.getMonth(), 0, 'Spring starts in Jan (month 0)');
    assert.strictEqual(springEnd.getMonth(), 5, 'Spring ends in Jun (month 5)');

    const fallStart = new Date(fall.startDate);
    const fallEnd = new Date(fall.endDate);
    assert.strictEqual(fallStart.getMonth(), 6, 'Fall starts in Jul (month 6)');
    assert.strictEqual(fallEnd.getMonth(), 11, 'Fall ends in Dec (month 11)');
  });

  describe('Seeded Demo Allocations', () => {
    test('verifies demo allocations for Fall 2026', async () => {
      const fall = await budgetService.getSemesterById('Fall 2026');
      assert.ok(fall, 'Fall 2026 semester must exist');

      const expectedAllocations: Record<string, number> = {
        ACM: 50000,
        ChES: 30000,
        CHRD: 25000,
        'E-Cell': 40000,
        Phoenix: 35000,
        Drishti: 20000,
        GDGC: 25000,
        CEV: 20000,
      };

      const clubs = await dbService.getClubs();
      const cev = clubs.find((c: any) => c.name.toLowerCase().includes('cev'));
      if (cev) {
        const currentCev = await budgetService.getClubBudget(cev.id, fall.id);
        if (currentCev && currentCev.allocatedAmount !== 20000) {
          await budgetService.upsertClubBudget({
            clubId: cev.id,
            semesterId: fall.id,
            allocatedAmount: 20000,
            reason: 'Reset demo allocation for CEV',
            changedBy: 'ACM Core Verifier',
          });
        }
      }

      for (const [clubPattern, expectedAmt] of Object.entries(expectedAllocations)) {
        const club = clubs.find((c: any) => c.name.toLowerCase().includes(clubPattern.toLowerCase()));
        assert.ok(club, `Club matching '${clubPattern}' must exist`);

        const budget = await budgetService.getClubBudget(club.id, fall.id);
        assert.ok(budget, `ClubBudget for ${club.name} in Fall 2026 must be seeded`);
        assert.strictEqual(
          budget.allocatedAmount,
          expectedAmt,
          `Expected ₹${expectedAmt} for ${club.name}, got ₹${budget.allocatedAmount}`
        );
      }
    });
  });

  describe('Budget Calculations & Integer Rupees', () => {
    test('accurately calculates allocated, committed, spent, remaining, availableToPlan, perEventRows, and monthlySpending', async () => {
      const fall = await budgetService.getSemesterById('Fall 2026');
      assert.ok(fall);

      const clubs = await dbService.getClubs();
      const acmClub = clubs.find((c: any) => c.name.toLowerCase().includes('acm'));
      assert.ok(acmClub);

      const details = await budgetService.getClubBudgetDetails(acmClub.id, fall.id);

      assert.strictEqual(Number.isInteger(details.allocated), true, 'allocated must be an integer');
      assert.strictEqual(Number.isInteger(details.committed), true, 'committed must be an integer');
      assert.strictEqual(Number.isInteger(details.spent), true, 'spent must be an integer');
      assert.strictEqual(Number.isInteger(details.remaining), true, 'remaining must be an integer');
      assert.strictEqual(Number.isInteger(details.availableToPlan), true, 'availableToPlan must be an integer');

      // Math Invariants:
      // remaining = allocated - spent
      assert.strictEqual(
        details.remaining,
        details.allocated - details.spent,
        'remaining must equal allocated - spent'
      );
      // availableToPlan = allocated - committed
      assert.strictEqual(
        details.availableToPlan,
        details.allocated - details.committed,
        'availableToPlan must equal allocated - committed'
      );

      // Verify perEventRows
      assert.ok(Array.isArray(details.perEventRows), 'perEventRows must be an array');
      for (const row of details.perEventRows) {
        assert.strictEqual(Number.isInteger(row.budget), true, 'event budget must be integer');
        assert.strictEqual(Number.isInteger(row.spent), true, 'event spent must be integer');
        assert.strictEqual(row.left, row.budget - row.spent, 'left must equal budget - spent');
      }

      // Verify monthlySpending
      assert.ok(Array.isArray(details.monthlySpending), 'monthlySpending must be an array');
      assert.strictEqual(details.monthlySpending.length, 6, 'Fall 2026 has 6 months (Jul-Dec)');
      for (const m of details.monthlySpending) {
        assert.strictEqual(Number.isInteger(m.spent), true, 'monthly spent must be integer');
        assert.ok(m.monthIndex >= 7 && m.monthIndex <= 12, 'Fall months are 7 to 12');
      }
    });
  });

  describe('Budget Change Logs & Mandatory Justification', () => {
    test('requires a non-empty reason when modifying a club budget and records an audit log', async () => {
      const fall = await budgetService.getSemesterById('Fall 2026');
      assert.ok(fall);

      const clubs = await dbService.getClubs();
      const cevClub = clubs.find((c: any) => c.name.toLowerCase().includes('cev'));
      assert.ok(cevClub);

      // Attempt update with empty reason - must reject
      await assert.rejects(
        async () => {
          await budgetService.upsertClubBudget({
            clubId: cevClub.id,
            semesterId: fall.id,
            allocatedAmount: 22000,
            reason: '',
          });
        },
        /reason is strictly required/i
      );

      // Successful update with reason
      const updateResult = await budgetService.upsertClubBudget({
        clubId: cevClub.id,
        semesterId: fall.id,
        allocatedAmount: 22000,
        reason: 'Supplemental allocation for hackathon prize pool',
        changedBy: 'ACM Core Verifier',
      });

      assert.strictEqual(updateResult.budget.allocatedAmount, 22000);
      assert.strictEqual(updateResult.changeLog.newAmount, 22000);
      assert.strictEqual(updateResult.changeLog.reason, 'Supplemental allocation for hackathon prize pool');

      // Verify log history
      const logs = await budgetService.getBudgetChangeLogs(updateResult.budget.id);
      assert.ok(logs.length >= 2, 'Should have at least initial seed log and new update log');
      assert.strictEqual(logs[0].newAmount, 22000);

      // Restore CEV budget back to 20000 for idempotency
      await budgetService.upsertClubBudget({
        clubId: cevClub.id,
        semesterId: fall.id,
        allocatedAmount: 20000,
        reason: 'Restoring demo allocation for CEV',
        changedBy: 'ACM Core Verifier',
      });
    });
  });

  describe('Event approvedBudget and Core Approval', () => {
    test('defaults approvedBudget to estimatedCost and allows Core to edit during approval', async () => {
      const clubs = await dbService.getClubs();
      const acm = clubs.find((c: any) => c.name.toLowerCase().includes('acm'));
      assert.ok(acm);

      const testEvent = await dbService.createEvent({
        title: 'Budget Approval Test Workshop',
        clubId: acm.id,
        startTime: new Date('2026-10-25 10:00:00'),
        endTime: new Date('2026-10-25 12:00:00'),
        venue: 'CSE Department Seminar Hall',
        audienceTags: ['ALL_STUDENTS'],
        estimatedCost: 7500.5,
        submittedById: 'user-core-admin',
      });

      // Default approvedBudget is Math.round(estimatedCost) = 7501
      assert.strictEqual(testEvent.approvedBudget, 7501, 'approvedBudget must default to rounded estimatedCost');

      // Core approves and modifies approvedBudget to 8000
      const reviewed = await dbService.reviewEvent({
        eventId: testEvent.id,
        decision: 'APPROVE',
        comment: 'Approved with ₹8,000 allocated for guest speaker refreshments.',
        reviewerName: 'Pardhu (Core Lead)',
        approvedBudget: 8000,
      });

      assert.strictEqual(reviewed.status, 'APPROVED');
      assert.strictEqual(reviewed.approvedBudget, 8000, 'approvedBudget must be updated to ₹8,000');

      // Clean up test event
      await dbService.deleteEvent(testEvent.id);
    });
  });

  describe('Server-Side Expense Derivation (Anti-Spoofing)', () => {
    test('derives club and semester strictly from event on server and ignores client overrides', async () => {
      const clubs = await dbService.getClubs();
      const ches = clubs.find((c: any) => c.name.toLowerCase().includes('ches'));
      assert.ok(ches);

      const fall = await budgetService.getSemesterById('Fall 2026');
      assert.ok(fall);

      // Create an event for ChES
      const chesEvent = await dbService.createEvent({
        title: 'ChES Reaction Tech Lab',
        clubId: ches.id,
        startTime: new Date('2026-11-10 14:00:00'),
        endTime: new Date('2026-11-10 17:00:00'),
        venue: 'Chemical Department Seminar Hall',
        audienceTags: ['ALL_STUDENTS'],
        estimatedCost: 4000,
        submittedById: 'user-core-admin',
      });

      // Derive expense context
      const context = await budgetService.deriveExpenseContext(chesEvent.id, new Date('2026-11-10 16:00:00'));
      assert.strictEqual(context.clubId, ches.id, 'Derived clubId must strictly match event.clubId');
      assert.strictEqual(context.semesterId, fall.id, 'Derived semesterId must match Fall 2026 for Nov 2026 date');

      // Clean up test event
      await dbService.deleteEvent(chesEvent.id);
    });
  });

  describe('Strict Server Permissions Enforcement', () => {
    test('returns 403 Forbidden to public and regular members on all budget routes', async () => {
      // 1. /api/semesters
      const publicReq1 = new NextRequest('http://localhost:3000/api/semesters', {
        headers: { 'x-user-role': 'MEMBER', 'x-user-email': 'guest@student.nit.ac.in' },
      });
      const res1 = await getSemesters(publicReq1);
      assert.strictEqual(res1.status, 403, 'GET /api/semesters must be 403 for public/member');

      // 2. /api/club-budgets
      const publicReq2 = new NextRequest('http://localhost:3000/api/club-budgets', {
        headers: { 'x-user-role': 'MEMBER', 'x-user-email': 'guest@student.nit.ac.in' },
      });
      const res2 = await getClubBudgets(publicReq2);
      assert.strictEqual(res2.status, 403, 'GET /api/club-budgets must be 403 for public/member');

      // 3. /api/budgets
      const publicReq3 = new NextRequest('http://localhost:3000/api/budgets', {
        headers: { 'x-user-role': 'MEMBER', 'x-user-email': 'guest@student.nit.ac.in' },
      });
      const res3 = await getBudgets(publicReq3);
      assert.strictEqual(res3.status, 403, 'GET /api/budgets must be 403 for public/member');

      // 4. /api/budget
      const publicReq4 = new NextRequest('http://localhost:3000/api/budget', {
        headers: { 'x-user-role': 'MEMBER', 'x-user-email': 'guest@student.nit.ac.in' },
      });
      const res4 = await getBudgetSingle(publicReq4);
      assert.strictEqual(res4.status, 403, 'GET /api/budget must be 403 for public/member');
    });

    test('club executive cannot modify club budget or view other club budget', async () => {
      const clubs = await dbService.getClubs();
      const acm = clubs.find((c: any) => c.name.toLowerCase().includes('acm'));
      const ches = clubs.find((c: any) => c.name.toLowerCase().includes('ches'));
      assert.ok(acm && ches);

      const fall = await budgetService.getSemesterById('Fall 2026');
      assert.ok(fall);

      // Executive trying to POST to /api/club-budgets -> 403 Forbidden
      const execPostReq = new NextRequest('http://localhost:3000/api/club-budgets', {
        method: 'POST',
        headers: {
          'x-user-email': 'acmexec@gmail.com',
          'x-user-role': 'CLUB_EXEC',
          'x-user-club-id': acm.id,
        },
        body: JSON.stringify({
          clubId: acm.id,
          semesterId: fall.id,
          allocatedAmount: 99999,
          reason: 'Unauthorized exec increase',
        }),
      });

      const postRes = await postClubBudgets(execPostReq);
      assert.strictEqual(postRes.status, 403, 'Only Core can create or change a ClubBudget');

      // Executive trying to view another club's budget -> 403 Forbidden
      const execGetReq = new NextRequest(`http://localhost:3000/api/club-budgets?clubId=${ches.id}`, {
        headers: {
          'x-user-email': 'acmexec@gmail.com',
          'x-user-role': 'CLUB_EXEC',
          'x-user-club-id': acm.id,
        },
      });

      const getRes = await getClubBudgets(execGetReq);
      assert.strictEqual(getRes.status, 403, 'Executive cannot inspect another club budget');
    });
  });

  describe('Proposal Budget Flags and Core Pending Review Flow', () => {
    test('stores budget flag on proposal when estimated cost exceeds availableToPlan', async () => {
      const clubs = await dbService.getClubs();
      const acm = clubs.find((c: any) => c.name.toLowerCase().includes('acm'));
      assert.ok(acm);

      const fall = await budgetService.getSemesterById('Fall 2026');
      assert.ok(fall);

      const budgetBefore = await budgetService.getClubBudgetDetails(acm.id, fall.id);
      const availableToPlan = budgetBefore.availableToPlan;
      const excessiveCost = availableToPlan + 7500;

      const req = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: {
          'x-user-email': 'acmcore@gmail.com',
          'x-user-role': 'CORE_VERIFIER',
        },
        body: JSON.stringify({
          title: 'High Budget Flagship Event',
          description: 'Testing budget flag check when proposal exceeds available balance',
          clubId: acm.id,
          startTime: '2026-09-15T14:00:00Z',
          endTime: '2026-09-15T17:00:00Z',
          venue: 'Library Basement',
          audienceTags: ['ALL_STUDENTS'],
          expectedAttendance: 100,
          estimatedCost: excessiveCost,
          category: 'Symposium',
          eventType: 'Symposium',
          organizer: 'ACM Core Team',
        }),
      });

      const res = await createEvent(req);
      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.ok(json.success);
      assert.ok(json.data.event);

      const flags: string[] = json.data.flags || json.data.event.flags || [];
      const budgetFlag = flags.find((f: string) => f.includes('available budget by ₹'));
      assert.ok(budgetFlag, `Proposal must store a budget flag when exceeding availableToPlan. Found flags: ${JSON.stringify(flags)}`);
      assert.ok(budgetFlag.includes('7,500') || budgetFlag.includes('7500'), `Flag must indicate excess by 7,500. Found: ${budgetFlag}`);

      // Clean up event
      await dbService.deleteEvent(json.data.event.id);
    });

    test('attaches clubBudget to pending events for Core review', async () => {
      const clubs = await dbService.getClubs();
      const acm = clubs.find((c: any) => c.name.toLowerCase().includes('acm'));
      assert.ok(acm);

      const testPendingEvent = await dbService.createEvent({
        title: 'Pending Review Budget Attachment Test',
        clubId: acm.id,
        startTime: new Date('2026-11-01 10:00:00'),
        endTime: new Date('2026-11-01 12:00:00'),
        venue: 'CSE Department Seminar Hall',
        audienceTags: ['ALL_STUDENTS'],
        estimatedCost: 3000,
        submittedById: 'user-core-admin',
      });

      try {
        const req = new NextRequest('http://localhost:3000/api/events/pending', {
          headers: {
            'x-user-email': 'acmcore@gmail.com',
            'x-user-role': 'CORE_VERIFIER',
          },
        });

        const res = await getPendingEvents(req);
        assert.strictEqual(res.status, 200);
        const json = await res.json();
        assert.ok(json.success);
        assert.ok(Array.isArray(json.data.events));
        assert.ok(json.data.events.length > 0);

        const pendingWithBudget = json.data.events.find((e: any) => e.id === testPendingEvent.id);
        assert.ok(pendingWithBudget, 'Pending events must include created event');
        assert.ok(pendingWithBudget.clubBudget, 'Pending event must include clubBudget');
        assert.ok('allocated' in pendingWithBudget.clubBudget);
        assert.ok('committed' in pendingWithBudget.clubBudget);
        assert.ok('spent' in pendingWithBudget.clubBudget);
        assert.ok('availableToPlan' in pendingWithBudget.clubBudget);
      } finally {
        await dbService.deleteEvent(testPendingEvent.id);
      }
    });

    test('Core can adjust approvedBudget during approval', async () => {
      const clubs = await dbService.getClubs();
      const acm = clubs.find((c: any) => c.name.toLowerCase().includes('acm'));
      assert.ok(acm);

      // Create a proposal
      const createReq = new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers: {
          'x-user-email': 'acmcore@gmail.com',
          'x-user-role': 'CORE_VERIFIER',
        },
        body: JSON.stringify({
          title: 'Budget Adjustment Test Event',
          description: 'Testing core budget adjustment',
          clubId: acm.id,
          startTime: '2026-10-10T10:00:00Z',
          endTime: '2026-10-10T12:00:00Z',
          venue: 'Library Basement',
          audienceTags: ['ALL_STUDENTS'],
          expectedAttendance: 50,
          estimatedCost: 10000,
          category: 'Workshop',
          eventType: 'Workshop',
          organizer: 'ACM Lead',
        }),
      });

      const createRes = await createEvent(createReq);
      const createJson = await createRes.json();
      assert.ok(createJson.success, 'Event creation should succeed');
      const eventId = createJson.data.event.id;

      // Core approves with adjusted budget 6500 instead of 10000
      const reviewReq = new NextRequest(`http://localhost:3000/api/events/${eventId}/review`, {
        method: 'POST',
        headers: {
          'x-user-email': 'acmcore@gmail.com',
          'x-user-role': 'CORE_VERIFIER',
        },
        body: JSON.stringify({
          decision: 'APPROVE',
          comment: 'Approved with adjusted budget',
          approvedBudget: 6500,
        }),
      });

      const reviewRes = await reviewEvent(reviewReq, { params: Promise.resolve({ id: eventId }) });
      assert.strictEqual(reviewRes.status, 200);
      const reviewJson = await reviewRes.json();
      assert.ok(reviewJson.success);
      assert.strictEqual(reviewJson.data.event.approvedBudget, 6500, 'approvedBudget must be updated to adjusted amount');

      // Clean up event
      await dbService.deleteEvent(eventId);
    });
  });
});
