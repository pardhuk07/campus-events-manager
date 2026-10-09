import { prisma, AudienceType } from '@/lib/prisma';

export interface ConflictCheckParams {
  startTime: Date;
  endTime: Date;
  venue: string;
  audienceType: AudienceType;
  excludeEventId?: string;
}

export interface ConflictReport {
  hasConflict: boolean;
  hardConflicts: Array<{
    eventId: string;
    title: string;
    clubName: string;
    venue: string;
    startTime: Date;
    endTime: Date;
    reason: string;
  }>;
  softConflicts: Array<{
    eventId: string;
    title: string;
    clubName: string;
    audienceType: AudienceType;
    startTime: Date;
    endTime: Date;
    reason: string;
  }>;
}

export async function detectEventConflicts(
  params: ConflictCheckParams
): Promise<ConflictReport> {
  const {
    startTime,
    endTime,
    venue,
    audienceType,
    excludeEventId,
  } = params;

  const overlappingEvents = await prisma.event.findMany({
    where: {
      id: excludeEventId ? { not: excludeEventId } : undefined,
      status: {
        in: ['APPROVED', 'PENDING', 'FLAGGED_CONFLICT'],
      },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    include: {
      club: {
        select: { name: true },
      },
    },
  });

  const report: ConflictReport = {
    hasConflict: false,
    hardConflicts: [],
    softConflicts: [],
  };

  for (const event of overlappingEvents) {
    // Hard conflict: same venue and overlapping time
    if (
      event.venue.trim().toLowerCase() ===
      venue.trim().toLowerCase()
    ) {
      report.hardConflicts.push({
        eventId: event.id,
        title: event.title,
        clubName: event.club.name,
        venue: event.venue,
        startTime: event.startTime,
        endTime: event.endTime,
        reason: `Venue clash: '${event.venue}' is booked by ${event.club.name} for '${event.title}'.`,
      });
    }

    // Soft conflict: overlapping events target the same audience
    if (
      event.audienceType === audienceType ||
      event.audienceType === 'ALL_CAMPUS' ||
      audienceType === 'ALL_CAMPUS'
    ) {
      report.softConflicts.push({
        eventId: event.id,
        title: event.title,
        clubName: event.club.name,
        audienceType: event.audienceType,
        startTime: event.startTime,
        endTime: event.endTime,
        reason: `Audience clash: ${event.club.name} is hosting '${event.title}' targeting ${event.audienceType}.`,
      });
    }
  }

  report.hasConflict =
    report.hardConflicts.length > 0 ||
    report.softConflicts.length > 0;

  return report;
}
