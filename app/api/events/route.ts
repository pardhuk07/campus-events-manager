import { NextResponse } from 'next/server';
import { prisma, AudienceType, EventStatus, Role } from '@/lib/prisma';
import { detectEventConflicts } from '@/services/conflictDetector';

// 1. GET /api/events - Anyone can view campus events (Members, Execs, Core)
export async function GET() {
  try {
    const events = await prisma.event.findMany({
      include: {
        club: { select: { id: true, name: true } },
        expenses: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// 2. POST /api/events - Only CLUB_EXEC and ACM_CORE can submit proposals
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      startTime,
      endTime,
      venue,
      expectedAudience,
      audienceType,
      clubId,
      userRole,
    } = body;

    // RBAC Security Check: Regular Members cannot schedule events
    if (userRole === Role.MEMBER) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Regular members cannot schedule events. Only Club Executives and ACM Core are authorized.',
        },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!title || !startTime || !endTime || !venue || !audienceType || !clubId) {
      return NextResponse.json(
        { success: false, error: 'Title, startTime, endTime, venue, audienceType, and clubId are required.' },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json(
        { success: false, error: 'Please provide valid dates. End time must be after start time.' },
        { status: 400 }
      );
    }

    if (!Object.values(AudienceType).includes(audienceType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid audienceType.' },
        { status: 400 }
      );
    }

    // Run the Conflict Detection Engine
    const conflictReport = await detectEventConflicts({
      startTime: start,
      endTime: end,
      venue: venue.trim(),
      audienceType: audienceType as AudienceType,
    });

    // Auto-flag status if hard or soft conflict is detected
    let initialStatus: EventStatus = EventStatus.PENDING;
    if (conflictReport.hardConflicts.length > 0) {
      initialStatus = EventStatus.FLAGGED_CONFLICT;
    }

    // Save event in PostgreSQL
    const newEvent = await prisma.event.create({
      data: {
        title,
        description: description || null,
        startTime: start,
        endTime: end,
        venue: venue.trim(),
        expectedAudience: Number(expectedAudience) || 50,
        audienceType: audienceType as AudienceType,
        status: initialStatus,
        clubId,
      },
      include: {
        club: { select: { name: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: conflictReport.hasConflict
          ? 'Event submitted with detected conflicts!'
          : 'Event submitted successfully with no conflicts.',
        event: newEvent,
        conflictReport,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
