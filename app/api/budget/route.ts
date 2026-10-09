import { NextResponse } from 'next/server';
import { prisma, Role } from '@/lib/prisma';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { semester = 'Fall 2026', totalAllocated, userRole } = body;

    // RBAC Security Check: Only ACM Core Verifiers can adjust the semester budget
    if (userRole !== Role.ACM_CORE) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Only ACM Core Verifiers have permission to modify the semester budget.',
        },
        { status: 403 }
      );
    }

    const parsedBudget = parseFloat(totalAllocated);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      return NextResponse.json(
        { success: false, error: 'Budget amount must be a positive number.' },
        { status: 400 }
      );
    }

    // Upsert the budget record
    const updatedBudget = await prisma.budget.upsert({
      where: { semester },
      update: { totalAllocated: parsedBudget },
      create: {
        semester,
        totalAllocated: parsedBudget,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Semester budget successfully updated to ₹${updatedBudget.totalAllocated.toLocaleString()}`,
      budget: updatedBudget,
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
