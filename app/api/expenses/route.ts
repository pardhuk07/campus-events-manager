import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { budgetService, isDateInSemester } from '@/lib/budgetService';
import { getServerUser, requireExecOrCore } from '@/lib/auth';
import {
  apiSuccess,
  apiError,
  ErrorCodes,
  ExpenseCategory,
  EventStatus,
  UserRole,
} from '@/lib/constants';

// GET /api/expenses - List expenses, with event, category, and date filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const category = searchParams.get('category');

    const user = await getServerUser(request);
    const userRole = user?.role || UserRole.MEMBER;

    // Strict Visibility Enforcement:
    // - Public / Members: 403 Forbidden (cannot view expenses or budget)
    // - Club Executives: can only see their own club's expenses
    // - ACM Core: can see all expenses
    if (!user || userRole === UserRole.MEMBER) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Forbidden: Expense and budget information is restricted from member and public view.',
        403
      );
    }

    let expenses = await dbService.getExpenses();

    if (userRole === UserRole.CLUB_EXEC) {
      expenses = expenses.filter((e: any) => e.event?.clubId === user.clubId);
    }

    if (eventId) {
      expenses = expenses.filter((e: any) => e.eventId === eventId);
    }
    if (category) {
      expenses = expenses.filter((e: any) => e.category === category);
    }

    return apiSuccess(expenses);
  } catch (error: any) {
    console.error('GET /api/expenses error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch expenses', 500);
  }
}

// POST /api/expenses - Add an expense linked to an approved event, category, and date
export async function POST(request: NextRequest) {
  try {
    // 1. STRICT SERVER-SIDE RBAC ENFORCEMENT: Club Executives & ACM Core only
    const auth = await requireExecOrCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const user = auth.user;

    const body = await request.json();
    const {
      eventId,
      eventName,
      clubId: clientClubId,
      amount,
      category,
      description,
      expenseDate,
      receiptUrl,
      receiptPublicId,
      receiptFileName,
    } = body;

    // 2. Validate Amount (₹, required, strictly greater than 0)
    if (amount === undefined || amount === null || amount === '') {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Amount (₹) is required.', 400);
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Amount (₹) must be a number greater than 0.', 400);
    }

    // 3. Validate Category (the existing 8 categories)
    if (!category || !Object.values(ExpenseCategory).includes(category as any)) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Category is required and must be one of: ${Object.values(ExpenseCategory).join(', ')}.`,
        400
      );
    }

    // 4. Validate Date (defaults to today)
    let finalDate = new Date();
    if (expenseDate) {
      finalDate = new Date(expenseDate);
      if (isNaN(finalDate.getTime())) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'A valid expense date is required.', 400);
      }
    }

    // 5. Validate Event (user can provide eventId or type eventName by default)
    const rawEventInput = (eventId || eventName || '').trim();
    if (!rawEventInput) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Event is required. Please type or select an event.', 400);
    }

    const { budgetService } = await import('@/lib/budgetService');

    let targetEvent: any = null;

    // A. Check if rawEventInput matches an existing event ID
    if (eventId) {
      try {
        targetEvent = await dbService.getEventById(eventId.trim());
      } catch {
        targetEvent = null;
      }
    }

    // B. If not found by ID, look for an existing event with matching title
    if (!targetEvent) {
      const allEvents = await dbService.getEvents();
      const inputLower = rawEventInput.toLowerCase();
      targetEvent = allEvents.find((e: any) => {
        const titleMatch = e.title && e.title.trim().toLowerCase() === inputLower;
        if (!titleMatch) return false;
        if (user.role === UserRole.CLUB_EXEC && user.clubId) {
          return e.clubId === user.clubId || e.club?.id === user.clubId;
        }
        return true;
      });
    }

    // C. If still not found, auto-create the approved event for this club
    if (!targetEvent) {
      let eventClubId = user.role === UserRole.CLUB_EXEC ? user.clubId : (clientClubId || 'club-acm');
      if (!eventClubId) {
        eventClubId = 'club-acm';
      }

      targetEvent = await dbService.createEvent({
        title: rawEventInput,
        description: `Expense event: ${rawEventInput}`,
        clubId: eventClubId,
        startTime: finalDate,
        endTime: new Date(finalDate.getTime() + 2 * 60 * 60 * 1000),
        venue: 'Campus',
        audienceTags: ['ALL_STUDENTS'],
        category: category,
        eventType: category,
        status: EventStatus.APPROVED,
        approvedBudget: 0,
        estimatedCost: 0,
        submittedById: user.id,
        organizer: user.name || (user.role === UserRole.CORE_VERIFIER ? 'ACM Core' : 'Club Executive'),
      });
    }

    // Server-Side Derivation: Derives clubId and semesterId directly from the event and expense date
    // Never taken from or trusted from client request parameters
    let expenseContext: { clubId: string; semesterId: string; event: any };
    try {
      expenseContext = await budgetService.deriveExpenseContext(targetEvent.id, finalDate);
    } catch (ctxErr: any) {
      return apiError(ErrorCodes.VALIDATION_ERROR, ctxErr.message || 'Failed to resolve event and semester context.', 400);
    }

    const linkedEvent = expenseContext.event;
    if (linkedEvent.status !== 'APPROVED' && linkedEvent.status !== 'COMPLETED') {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Expenses can only be recorded for approved events. Selected event has status '${linkedEvent.status}'.`,
        400
      );
    }

    // Role Ownership check: Club Executive can only record expenses for their own club
    if (user.role === UserRole.CLUB_EXEC && user.clubId) {
      const isOwner =
        expenseContext.clubId === user.clubId ||
        linkedEvent.clubId === user.clubId ||
        (user.name && linkedEvent.club?.name && user.name.toLowerCase().includes(linkedEvent.club.shortName?.toLowerCase() || ''));
      if (!isOwner) {
        return apiError(
          ErrorCodes.FORBIDDEN,
          'Forbidden: You can only record expenses for events hosted by your own club.',
          403
        );
      }
    }

    // 6. Validate Description (required, max 200 characters)
    if (!description || typeof description !== 'string' || !description.trim()) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Description is required.', 400);
    }
    if (description.trim().length > 200) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Description cannot exceed 200 characters. Currently ${description.trim().length} characters.`,
        400
      );
    }

    // 7. Validate Receipt requirement (Required for expenses over ₹500, optional below that)
    const intAmount = Math.round(numAmount);
    if (intAmount > 500) {
      if (!receiptUrl || typeof receiptUrl !== 'string' || !receiptUrl.trim()) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          'Receipt upload is required for any expense over ₹500.',
          400
        );
      }
    }

    // 8. Check club semester budget impact using integer rupees & semester alignment
    let budgetWarning: string | null = null;
    try {
      const allSemesters = await budgetService.getSemesters();
      let eventSem = allSemesters.find(s => s.id === linkedEvent.semesterId);
      if (!eventSem && linkedEvent.startTime) {
        eventSem = allSemesters.find(s => isDateInSemester(linkedEvent.startTime, s));
      }
      
      const budgetDetails = await budgetService.getClubBudgetDetails(expenseContext.clubId, expenseContext.semesterId);
      const projectedSpent = budgetDetails.spent + intAmount;
      if (budgetDetails.allocated > 0 && projectedSpent > budgetDetails.allocated) {
        const excess = projectedSpent - budgetDetails.allocated;
        budgetWarning = `Warning: This expense exceeds ${budgetDetails.club.name}'s semester budget by ₹${excess.toLocaleString('en-IN')}`;
      }

      // Check if expense date matches event's semester
      if (eventSem && expenseContext.semesterId !== eventSem.id) {
        const semWarn = `Warning: Expense date is outside the linked event's semester (${eventSem.name}).`;
        budgetWarning = budgetWarning ? `${budgetWarning}. ${semWarn}` : semWarn;
      }
    } catch (e) {
      // Non-blocking warning check
    }

    const club = await dbService.getClubById(expenseContext.clubId);
    const onBehalfOfClub = user.role === UserRole.CORE_VERIFIER ? (club?.name || expenseContext.clubId) : null;

    // 9. Persist Expense in database linked to event, with server-derived clubId & semesterId
    const createdExpense = await dbService.createExpense({
      eventId: linkedEvent.id,
      clubId: expenseContext.clubId,
      semesterId: expenseContext.semesterId,
      amount: intAmount,
      category,
      description: description.trim(),
      expenseDate: finalDate,
      receiptUrl: receiptUrl ? String(receiptUrl).trim() : null,
      receiptPublicId: receiptPublicId ? String(receiptPublicId).trim() : null,
      receiptFileName: receiptFileName ? String(receiptFileName).trim() : null,
      submittedById: user.id,
      addedByName: user.name || (user.role === UserRole.CORE_VERIFIER ? 'ACM Core' : 'Club Executive'),
      onBehalfOfClub,
    });

    // Write initial ExpenseChangeLog
    try {
      await budgetService.logExpenseChange({
        expenseId: createdExpense.id,
        action: 'CREATED',
        performedBy: user.name || (user.role === UserRole.CORE_VERIFIER ? 'ACM Core' : 'Club Executive'),
        performedById: user.id,
        onBehalfOfClub,
        reason: 'Initial expense entry',
        oldValues: null,
        newValues: {
          amount: intAmount,
          category,
          description: description.trim(),
          expenseDate: finalDate.toISOString(),
          eventId: linkedEvent.id,
        },
      });
    } catch (logErr) {
      console.error('Failed to log expense creation:', logErr);
    }

    return apiSuccess(
      {
        expense: createdExpense,
        warning: budgetWarning,
        clubId: expenseContext.clubId,
        semesterId: expenseContext.semesterId,
      },
      201
    );
  } catch (error: any) {
    console.error('POST /api/expenses error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to record expense', 500);
  }
}
