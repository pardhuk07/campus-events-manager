import { NextResponse } from 'next/server';
import { detectEventConflicts } from '@/services/conflictDetector';
import { AudienceType } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { startTime, endTime, venue, audienceType } = body;

    if (!startTime || !endTime || !venue || !audienceType) {
      return NextResponse.json(
        { error: 'startTime, endTime, venue, and audienceType are required.' },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start >= end
    ) {
      return NextResponse.json(
        { error: 'Please provide valid dates. End time must be after start time.' },
        { status: 400 }
      );
    }

    if (!Object.values(AudienceType).includes(audienceType)) {
      return NextResponse.json(
        { error: 'Invalid audienceType.' },
        { status: 400 }
      );
    }

    const report = await detectEventConflicts({
      startTime: start,
      endTime: end,
      venue: venue.trim(),
      audienceType: audienceType as AudienceType,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Conflict detection failed:', error);
    return NextResponse.json(
      { error: 'Unable to check event conflicts.' },
      { status: 500 }
    );
  }
}
