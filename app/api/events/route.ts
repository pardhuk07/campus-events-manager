import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { checkEventConflicts } from '@/services/conflictEngine';
import {
  apiSuccess,
  apiError,
  ErrorCodes,
  EventStatus,
  UserRole,
} from '@/lib/constants';

// GET /api/events - List and search/filter events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const status = searchParams.get('status');
    const venue = searchParams.get('venue');
    const query = searchParams.get('query');
    const userRole = searchParams.get('userRole');

    let events = await dbService.getEvents();

    // Public users and general members can ONLY see APPROVED events
    if (userRole === UserRole.MEMBER || userRole === 'PUBLIC') {
      events = events.filter((e: any) => e.status === EventStatus.APPROVED);
    } else if (status && status !== 'ALL') {
      events = events.filter((e: any) => e.status === status);
    }
    if (clubId) {
      events = events.filter((e: any) => e.clubId === clubId);
    }
    if (venue) {
      events = events.filter((e: any) => e.venue.toLowerCase().includes(venue.toLowerCase()));
    }
    if (query) {
      const q = query.toLowerCase();
      events = events.filter(
        (e: any) =>
          e.title.toLowerCase().includes(q) ||
          e.venue.toLowerCase().includes(q) ||
          (e.club?.name && e.club.name.toLowerCase().includes(q))
      );
    }

    return apiSuccess(events);
  } catch (error: any) {
    console.error('GET /api/events error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch events', 500);
  }
}

// POST /api/events - Create new event proposal & trigger conflict detection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      clubId,
      startTime,
      endTime,
      venue,
      audienceTags,
      expectedAttendance,
      category,
      submittedById,
      userRole,
    } = body;

    // RBAC: Only CLUB_EXEC and CORE_VERIFIER can submit events
    if (userRole === UserRole.MEMBER) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Regular members cannot submit events. Only Club Executives and Core Verifiers are permitted.',
        403
      );
    }

    // Required field validation according to Section 21
    if (!title || !title.trim()) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Event title is required.');
    }
    if (!clubId) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Organizing club is required.');
    }
    if (!venue || !venue.trim()) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Venue is required.');
    }
    if (!startTime || !endTime) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Start time and end time are required.');
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return apiError(ErrorCodes.INVALID_EVENT_TIME, 'Invalid date or time format.');
    }
    if (end <= start) {
      return apiError(ErrorCodes.INVALID_EVENT_TIME, 'End time must be strictly after start time.');
    }

    const tags = Array.isArray(audienceTags) && audienceTags.length > 0 ? audienceTags : ['ALL_STUDENTS'];

    // Resolve submitting user id
    let finalSubmitterId = submittedById;
    if (!finalSubmitterId) {
      const defaultUser = await dbService.getUserByEmail('pardhu120907@gmail.com');
      finalSubmitterId = defaultUser ? defaultUser.id : 'user-pardhu';
    }

    // 1. Create the event initially with PENDING status
    const createdEvent = await dbService.createEvent({
      title: title.trim(),
      description: description || null,
      clubId,
      startTime: start,
      endTime: end,
      venue: venue.trim(),
      audienceTags: tags,
      expectedAttendance: expectedAttendance ? parseInt(expectedAttendance) : 50,
      category: category || 'General',
      status: EventStatus.PENDING,
      submittedById: finalSubmitterId,
    });

    // 2. Trigger Person 2 Conflict Detection Engine
    let conflictResult: any = { hasConflict: false, conflicts: [] };
    try {
      conflictResult = await checkEventConflicts({
        startTime: start,
        endTime: end,
        venue: venue.trim(),
        audienceTags: tags,
        excludeEventId: createdEvent.id,
        createRecordsIfEventId: createdEvent.id,
      });
    } catch (conflictErr) {
      console.error('Non-blocking conflict detection error:', conflictErr);
    }

    // Rule 1: A conflict is a WARNING, not an automatic rejection. Event stays PENDING, conflicts are flagged for review.
    return apiSuccess(
      {
        event: createdEvent,
        hasConflict: conflictResult.hasConflict,
        conflictsCount: conflictResult.conflicts?.length || 0,
        conflicts: conflictResult.conflicts || [],
      },
      201
    );
  } catch (error: any) {
    console.error('POST /api/events error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to create event', 500);
  }
}
