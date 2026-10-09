import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // 1. Fetch historical events and linked expenses
    const events = await prisma.event.findMany({
      include: {
        club: { select: { name: true } },
        expenses: true,
      },
      orderBy: { startTime: 'desc' },
    });

    // 2. Fetch all expenses
    const expenses = await prisma.expense.findMany({
      include: {
        event: { select: { title: true } },
      },
      orderBy: { date: 'desc' },
    });

    const budget = await prisma.budget.findFirst();
    const totalAllocated = budget?.totalAllocated || 50000;
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    // 3. Export as CSV format for handover reports
    if (format === 'csv') {
      let csvContent = 'ACM CAMPUS EVENTS & EXPENSES - INSTITUTIONAL MEMORY AUDIT REPORT\n';
      csvContent += `Generated On: ${new Date().toISOString()}\n`;
      csvContent += `Semester Budget: Rs. ${totalAllocated}, Total Spent: Rs. ${totalSpent}, Remaining: Rs. ${totalAllocated - totalSpent}\n\n`;

      csvContent += '--- SECTION 1: FINANCIAL TRANSACTIONS LEDGER ---\n';
      csvContent += 'ID,Expense Title,Category,Amount (INR),Date,Linked Event,Receipt Link\n';
      for (const exp of expenses) {
        const title = `"${exp.title.replace(/"/g, '""')}"`;
        const eventTitle = exp.event ? `"${exp.event.title.replace(/"/g, '""')}"` : 'General / Unlinked';
        const receipt = exp.receiptUrl || 'No receipt attached';
        csvContent += `${exp.id},${title},${exp.category},${exp.amount},${new Date(exp.date).toLocaleDateString()},${eventTitle},${receipt}\n`;
      }

      csvContent += '\n--- SECTION 2: CAMPUS EVENTS & SCHEDULING CONFLICT HISTORY ---\n';
      csvContent += 'ID,Event Title,Club,Venue,Start Time,End Time,Audience Type,Status,Total Event Expenses\n';
      for (const ev of events) {
        const evTitle = `"${ev.title.replace(/"/g, '""')}"`;
        const eventExpensesTotal = ev.expenses.reduce((s, e) => s + e.amount, 0);
        csvContent += `${ev.id},${evTitle},"${ev.club.name}","${ev.venue}",${ev.startTime.toISOString()},${ev.endTime.toISOString()},${ev.audienceType},${ev.status},${eventExpensesTotal}\n`;
      }

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ACM_Institutional_Memory_Report_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      institutionalMemory: {
        summary: {
          totalEventsRecorded: events.length,
          conflictsFlagged: events.filter((e) => e.status === 'FLAGGED_CONFLICT').length,
          totalExpensesRecorded: expenses.length,
          totalAllocated,
          totalSpent,
          remainingBudget: totalAllocated - totalSpent,
        },
        events,
        expenses,
      },
    });
  } catch (error) {
    console.error('Error generating handover report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
