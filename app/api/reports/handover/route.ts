import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    const [events, expenses, budgets] = await Promise.all([
      dbService.getEvents(),
      dbService.getExpenses(),
      dbService.getBudgets(),
    ]);

    const activeBudget = budgets[0] || { name: 'Fall 2026 Semester Budget', amount: 50000 };
    const totalAllocated = parseFloat(activeBudget.amount);
    const totalSpent = expenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0);
    const remainingBudget = totalAllocated - totalSpent;

    if (format === 'csv') {
      let csvContent = 'ACM NIT SURAT - CONFLICT-AWARE EVENTS & EXPENSES AUDIT REPORT\n';
      csvContent += `Generated On: ${new Date().toISOString()}\n`;
      csvContent += `Semester Budget: Rs. ${totalAllocated}, Total Spent: Rs. ${totalSpent}, Remaining Balance: Rs. ${remainingBudget}\n\n`;

      csvContent += '--- SECTION 1: FINANCIAL EXPENSES LEDGER ---\n';
      csvContent += 'ID,Description,Category,Amount (INR),Date,Linked Event,Receipt Link\n';
      for (const exp of expenses) {
        const desc = `"${(exp.description || exp.category).replace(/"/g, '""')}"`;
        const eventTitle = exp.event?.title ? `"${exp.event.title.replace(/"/g, '""')}"` : 'General / Unlinked';
        const receipt = exp.receiptUrl || 'No receipt attached';
        csvContent += `${exp.id},${desc},${exp.category},${exp.amount},${new Date(exp.expenseDate).toLocaleDateString()},${eventTitle},${receipt}\n`;
      }

      csvContent += '\n--- SECTION 2: CAMPUS EVENTS & SCHEDULING HISTORY ---\n';
      csvContent += 'ID,Event Title,Club,Venue,Start Time,End Time,Audience Target,Status\n';
      for (const ev of events) {
        const evTitle = `"${ev.title.replace(/"/g, '""')}"`;
        const tags = `"${(ev.audienceTags || []).join(', ')}"`;
        csvContent += `${ev.id},${evTitle},"${ev.club?.name || 'Club'}","${ev.venue}",${new Date(ev.startTime).toISOString()},${new Date(ev.endTime).toISOString()},${tags},${ev.status}\n`;
      }

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ACM_Events_Expenses_Report_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return apiSuccess({
      summary: {
        totalEvents: events.length,
        totalExpenses: expenses.length,
        totalAllocated,
        totalSpent,
        remainingBudget,
      },
      events,
      expenses,
    });
  } catch (error: any) {
    console.error('Handover report error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Report generation failed', 500);
  }
}
