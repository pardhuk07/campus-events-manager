import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectConflicts,
  doTimesOverlap,
  doVenuesMatch,
  doAudiencesOverlap,
  formatConflictTime,
  EventItem,
} from '../lib/conflictDetector';

describe('Conflict Detection Engine Unit Tests', () => {
  // Helper dates on 2026-10-18
  const time = (h: number, m: number = 0) => new Date(2026, 9, 18, h, m, 0, 0);

  // ==========================================
  // 1. OVERLAP CASES
  // ==========================================
  describe('Overlap Cases', () => {
    it('flags a venue conflict when venue matches and times overlap, but audiences are different', () => {
      const existing: EventItem[] = [
        {
          id: 'ev-1',
          title: 'AI Workshop',
          startTime: time(10, 0),
          endTime: time(12, 0),
          venue: 'Seminar Hall 1',
          audienceTags: ['AI_RESEARCHERS'],
          status: 'APPROVED',
        },
      ];

      const candidate: EventItem = {
        title: 'Cybersecurity Seminar',
        startTime: time(11, 0),
        endTime: time(13, 0),
        venue: 'Seminar Hall 1',
        audienceTags: ['SECURITY_STUDENTS'],
      };

      const conflicts = detectConflicts(candidate, existing);

      assert.equal(conflicts.length, 1);
      assert.equal(conflicts[0].conflictType, 'venue conflict');
      assert.match(conflicts[0].reason, /^Overlaps with AI Workshop, .+, venue conflict$/);
    });

    it('flags an audience conflict when target groups overlap regardless of venue', () => {
      const existing: EventItem[] = [
        {
          id: 'ev-2',
          title: 'CodeSprint Hackathon',
          startTime: time(14, 0),
          endTime: time(17, 0),
          venue: 'Central Auditorium',
          audienceTags: ['TECH_UG'],
          status: 'APPROVED',
        },
      ];

      const candidate: EventItem = {
        title: 'Open Source Meetup',
        startTime: time(15, 0),
        endTime: time(16, 30),
        venue: 'CS Dept Lab 3', // Different venue
        audienceTags: ['TECH_UG'], // Same target group
      };

      const conflicts = detectConflicts(candidate, existing);

      assert.equal(conflicts.length, 1);
      assert.equal(conflicts[0].conflictType, 'audience conflict');
      assert.match(conflicts[0].reason, /^Overlaps with CodeSprint Hackathon, .+, audience conflict$/);
    });

    it('flags separate venue AND audience conflicts when both venue matches and target groups overlap', () => {
      const existing: EventItem[] = [
        {
          id: 'ev-3',
          title: 'Robotics Bootcamp',
          startTime: time(9, 0),
          endTime: time(12, 0),
          venue: 'Seminar Hall 2',
          audienceTags: ['FIRST_YEAR'],
          status: 'PENDING',
        },
      ];

      const candidate: EventItem = {
        title: 'Drone Flying Workshop',
        startTime: time(10, 0),
        endTime: time(11, 30),
        venue: 'Seminar Hall 2', // Same venue
        audienceTags: ['FIRST_YEAR'], // Same audience
      };

      const conflicts = detectConflicts(candidate, existing);

      // Must flag BOTH as separate conflicts
      assert.equal(conflicts.length, 2);

      const venueConflict = conflicts.find((c) => c.conflictType === 'venue conflict');
      const audienceConflict = conflicts.find((c) => c.conflictType === 'audience conflict');

      assert.ok(venueConflict, 'Should have flagged a separate venue conflict');
      assert.ok(audienceConflict, 'Should have flagged a separate audience conflict');

      assert.match(venueConflict.reason, /^Overlaps with Robotics Bootcamp, .+, venue conflict$/);
      assert.match(audienceConflict.reason, /^Overlaps with Robotics Bootcamp, .+, audience conflict$/);
    });

    it('flags conflict when candidate starts before and ends inside existing event', () => {
      const existing: EventItem[] = [
        {
          id: 'ev-4',
          title: 'Existing Talk',
          startTime: time(10, 0),
          endTime: time(12, 0),
          venue: 'Seminar Hall 1',
          audienceTags: ['TECH_UG'],
          status: 'APPROVED',
        },
      ];

      const candidate: EventItem = {
        title: 'Early Workshop',
        startTime: time(9, 30),
        endTime: time(10, 30), // Overlaps between 10:00 and 10:30
        venue: 'Seminar Hall 1',
        audienceTags: ['TECH_UG'],
      };

      const conflicts = detectConflicts(candidate, existing);
      assert.equal(conflicts.length, 2); // Both venue & audience
    });

    it('flags conflict when candidate encloses existing event completely', () => {
      const existing: EventItem[] = [
        {
          id: 'ev-5',
          title: 'Short Meeting',
          startTime: time(11, 0),
          endTime: time(11, 30),
          venue: 'Seminar Hall 1',
          audienceTags: ['TECH_UG'],
          status: 'APPROVED',
        },
      ];

      const candidate: EventItem = {
        title: 'Full Day Festival',
        startTime: time(9, 0),
        endTime: time(17, 0),
        venue: 'Seminar Hall 1',
        audienceTags: ['TECH_UG'],
      };

      const conflicts = detectConflicts(candidate, existing);
      assert.equal(conflicts.length, 2);
    });
  });

  // ==========================================
  // 2. BACK-TO-BACK CASES (MUST NOT CONFLICT)
  // ==========================================
  describe('Back-to-Back Cases', () => {
    it('does NOT conflict when candidate ends exactly when existing starts (endA === startB)', () => {
      const existing: EventItem[] = [
        {
          id: 'ev-b2b-1',
          title: 'Afternoon Hackathon',
          startTime: time(12, 0),
          endTime: time(15, 0),
          venue: 'Central Auditorium',
          audienceTags: ['ALL_STUDENTS'],
          status: 'APPROVED',
        },
      ];

      // Candidate ends at exactly 12:00
      const candidate: EventItem = {
        title: 'Morning Keynote',
        startTime: time(9, 0),
        endTime: time(12, 0),
        venue: 'Central Auditorium', // Same venue
        audienceTags: ['ALL_STUDENTS'], // Same audience
      };

      const conflicts = detectConflicts(candidate, existing);
      assert.equal(conflicts.length, 0, 'Back-to-back events must not conflict');
    });

    it('does NOT conflict when candidate starts exactly when existing ends (startA === endB)', () => {
      const existing: EventItem[] = [
        {
          id: 'ev-b2b-2',
          title: 'Morning Session',
          startTime: time(9, 0),
          endTime: time(11, 0),
          venue: 'Seminar Hall 1',
          audienceTags: ['TECH_UG'],
          status: 'APPROVED',
        },
      ];

      // Candidate starts at exactly 11:00
      const candidate: EventItem = {
        title: 'Post-Morning Session',
        startTime: time(11, 0),
        endTime: time(13, 0),
        venue: 'Seminar Hall 1',
        audienceTags: ['TECH_UG'],
      };

      const conflicts = detectConflicts(candidate, existing);
      assert.equal(conflicts.length, 0, 'Back-to-back events must not conflict');
    });

    it('verifies mathematical strict inequality doTimesOverlap(10, 11, 11, 12) is false', () => {
      const overlap = doTimesOverlap(time(10, 0), time(11, 0), time(11, 0), time(12, 0));
      assert.equal(overlap, false);
    });
  });

  // ==========================================
  // 3. DIFFERENT-AUDIENCE CASES
  // ==========================================
  describe('Different-Audience Cases', () => {
    it('does NOT flag an audience conflict when times overlap at different venues with distinct target groups', () => {
      const existing: EventItem[] = [
        {
          id: 'ev-aud-1',
          title: 'CAD Design Workshop',
          startTime: time(14, 0),
          endTime: time(16, 0),
          venue: 'Mechanical Hall A',
          audienceTags: ['DESIGN_PG'],
          status: 'APPROVED',
        },
      ];

      const candidate: EventItem = {
        title: 'Competitive Programming Contest',
        startTime: time(14, 0),
        endTime: time(16, 0), // Same time!
        venue: 'CS Dept Lab 3', // Different venue
        audienceTags: ['TECH_UG'], // Distinct target group
      };

      const conflicts = detectConflicts(candidate, existing);
      assert.equal(conflicts.length, 0, 'Different audience at different venue must not conflict');
    });

    it('flags ONLY a venue conflict if audiences differ but venue is shared during overlapping times', () => {
      const existing: EventItem[] = [
        {
          id: 'ev-aud-2',
          title: 'MBA Seminar',
          startTime: time(10, 0),
          endTime: time(12, 0),
          venue: 'Central Auditorium',
          audienceTags: ['MANAGEMENT_PG'],
          status: 'APPROVED',
        },
      ];

      const candidate: EventItem = {
        title: 'BTech Orientation',
        startTime: time(11, 0),
        endTime: time(13, 0),
        venue: 'Central Auditorium', // Same venue
        audienceTags: ['FIRST_YEAR_UG'], // Distinct audience
      };

      const conflicts = detectConflicts(candidate, existing);
      assert.equal(conflicts.length, 1);
      assert.equal(conflicts[0].conflictType, 'venue conflict');
      assert.match(conflicts[0].reason, /^Overlaps with MBA Seminar, .+, venue conflict$/);
    });
  });

  // ==========================================
  // 4. STATUS FILTERING & REJECTED EVENTS
  // ==========================================
  describe('Status Filtering', () => {
    it('does NOT conflict with REJECTED events (rejected events must not block new proposals)', () => {
      const existing: EventItem[] = [
        {
          id: 'ev-rej',
          title: 'Rejected Event',
          startTime: time(10, 0),
          endTime: time(12, 0),
          venue: 'Seminar Hall 1',
          audienceTags: ['ALL_STUDENTS'],
          status: 'REJECTED',
        },
      ];

      const candidate: EventItem = {
        title: 'New Valid Proposal',
        startTime: time(10, 0),
        endTime: time(12, 0),
        venue: 'Seminar Hall 1',
        audienceTags: ['ALL_STUDENTS'],
      };

      const conflicts = detectConflicts(candidate, existing);
      assert.equal(conflicts.length, 0, 'Rejected events must never generate conflicts');
    });

    it('does NOT conflict with CANCELLED events', () => {
      const existing: EventItem[] = [
        {
          id: 'ev-canc',
          title: 'Cancelled Fest',
          startTime: time(10, 0),
          endTime: time(12, 0),
          venue: 'Seminar Hall 1',
          audienceTags: ['ALL_STUDENTS'],
          status: 'CANCELLED',
        },
      ];

      const candidate: EventItem = {
        title: 'New Fest',
        startTime: time(10, 0),
        endTime: time(12, 0),
        venue: 'Seminar Hall 1',
        audienceTags: ['ALL_STUDENTS'],
      };

      const conflicts = detectConflicts(candidate, existing);
      assert.equal(conflicts.length, 0, 'Cancelled events must never generate conflicts');
    });

    it('conflicts with PENDING events', () => {
      const existing: EventItem[] = [
        {
          id: 'ev-pend',
          title: 'Pending Proposal',
          startTime: time(10, 0),
          endTime: time(12, 0),
          venue: 'Seminar Hall 1',
          audienceTags: ['TECH_UG'],
          status: 'PENDING',
        },
      ];

      const candidate: EventItem = {
        title: 'Another Proposal',
        startTime: time(11, 0),
        endTime: time(13, 0),
        venue: 'Seminar Hall 1',
        audienceTags: ['TECH_UG'],
      };

      const conflicts = detectConflicts(candidate, existing);
      assert.equal(conflicts.length, 2);
    });
  });

  // ==========================================
  // 5. EDITING PROPOSALS & SELF-EXCLUSION
  // ==========================================
  describe('Proposal Editing & Self-Exclusion', () => {
    it('does NOT conflict with itself when candidate ID matches existing event ID', () => {
      const candidate: EventItem = {
        id: 'event-edit-1',
        title: 'Editing My Own Event',
        startTime: time(10, 0),
        endTime: time(12, 0),
        venue: 'Seminar Hall 1',
        audienceTags: ['TECH_UG'],
        status: 'PENDING',
      };

      const existing: EventItem[] = [candidate];

      const conflicts = detectConflicts(candidate, existing);
      assert.equal(conflicts.length, 0, 'An event being edited must not conflict with itself');
    });
  });

  // ==========================================
  // 6. FLAG STRING FORMATTING VERIFICATION
  // ==========================================
  describe('Flag String Formatting', () => {
    it('formats flags strictly as Overlaps with <event>, <time>, <reason>', () => {
      const existing: EventItem[] = [
        {
          id: 'ev-fmt',
          title: 'Web Dev Workshop',
          startTime: time(10, 0),
          endTime: time(12, 0),
          venue: 'Seminar Hall 1',
          audienceTags: ['TECH_UG'],
          status: 'APPROVED',
        },
      ];

      const candidate: EventItem = {
        title: 'UI Design Masterclass',
        startTime: time(10, 30),
        endTime: time(11, 30),
        venue: 'Seminar Hall 1',
        audienceTags: ['TECH_UG'],
      };

      const conflicts = detectConflicts(candidate, existing);
      assert.equal(conflicts.length, 2);

      const vConf = conflicts.find((c) => c.conflictType === 'venue conflict');
      const aConf = conflicts.find((c) => c.conflictType === 'audience conflict');

      assert.ok(vConf?.reason.startsWith('Overlaps with Web Dev Workshop, '));
      assert.ok(vConf?.reason.endsWith(', venue conflict'));

      assert.ok(aConf?.reason.startsWith('Overlaps with Web Dev Workshop, '));
      assert.ok(aConf?.reason.endsWith(', audience conflict'));
    });
  });

  // ==========================================
  // 7. PROPOSALS WITH EVENT TYPE, COST & ORGANIZER
  // ==========================================
  describe('Proposal with Event Type, Estimated Cost, and Organizer', () => {
    it('accurately detects audience conflicts when proposals carry eventType, estimatedCost, and organizer fields', () => {
      const existing: EventItem[] = [
        {
          id: 'ev-prop-1',
          title: 'ACM Coding Championship',
          startTime: time(14, 0),
          endTime: time(17, 0),
          venue: 'Central Auditorium',
          audienceTags: ['TECH_UG'],
          status: 'APPROVED',
          eventType: 'Competition',
          estimatedCost: 8000,
          organizer: 'Pardhu (ACM Lead)',
        },
      ];

      const candidate: EventItem = {
        title: 'Algorithms Workshop',
        startTime: time(15, 0),
        endTime: time(16, 30),
        venue: 'ECE Seminar Hall', // Different venue
        audienceTags: ['TECH_UG'], // Same audience
        eventType: 'Workshop',
        estimatedCost: 2500,
        organizer: 'Club Executive',
      };

      const conflicts = detectConflicts(candidate, existing);

      // Audience conflict must be detected cleanly regardless of venue
      assert.equal(conflicts.length, 1);
      assert.equal(conflicts[0].conflictType, 'audience conflict');
      assert.match(conflicts[0].reason, /^Overlaps with ACM Coding Championship, .+, audience conflict$/);
    });
  });
});
