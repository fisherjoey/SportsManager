/**
 * Comprehensive unit tests for ICS Parser utility
 * Tests parsing of ICS calendar files and converting events to game data
 */

import { ICSParser } from '../ics-parser';
import type { ParsedEvent, ParsedCalendar, GameImportData } from '../ics-parser';

describe('ICSParser', () => {
  let parser: ICSParser;

  beforeEach(() => {
    parser = new ICSParser();
  });

  describe('parse', () => {
    it('should parse basic ICS content', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test Calendar//EN
BEGIN:VEVENT
UID:test-event-1@example.com
SUMMARY:Team A vs Team B
DESCRIPTION:Regular season game
LOCATION:Stadium Field 1
DTSTART:20250201T140000Z
DTEND:20250201T160000Z
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);

      expect(result.version).toBe('2.0');
      expect(result.prodId).toBe('-//Test Calendar//EN');
      expect(result.events).toHaveLength(1);

      const event = result.events[0];
      expect(event.uid).toBe('test-event-1@example.com');
      expect(event.summary).toBe('Team A vs Team B');
      expect(event.description).toBe('Regular season game');
      expect(event.location).toBe('Stadium Field 1');
      expect(event.status).toBe('CONFIRMED');
      expect(event.startDate).toEqual(new Date('2025-02-01T14:00:00Z'));
      expect(event.endDate).toEqual(new Date('2025-02-01T16:00:00Z'));
    });

    it('should handle calendar with multiple events', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-1
SUMMARY:Game 1
DTSTART:20250201T140000Z
END:VEVENT
BEGIN:VEVENT
UID:event-2
SUMMARY:Game 2
DTSTART:20250202T160000Z
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);

      expect(result.events).toHaveLength(2);
      expect(result.events[0].summary).toBe('Game 1');
      expect(result.events[1].summary).toBe('Game 2');
    });

    it('should handle line continuations', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-event
SUMMARY:Very Long Event Title That Spans Multiple
 Lines In The ICS Format
DESCRIPTION:This is a description that also spans\\n
 multiple lines and includes escaped characters\\,
 like commas and line breaks.
DTSTART:20250201T140000Z
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);

      expect(result.events[0].summary).toBe('Very Long Event Title That Spans Multiple Lines In The ICS Format');
      expect(result.events[0].description).toContain('This is a description');
      expect(result.events[0].description).toContain('\n');
      expect(result.events[0].description).toContain(',');
    });

    it('should handle events with categories and organizer', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-event
SUMMARY:Championship Game
DTSTART:20250201T140000Z
CATEGORIES:U16,Tournament,Playoffs
ORGANIZER:mailto:organizer@league.com
ATTENDEE:mailto:referee1@example.com
ATTENDEE:mailto:referee2@example.com
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);
      const event = result.events[0];

      expect(event.categories).toEqual(['U16', 'Tournament', 'Playoffs']);
      expect(event.organizer).toBe('organizer@league.com');
      expect(event.attendees).toEqual(['referee1@example.com', 'referee2@example.com']);
    });

    it('should handle recurrence rules', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:recurring-event
SUMMARY:Weekly Training
DTSTART:20250201T140000Z
RRULE:FREQ=WEEKLY;COUNT=10
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);

      expect(result.events[0].recurrenceRule).toBe('FREQ=WEEKLY;COUNT=10');
    });

    it('should handle created and last modified dates', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-event
SUMMARY:Test Event
DTSTART:20250201T140000Z
CREATED:20250101T120000Z
LAST-MODIFIED:20250115T100000Z
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);
      const event = result.events[0];

      expect(event.created).toEqual(new Date('2025-01-01T12:00:00Z'));
      expect(event.lastModified).toEqual(new Date('2025-01-15T10:00:00Z'));
    });

    it('should set default end date if not provided', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-event
SUMMARY:Event Without End Time
DTSTART:20250201T140000Z
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);
      const event = result.events[0];

      const expectedEndDate = new Date('2025-02-01T16:00:00Z'); // 2 hours after start
      expect(event.endDate).toEqual(expectedEndDate);
    });

    it('should reject events without required fields', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:incomplete-event
DESCRIPTION:Event without summary or start date
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);

      expect(result.events).toHaveLength(0);
    });

    it('should handle calendar metadata', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Example Corp//CalDAV Client//EN
X-WR-CALNAME:Soccer League Schedule
X-WR-TIMEZONE:America/New_York
BEGIN:VEVENT
UID:test-event
SUMMARY:Test Game
DTSTART:20250201T140000Z
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);

      expect(result.version).toBe('2.0');
      expect(result.prodId).toBe('-//Example Corp//CalDAV Client//EN');
      expect(result.calendarName).toBe('Soccer League Schedule');
      expect(result.timezone).toBe('America/New_York');
    });

    it('should handle different line endings', () => {
      // Test with Windows line endings
      const icsContentWindows = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:test\r\nSUMMARY:Test Event\r\nDTSTART:20250201T140000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;

      // Test with Mac line endings
      const icsContentMac = `BEGIN:VCALENDAR\rVERSION:2.0\rBEGIN:VEVENT\rUID:test\rSUMMARY:Test Event\rDTSTART:20250201T140000Z\rEND:VEVENT\rEND:VCALENDAR`;

      const resultWindows = parser.parse(icsContentWindows);
      const resultMac = parser.parse(icsContentMac);

      expect(resultWindows.events).toHaveLength(1);
      expect(resultMac.events).toHaveLength(1);
      expect(resultWindows.events[0].summary).toBe('Test Event');
      expect(resultMac.events[0].summary).toBe('Test Event');
    });
  });

  describe('parseDateTime', () => {
    it('should parse UTC timestamps', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test
SUMMARY:UTC Event
DTSTART:20250201T140000Z
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);

      expect(result.events[0].startDate).toEqual(new Date('2025-02-01T14:00:00Z'));
    });

    it('should parse local time', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test
SUMMARY:Local Time Event
DTSTART:20250201T140000
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);

      expect(result.events[0].startDate).toEqual(new Date('2025-02-01T14:00:00'));
    });

    it('should parse date-only values', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test
SUMMARY:All Day Event
DTSTART:20250201
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);

      expect(result.events[0].startDate).toEqual(new Date('2025-02-01'));
    });

    it('should handle timezone information in dates', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test
SUMMARY:Timezone Event
DTSTART;TZID=America/New_York:20250201T140000
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);

      // Should parse the time part, ignoring the timezone for now
      expect(result.events[0].startDate).toEqual(new Date('2025-02-01T14:00:00'));
    });
  });

  describe('eventsToGameData', () => {
    it('should convert simple event to game data', () => {
      const events: ParsedEvent[] = [{
        uid: 'test-123',
        summary: 'Team A vs Team B',
        startDate: new Date('2025-02-01T14:30:00Z'),
        endDate: new Date('2025-02-01T16:30:00Z'),
        location: 'Soccer Field 1'
      }];

      const result = ICSParser.eventsToGameData(events);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        gameDate: '2025-02-01',
        gameTime: '14:30',
        homeTeamName: 'Team A',
        awayTeamName: 'Team B',
        locationName: 'Soccer Field 1',
        externalId: 'test-123'
      });
    });

    it('should parse team names from different summary formats', () => {
      const events: ParsedEvent[] = [
        {
          uid: '1',
          summary: 'Team A vs. Team B',
          startDate: new Date('2025-02-01T14:30:00Z'),
          endDate: new Date('2025-02-01T16:30:00Z')
        },
        {
          uid: '2',
          summary: 'Team C v Team D',
          startDate: new Date('2025-02-01T14:30:00Z'),
          endDate: new Date('2025-02-01T16:30:00Z')
        }
      ];

      const result = ICSParser.eventsToGameData(events);

      expect(result[0].homeTeamName).toBe('Team A');
      expect(result[0].awayTeamName).toBe('Team B');
      expect(result[1].homeTeamName).toBe('Team C');
      expect(result[1].awayTeamName).toBe('Team D');
    });

    it('should handle events without team names in summary', () => {
      const events: ParsedEvent[] = [{
        uid: 'no-teams',
        summary: 'Training Session',
        startDate: new Date('2025-02-01T14:30:00Z'),
        endDate: new Date('2025-02-01T16:30:00Z')
      }];

      const result = ICSParser.eventsToGameData(events);

      expect(result[0].notes).toBe('Training Session');
      expect(result[0].homeTeamName).toBeUndefined();
      expect(result[0].awayTeamName).toBeUndefined();
    });

    it('should parse location into name and address', () => {
      const events: ParsedEvent[] = [{
        uid: 'location-test',
        summary: 'Team A vs Team B',
        startDate: new Date('2025-02-01T14:30:00Z'),
        endDate: new Date('2025-02-01T16:30:00Z'),
        location: 'Memorial Stadium, 123 Main St, Anytown, ST 12345'
      }];

      const result = ICSParser.eventsToGameData(events);

      expect(result[0].locationName).toBe('Memorial Stadium');
      expect(result[0].locationAddress).toBe('123 Main St, Anytown, ST 12345');
    });

    it('should extract level and game type from categories', () => {
      const events: ParsedEvent[] = [{
        uid: 'categories-test',
        summary: 'Team A vs Team B',
        startDate: new Date('2025-02-01T14:30:00Z'),
        endDate: new Date('2025-02-01T16:30:00Z'),
        categories: ['U16', 'Tournament', 'Elite']
      }];

      const result = ICSParser.eventsToGameData(events);

      expect(result[0].level).toBe('U16');
      expect(result[0].gameType).toBe('Tournament');
    });

    it('should extract metadata from event description', () => {
      const events: ParsedEvent[] = [{
        uid: 'description-test',
        summary: 'Team A vs Team B',
        startDate: new Date('2025-02-01T14:30:00Z'),
        endDate: new Date('2025-02-01T16:30:00Z'),
        description: 'Level: U14\\nGame Type: League\\nHome Team: Eagles\\nAway Team: Hawks'
      }];

      const result = ICSParser.eventsToGameData(events);

      expect(result[0].level).toBe('U14');
      expect(result[0].gameType).toBe('League');
      expect(result[0].homeTeamName).toBe('Eagles');
      expect(result[0].awayTeamName).toBe('Hawks');
    });

    it('should handle description with actual line breaks', () => {
      const events: ParsedEvent[] = [{
        uid: 'newlines-test',
        summary: 'Team A vs Team B',
        startDate: new Date('2025-02-01T14:30:00Z'),
        endDate: new Date('2025-02-01T16:30:00Z'),
        description: 'Level: U12\nType: Regular Season\nHome: Lions\nAway: Tigers'
      }];

      const result = ICSParser.eventsToGameData(events);

      expect(result[0].level).toBe('U12');
      expect(result[0].gameType).toBe('Regular Season');
      expect(result[0].homeTeamName).toBe('Lions');
      expect(result[0].awayTeamName).toBe('Tigers');
    });

    it('should generate UUID for events without UID', () => {
      const events: ParsedEvent[] = [{
        summary: 'Team A vs Team B',
        startDate: new Date('2025-02-01T14:30:00Z'),
        endDate: new Date('2025-02-01T16:30:00Z')
      }];

      const result = ICSParser.eventsToGameData(events);

      expect(result[0].externalId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should handle events with all metadata fields', () => {
      const events: ParsedEvent[] = [{
        uid: 'complete-event',
        summary: 'Eagles vs Hawks',
        startDate: new Date('2025-02-01T19:30:00Z'),
        endDate: new Date('2025-02-01T21:30:00Z'),
        location: 'Central Park Field, 123 Park Ave, New York, NY',
        categories: ['U18', 'Championship'],
        description: 'Level: Varsity\\nGame Type: Playoff\\nSpecial evening game'
      }];

      const result = ICSParser.eventsToGameData(events);

      expect(result[0]).toEqual({
        gameDate: '2025-02-01',
        gameTime: '19:30',
        homeTeamName: 'Eagles',
        awayTeamName: 'Hawks',
        locationName: 'Central Park Field',
        locationAddress: '123 Park Ave, New York, NY',
        level: 'U18', // From categories, takes precedence
        gameType: 'Championship', // From categories, takes precedence
        notes: 'Level: Varsity\\nGame Type: Playoff\\nSpecial evening game',
        externalId: 'complete-event'
      });
    });
  });

  describe('isValidICS', () => {
    it('should validate valid ICS content', () => {
      const validICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test
SUMMARY:Test Event
DTSTART:20250201T140000Z
END:VEVENT
END:VCALENDAR`;

      expect(ICSParser.isValidICS(validICS)).toBe(true);
    });

    it('should reject content missing required headers', () => {
      const invalidICS1 = `VERSION:2.0
BEGIN:VEVENT
UID:test
SUMMARY:Test Event
DTSTART:20250201T140000Z
END:VEVENT
END:VCALENDAR`;

      const invalidICS2 = `BEGIN:VCALENDAR
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test
SUMMARY:Test Event
DTSTART:20250201T140000Z
END:VEVENT
END:VCALENDAR`;

      const invalidICS3 = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test
SUMMARY:Test Event
DTSTART:20250201T140000Z
END:VEVENT`;

      expect(ICSParser.isValidICS(invalidICS1)).toBe(false);
      expect(ICSParser.isValidICS(invalidICS2)).toBe(false);
      expect(ICSParser.isValidICS(invalidICS3)).toBe(false);
    });

    it('should handle empty or malformed content', () => {
      expect(ICSParser.isValidICS('')).toBe(false);
      expect(ICSParser.isValidICS('not ics content')).toBe(false);
      expect(ICSParser.isValidICS('BEGIN:VCALENDAR\nEND:VCALENDAR')).toBe(false); // Missing VERSION
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty ICS content', () => {
      const result = parser.parse('');

      expect(result.version).toBe('2.0');
      expect(result.events).toHaveLength(0);
    });

    it('should handle malformed event blocks', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:good-event
SUMMARY:Good Event
DTSTART:20250201T140000Z
END:VEVENT
BEGIN:VEVENT
UID:bad-event
SUMMARY:Bad Event
// Missing DTSTART and END:VEVENT
BEGIN:VEVENT
UID:another-good
SUMMARY:Another Good Event
DTSTART:20250202T140000Z
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);

      // Should only parse the good events
      expect(result.events).toHaveLength(2);
      expect(result.events[0].summary).toBe('Good Event');
      expect(result.events[1].summary).toBe('Another Good Event');
    });

    it('should handle invalid date formats gracefully', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:invalid-date
SUMMARY:Event with invalid date
DTSTART:invalid-date-format
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);

      // Should skip events with invalid dates
      expect(result.events).toHaveLength(0);
    });

    it('should handle very large ICS files', () => {
      // Create ICS with many events
      let largeICS = 'BEGIN:VCALENDAR\nVERSION:2.0\n';

      for (let i = 0; i < 1000; i++) {
        largeICS += `BEGIN:VEVENT\n`;
        largeICS += `UID:event-${i}\n`;
        largeICS += `SUMMARY:Game ${i}\n`;
        largeICS += `DTSTART:20250201T140000Z\n`;
        largeICS += `END:VEVENT\n`;
      }

      largeICS += 'END:VCALENDAR';

      const startTime = Date.now();
      const result = parser.parse(largeICS);
      const endTime = Date.now();

      expect(result.events).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle events with special characters in all fields', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:special-chars-àáâãäåæçèéêë
SUMMARY:Spëcîál Chäracters vs Ñoñ-ÂSCÎÎ
DESCRIPTION:Déscription with émojis 🏆⚽ and spëcîál chärs!
LOCATION:Stâdium Ñàme, 123 Spëcîál St
DTSTART:20250201T140000Z
CATEGORIES:Ü18,Tøurnament
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].summary).toBe('Spëcîál Chäracters vs Ñoñ-ÂSCÎÎ');
      expect(result.events[0].description).toContain('émojis 🏆⚽');
      expect(result.events[0].location).toBe('Stâdium Ñàme, 123 Spëcîál St');
    });

    it('should handle extremely long field values', () => {
      const longSummary = 'A'.repeat(10000);
      const longDescription = 'B'.repeat(50000);

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:long-fields
SUMMARY:${longSummary}
DESCRIPTION:${longDescription}
DTSTART:20250201T140000Z
END:VEVENT
END:VCALENDAR`;

      const result = parser.parse(icsContent);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].summary).toBe(longSummary);
      expect(result.events[0].description).toBe(longDescription);
    });
  });

  describe('Performance Tests', () => {
    it('should efficiently convert large numbers of events to game data', () => {
      const events: ParsedEvent[] = [];

      // Create 5000 events
      for (let i = 0; i < 5000; i++) {
        events.push({
          uid: `event-${i}`,
          summary: `Team ${i} vs Team ${i + 1}`,
          startDate: new Date(`2025-02-${(i % 28) + 1}T14:00:00Z`),
          endDate: new Date(`2025-02-${(i % 28) + 1}T16:00:00Z`),
          location: `Field ${i % 10}`
        });
      }

      const startTime = Date.now();
      const result = ICSParser.eventsToGameData(events);
      const endTime = Date.now();

      expect(result).toHaveLength(5000);
      expect(endTime - startTime).toBeLessThan(500); // Should complete in under 500ms
    });
  });
});