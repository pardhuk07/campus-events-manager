import { test, describe } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { budgetService, isDateInSemester } from '../lib/budgetService';
import { dbService } from '../lib/dbService';
import { UserRole, ExpenseCategory } from '../lib/constants';
import { PATCH as patchExpense, DELETE as deleteExpense } from '../app/api/expenses/[id]/route';
import { GET as getExpenseHistory } from '../app/api/expenses/[id]/history/route';
import { PATCH as patchEvent } from '../app/api/events/[id]/route';
import { POST as postExpense } from '../app/api/expenses/route';
import { GET as getClubBudgets } from '../app/api/club-budgets/route';

describe('Core Club Budget Operations & Semester Boundary Fix Tests', () => {
  let fallSemester: any;
  let springSemester: any;
  let acmClub: any;
  let chesClub: any;
  let testEventFall: any;
  let testEventSpring: any;

  test('setup test fixtures and verify semesters', async () => {
    fallSemester = await budgetService.getSemesterById('Fall 2026');
    springSemester = await budgetService.getSemesterById('Spring 2026');
    assert.ok(fallSemester, 'Fall 2026 semester must exist');
    assert.ok(springSemester, 'Spring 2026 semester must exist');

    const clubs = await dbService.getClubs();
    acmClub = clubs.find((c: any) => c.name.toLowerCase().includes('acm'));
    chesClub = clubs.find((c: any) => c.name.toLowerCase().includes('ches'));
    assert.ok(acmClub, 'ACM club must exist');
    assert.ok(chesClub, 'ChES club must exist');

    // Create a Fall test event for ChES
    testEventFall = await dbService.createEvent({
      title: 'ChES Fall Tech Symposium 2026',
      description: 'Annual chemical engineering symposium in Fall',
      clubId: chesClub.id,
      venue: 'Chemical Department Seminar Hall',
      startTime: new Date('2026-09-15T10:00:00Z'),
      endTime: new Date('2026-09-15T13:00:00Z'),
      audienceTags: ['ALL_STUDENTS'],
      category: 'Technical',
      eventType: 'Technical',
      status: 'APPROVED',
      approvedBudget: 15000,
      estimatedCost: 15000,
      organizer: 'ChES Executive',
      semesterId: fallSemester.id,
      submittedById: 'exec-user-ches',
    });

    // Create a Spring test event for ChES
    testEventSpring = await dbService.createEvent({
      title: 'ChES Spring Orientation 2026',
      description: 'Spring welcome event for freshers',
      clubId: chesClub.id,
      venue: 'Chemical Department Seminar Hall',
      startTime: new Date('2026-03-10T10:00:00Z'),
      endTime: new Date('2026-03-10T13:00:00Z'),
      audienceTags: ['ALL_STUDENTS'],
      category: 'Orientation',
      eventType: 'Orientation',
      status: 'APPROVED',
      approvedBudget: 8000,
      estimatedCost: 8000,
      organizer: 'ChES Executive',
      semesterId: springSemester.id,
      submittedById: 'exec-user-ches',
    });

    assert.ok(testEventFall.id);
    assert.ok(testEventSpring.id);
  });

  describe('Semester Boundary Calculations & Date-Based Filtering', () => {
    test('isDateInSemester helper correctly validates boundaries', () => {
      assert.strictEqual(isDateInSemester(new Date('2026-07-01T00:00:00Z'), fallSemester), true);
      assert.strictEqual(isDateInSemester(new Date('2026-10-15T12:00:00Z'), fallSemester), true);
      assert.strictEqual(isDateInSemester(new Date('2026-12-31T23:59:59Z'), fallSemester), true);
      assert.strictEqual(isDateInSemester(new Date('2026-03-15T00:00:00Z'), fallSemester), false);
      assert.strictEqual(isDateInSemester(new Date('2026-03-15T00:00:00Z'), springSemester), true);
    });

    test('monthlySpending strictly contains only the months of the selected semester in order', async () => {
      const details = await budgetService.getClubBudgetDetails(chesClub.id, fallSemester.id);
      assert.ok(details.monthlySpending);
      assert.strictEqual(details.monthlySpending.length, 6, 'Fall 2026 must have exactly 6 months (Jul-Dec)');

      const expectedMonths = [
        'Jul 2026',
        'Aug 2026',
        'Sep 2026',
        'Oct 2026',
        'Nov 2026',
        'Dec 2026',
      ];
      details.monthlySpending.forEach((m, idx) => {
        assert.strictEqual(m.month, expectedMonths[idx]);
        assert.strictEqual(typeof m.spent, 'number');
        assert.strictEqual(typeof m.expenseCount, 'number');
      });
    });

    test('detects Needs Attention when expense date falls outside event semester', async () => {
      // Create an expense dated in Fall (Oct) linked to a Spring event
      const mismatchExpense = await dbService.createExpense({
        eventId: testEventSpring.id,
        clubId: chesClub.id,
        semesterId: fallSemester.id,
        amount: 2500,
        category: ExpenseCategory.EQUIPMENT,
        description: 'Mismatched semester expense test',
        expenseDate: new Date('2026-10-20T10:00:00Z'),
        submittedById: 'exec-user-ches',
        addedByName: 'ChES Executive',
      });

      const details = await budgetService.getClubBudgetDetails(chesClub.id, fallSemester.id);
      const flagged = details.needsAttention.find((item) => item.expenseId === mismatchExpense.id);
      assert.ok(flagged, 'Mismatched expense must be listed in needsAttention');
      assert.ok(flagged.reason.includes('Spring 2026') || flagged.reason.includes('Fall 2026'));

      // Clean up test expense
      await dbService.deleteExpense(mismatchExpense.id);
    });
  });

  describe('Core Operations in Selected Club', () => {
    let testExpenseId: string;

    test('Core can edit event approvedBudget via PATCH /api/events/:id', async () => {
      const req = new NextRequest(`http://localhost:3000/api/events/${testEventFall.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'acmcore@gmail.com',
          'x-user-role': UserRole.CORE_VERIFIER,
        },
        body: JSON.stringify({
          approvedBudget: 18500,
        }),
      });

      const res = await patchEvent(req, { params: Promise.resolve({ id: testEventFall.id }) });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.event.approvedBudget, 18500);

      // Verify executive CANNOT edit event approved budget (403)
      const execReq = new NextRequest(`http://localhost:3000/api/events/${testEventFall.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'chesexec@gmail.com',
          'x-user-role': UserRole.CLUB_EXEC,
          'x-user-club-id': chesClub.id,
        },
        body: JSON.stringify({
          approvedBudget: 25000,
        }),
      });

      const execRes = await patchEvent(execReq, { params: Promise.resolve({ id: testEventFall.id }) });
      assert.strictEqual(execRes.status, 403);
    });

    test('Core creates an expense with onBehalfOfClub attribution and change log', async () => {
      const req = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'acmcore@gmail.com',
          'x-user-role': UserRole.CORE_VERIFIER,
        },
        body: JSON.stringify({
          eventId: testEventFall.id,
          amount: 4500,
          category: ExpenseCategory.PRINTING,
          description: 'Banner printing for symposium by Core',
          expenseDate: new Date('2026-09-10T12:00:00Z'),
          receiptUrl: 'https://example.com/receipt.pdf',
        }),
      });

      const res = await postExpense(req);
      const json = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(json.success, true);
      assert.ok(json.data.expense.id);
      testExpenseId = json.data.expense.id;

      // Verify attribution
      assert.ok(json.data.expense.onBehalfOfClub, 'Should record onBehalfOfClub attribution');
    });

    test('Core can edit existing expense with required reason and logs history', async () => {
      // 1. Missing reason returns 400
      const noReasonReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'acmcore@gmail.com',
          'x-user-role': UserRole.CORE_VERIFIER,
        },
        body: JSON.stringify({
          amount: 4200,
          reason: '',
        }),
      });

      const noReasonRes = await patchExpense(noReasonReq, { params: Promise.resolve({ id: testExpenseId }) });
      assert.strictEqual(noReasonRes.status, 400);

      // 2. Executive cannot edit expense (403)
      const execReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'chesexec@gmail.com',
          'x-user-role': UserRole.CLUB_EXEC,
          'x-user-club-id': chesClub.id,
        },
        body: JSON.stringify({
          amount: 4200,
          reason: 'Executive trying to edit',
        }),
      });

      const execRes = await patchExpense(execReq, { params: Promise.resolve({ id: testExpenseId }) });
      assert.strictEqual(execRes.status, 403);

      // 3. Core successfully edits with valid reason
      const validReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'acmcore@gmail.com',
          'x-user-role': UserRole.CORE_VERIFIER,
        },
        body: JSON.stringify({
          amount: 4200,
          description: 'Banner printing revised quotation',
          reason: 'Vendor gave 300 rupees post-printing discount',
        }),
      });

      const validRes = await patchExpense(validReq, { params: Promise.resolve({ id: testExpenseId }) });
      const validJson = await validRes.json();
      assert.strictEqual(validRes.status, 200);
      assert.strictEqual(validJson.success, true);
      assert.strictEqual(validJson.data.amount, 4200);
    });

    test('GET /api/expenses/:id/history returns audit timeline of edits', async () => {
      const historyReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}/history`, {
        headers: {
          'x-user-email': 'acmcore@gmail.com',
          'x-user-role': UserRole.CORE_VERIFIER,
        },
      });

      const res = await getExpenseHistory(historyReq, { params: Promise.resolve({ id: testExpenseId }) });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data.history));
      assert.ok(json.data.history.length >= 2, 'Should have CREATED and EDITED logs');

      const editLog = json.data.history.find((h: any) => h.action === 'EDITED');
      assert.ok(editLog);
      assert.strictEqual(editLog.reason, 'Vendor gave 300 rupees post-printing discount');
    });

    test('Core voids expense with required reason; soft deletes and excludes from totals', async () => {
      // 1. Executive cannot void (403)
      const execVoidReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'chesexec@gmail.com',
          'x-user-role': UserRole.CLUB_EXEC,
          'x-user-club-id': chesClub.id,
        },
        body: JSON.stringify({
          reason: 'Executive trying to void',
        }),
      });

      const execVoidRes = await deleteExpense(execVoidReq, { params: Promise.resolve({ id: testExpenseId }) });
      assert.strictEqual(execVoidRes.status, 403);

      // 2. Void without reason returns 400
      const noReasonVoidReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'acmcore@gmail.com',
          'x-user-role': UserRole.CORE_VERIFIER,
        },
        body: JSON.stringify({
          reason: '',
        }),
      });

      const noReasonVoidRes = await deleteExpense(noReasonVoidReq, { params: Promise.resolve({ id: testExpenseId }) });
      assert.strictEqual(noReasonVoidRes.status, 400);

      // 3. Core successfully voids with reason
      const validVoidReq = new NextRequest(`http://localhost:3000/api/expenses/${testExpenseId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'acmcore@gmail.com',
          'x-user-role': UserRole.CORE_VERIFIER,
        },
        body: JSON.stringify({
          reason: 'Duplicate payment invoice cancelled by committee',
        }),
      });

      const validVoidRes = await deleteExpense(validVoidReq, { params: Promise.resolve({ id: testExpenseId }) });
      const validVoidJson = await validVoidRes.json();
      assert.strictEqual(validVoidRes.status, 200);
      assert.strictEqual(validVoidJson.success, true);
      assert.strictEqual(validVoidJson.data.voided, true);

      // Verify expense still exists in database (NOT hard deleted)
      const dbExp = await dbService.getExpenseById(testExpenseId);
      assert.ok(dbExp, 'Voided expense must not be hard-deleted from database');
      assert.strictEqual(dbExp.isVoided, true);
      assert.strictEqual(dbExp.voidReason, 'Duplicate payment invoice cancelled by committee');

      // Verify voided expense is EXCLUDED from semester spent totals
      const details = await budgetService.getClubBudgetDetails(chesClub.id, fallSemester.id);
      const validExpenses = details.expenses.filter((e) => !e.isVoided);
      assert.ok(!validExpenses.some((e) => e.id === testExpenseId), 'Voided expense must not be in active expenses');
    });

    test('Strict Executive permissions: cannot inspect other clubs via URL or body', async () => {
      const execReq = new NextRequest(
        `http://localhost:3000/api/club-budgets?semesterId=${fallSemester.id}&clubId=${acmClub.id}`,
        {
          headers: {
            'x-user-email': 'chesexec@gmail.com',
            'x-user-role': UserRole.CLUB_EXEC,
            'x-user-club-id': chesClub.id,
          },
        }
      );

      const res = await getClubBudgets(execReq);
      assert.strictEqual(res.status, 403, 'Executive cannot access other club budget by spoofing clubId in URL');
    });

    test('cleanup test events and expenses', async () => {
      if (testEventFall?.id) await dbService.deleteEvent(testEventFall.id);
      if (testEventSpring?.id) await dbService.deleteEvent(testEventSpring.id);
      if (testExpenseId) await dbService.deleteExpense(testExpenseId);
    });
  });
});
