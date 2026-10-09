import { NextResponse } from 'next/server';
import { detectEventConflicts } from '@/services/conflictDetector';
import { prisma, AudienceType } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { startTime, endTime, venue, audienceType } = body;

    if (!startTime || !endTime || !venue) {
      return NextResponse.json(
        { error: 'startTime, endTime, and venue are required.' },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json(
        { error: 'End time must be after start time.' },
        { status: 400 }
      );
    }

    const report = await detectEventConflicts({
      startTime: start,
      endTime: end,
      venue: venue.trim(),
      audienceType: (audienceType as AudienceType) || 'ALL_CAMPUS',
    });

    // Compute suggested alternative free slots on the same day for this venue
    const dayStart = new Date(start);
    dayStart.setHours(9, 0, 0, 0); // 9:00 AM campus opening
    const dayEnd = new Date(start);
    dayEnd.setHours(21, 0, 0, 0); // 9:00 PM campus closing

    const dayEvents = await prisma.event.findMany({
      where: {
        venue: venue.trim(),
        status: { in: ['APPROVED', 'PENDING', 'FLAGGED_CONFLICT'] },
        startTime: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { startTime: 'asc' },
    });

    // Duration of requested event in ms
    const requestedDurationMs = end.getTime() - start.getTime();
    const suggestedSlots: Array<{ start: string; end: string; label: string }> = [];

    // Find gaps before, between, and after existing bookings
    let cursor = dayStart.getTime();
    for (const ev of dayEvents) {
      const evStart = new Date(ev.startTime).getTime();
      const evEnd = new Date(ev.endTime).getTime();

      if (evStart - cursor >= requestedDurationMs) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor + requestedDurationMs);
        suggestedSlots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          label: `${slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${slotEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        });
      }
      cursor = Math.max(cursor, evEnd);
    }

    if (dayEnd.getTime() - cursor >= requestedDurationMs) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor + requestedDurationMs);
      suggestedSlots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        label: `${slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${slotEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      });
    }

    return NextResponse.json({
      ...report,
      suggestedSlots: suggestedSlots.slice(0, 3), // return up to 3 best slots
    });
  } catch (error) {
    console.error('Conflict live check failed:', error);
    return NextResponse.json(
      { error: 'Unable to check conflicts.' },
      { status: 500 }
    );
  }
}
