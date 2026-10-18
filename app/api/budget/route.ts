import { NextResponse } from 'next/server';
import { dbService } from '@/lib/dbService';
import { UserRole } from '@/lib/constants';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { amount, totalAllocated, userRole } = body;

    // RBAC Security Check: Only ACM Core Verifiers can adjust the semester budget
    if (userRole !== UserRole.CORE_VERIFIER && userRole !== 'ACM_CORE') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Only ACM Core Verifiers have permission to modify the semester budget.',
        },
        { status: 403 }
      );
    }

    const parsedBudget = parseFloat(amount || totalAllocated);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      return NextResponse.json(
        { success: false, error: 'Budget amount must be a positive number.' },
        { status: 400 }
      );
    }

    const budgets = await dbService.getBudgets();
    const active = budgets[0];
    if (active) {
      const updated = await dbService.updateBudget(active.id, { amount: parsedBudget });
      return NextResponse.json({
        success: true,
        message: `Semester budget successfully updated to ₹${parsedBudget.toLocaleString()}`,
        budget: updated,
      });
    }

    return NextResponse.json({ success: false, error: 'No active budget found' }, { status: 404 });
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
