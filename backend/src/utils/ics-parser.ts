/**
 * @fileoverview ICS (iCalendar) file parser utility
 * @description Parses ICS calendar files and extracts game/event information
 * for import into the sports management system
 */

import { v4 as uuidv4 } from 'uuid';

export interface ParsedEvent {
  uid?: string;
  summary: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  categories?: string[];
  status?: string;
  organizer?: string;
  attendees?: string[];
  recurrenceRule?: string;
  created?: Date;
  lastModified?: Date;
}

export interface ParsedCalendar {
  version: string;
  prodId?: string;
  calendarName?: string;
  timezone?: string;
  events: ParsedEvent[];
}

export interface GameImportData {
  gameDate: string;
  gameTime: string;
  homeTeamName?: string;
  awayTeamName?: string;
  locationName?: string;
  locationAddress?: string;
  level?: string;
  gameType?: string;
  notes?: string;
  externalId?: string;
}

export class ICSParser {
  private lines: string[];
  private currentIndex: number;

  constructor() {
    this.lines = [];
    this.currentIndex = 0;
  }

  /**
   * Parse ICS content string into structured calendar data
   * @param content ICS file content as string
   * @returns Parsed calendar object with events
   */
  parse(content: string): ParsedCalendar {
    this.lines = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter(line => line.trim());

    this.currentIndex = 0;

    const calendar: ParsedCalendar = {
      version: '2.0',
      events: []
    };

    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex];

      if (line.startsWith('VERSION:')) {
        calendar.version = this.extractValue(line);
      } else if (line.startsWith('PRODID:')) {
        calendar.prodId = this.extractValue(line);
      } else if (line.startsWith('X-WR-CALNAME:')) {
        calendar.calendarName = this.extractValue(line);
      } else if (line.startsWith('X-WR-TIMEZONE:')) {
        calendar.timezone = this.extractValue(line);
      } else if (line === 'BEGIN:VEVENT') {
        const event = this.parseEvent();
        if (event) {
          calendar.events.push(event);
        }
      }

      this.currentIndex++;
    }

    return calendar;
  }

  /**
   * Parse a single VEVENT block
   * @returns Parsed event or null if invalid
   */
  private parseEvent(): ParsedEvent | null {
    const event: Partial<ParsedEvent> = {};

    this.currentIndex++; // Move past BEGIN:VEVENT

    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex];

      if (line === 'END:VEVENT') {
        break;
      }

      // Handle line continuations (lines starting with space or tab)
      let fullLine = line;
      while (
        this.currentIndex + 1 < this.lines.length &&
        (this.lines[this.currentIndex + 1].startsWith(' ') ||
         this.lines[this.currentIndex + 1].startsWith('\t'))
      ) {
        this.currentIndex++;
        fullLine += this.lines[this.currentIndex].substring(1);
      }

      if (fullLine.startsWith('UID:')) {
        event.uid = this.extractValue(fullLine);
      } else if (fullLine.startsWith('SUMMARY:')) {
        event.summary = this.extractValue(fullLine);
      } else if (fullLine.startsWith('DESCRIPTION:')) {
        event.description = this.extractValue(fullLine)
          .replace(/\\n/g, '\n')
          .replace(/\\,/g, ',');
      } else if (fullLine.startsWith('LOCATION:')) {
        event.location = this.extractValue(fullLine);
      } else if (fullLine.startsWith('DTSTART')) {
        event.startDate = this.parseDateTime(fullLine);
      } else if (fullLine.startsWith('DTEND')) {
        event.endDate = this.parseDateTime(fullLine);
      } else if (fullLine.startsWith('CATEGORIES:')) {
        event.categories = this.extractValue(fullLine).split(',');
      } else if (fullLine.startsWith('STATUS:')) {
        event.status = this.extractValue(fullLine);
      } else if (fullLine.startsWith('ORGANIZER')) {
        event.organizer = this.extractOrganizer(fullLine);
      } else if (fullLine.startsWith('ATTENDEE')) {
        if (!event.attendees) {
          event.attendees = [];
        }
        const attendee = this.extractAttendee(fullLine);
        if (attendee) {
          event.attendees.push(attendee);
        }
      } else if (fullLine.startsWith('RRULE:')) {
        event.recurrenceRule = this.extractValue(fullLine);
      } else if (fullLine.startsWith('CREATED:')) {
        event.created = this.parseDateTime(fullLine);
      } else if (fullLine.startsWith('LAST-MODIFIED:')) {
        event.lastModified = this.parseDateTime(fullLine);
      }

      this.currentIndex++;
    }

    // Validate required fields
    if (!event.summary || !event.startDate) {
      return null;
    }

    // If no end date, set it to start date + 2 hours
    if (!event.endDate) {
      event.endDate = new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000);
    }

    return event as ParsedEvent;
  }

  /**
   * Extract value from an ICS property line
   * @param line ICS property line
   * @returns Extracted value
   */
  private extractValue(line: string): string {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return '';
    }
    return line.substring(colonIndex + 1).trim();
  }

  /**
   * Parse date/time from ICS format
   * @param line Date/time property line
   * @returns Parsed Date object
   */
  private parseDateTime(line: string): Date {
    let dateStr = this.extractValue(line);

    // Remove timezone information if present
    if (line.includes('TZID=')) {
      const colonIndex = dateStr.indexOf(':');
      if (colonIndex !== -1) {
        dateStr = dateStr.substring(colonIndex + 1);
      }
    }

    // Handle different date formats
    if (dateStr.endsWith('Z')) {
      // UTC time
      return new Date(
        dateStr.substring(0, 4) + '-' +
        dateStr.substring(4, 6) + '-' +
        dateStr.substring(6, 8) + 'T' +
        dateStr.substring(9, 11) + ':' +
        dateStr.substring(11, 13) + ':' +
        dateStr.substring(13, 15) + 'Z'
      );
    } else if (dateStr.length === 8) {
      // Date only (YYYYMMDD)
      return new Date(
        dateStr.substring(0, 4) + '-' +
        dateStr.substring(4, 6) + '-' +
        dateStr.substring(6, 8)
      );
    } else {
      // Local time (YYYYMMDDTHHMMSS)
      return new Date(
        dateStr.substring(0, 4) + '-' +
        dateStr.substring(4, 6) + '-' +
        dateStr.substring(6, 8) + 'T' +
        dateStr.substring(9, 11) + ':' +
        dateStr.substring(11, 13) + ':' +
        dateStr.substring(13, 15)
      );
    }
  }

  /**
   * Extract organizer from ORGANIZER property
   * @param line ORGANIZER property line
   * @returns Organizer email or name
   */
  private extractOrganizer(line: string): string {
    const value = this.extractValue(line);
    if (value.startsWith('mailto:')) {
      return value.substring(7);
    }
    return value;
  }

  /**
   * Extract attendee from ATTENDEE property
   * @param line ATTENDEE property line
   * @returns Attendee email or name
   */
  private extractAttendee(line: string): string | null {
    const value = this.extractValue(line);
    if (value.startsWith('mailto:')) {
      return value.substring(7);
    }
    return value || null;
  }

  /**
   * Convert parsed events to game import data
   * @param events Parsed calendar events
   * @returns Array of game import data
   */
  static eventsToGameData(events: ParsedEvent[]): GameImportData[] {
    return events.map(event => {
      const gameData: GameImportData = {
        gameDate: event.startDate.toISOString().split('T')[0],
        gameTime: event.startDate.toTimeString().split(' ')[0].substring(0, 5),
        externalId: event.uid || uuidv4()
      };

      // Try to extract team names from summary
      const summaryMatch = event.summary.match(/(.+?)\s+vs\.?\s+(.+)/i);
      if (summaryMatch) {
        gameData.homeTeamName = summaryMatch[1].trim();
        gameData.awayTeamName = summaryMatch[2].trim();
      } else {
        // Use summary as notes if we can't parse teams
        gameData.notes = event.summary;
      }

      // Extract location
      if (event.location) {
        // Try to split location into name and address
        const locationParts = event.location.split(',');
        if (locationParts.length > 1) {
          gameData.locationName = locationParts[0].trim();
          gameData.locationAddress = locationParts.slice(1).join(',').trim();
        } else {
          gameData.locationName = event.location;
        }
      }

      // Try to extract level and game type from categories or description
      if (event.categories && event.categories.length > 0) {
        // Look for common level indicators
        const levelCategories = event.categories.filter(cat =>
          /^(U\d+|Varsity|JV|Youth|Adult|Rec)/i.test(cat)
        );
        if (levelCategories.length > 0) {
          gameData.level = levelCategories[0];
        }

        // Look for game type
        const typeCategories = event.categories.filter(cat =>
          /^(League|Tournament|Playoff|Exhibition|Scrimmage)/i.test(cat)
        );
        if (typeCategories.length > 0) {
          gameData.gameType = typeCategories[0];
        }
      }

      // Parse description for additional metadata
      if (event.description) {
        // Handle both actual newlines and escaped newlines
        const descLines = event.description.split(/\\n|\n/);
        for (const line of descLines) {
          if (line.toLowerCase().includes('level:')) {
            const levelMatch = line.match(/level:\s*(.+)/i);
            if (levelMatch && !gameData.level) {
              gameData.level = levelMatch[1].trim();
            }
          }
          if (line.toLowerCase().includes('type:') || line.toLowerCase().includes('game type:')) {
            const typeMatch = line.match(/(?:game\s+)?type:\s*(.+)/i);
            if (typeMatch && !gameData.gameType) {
              gameData.gameType = typeMatch[1].trim();
            }
          }
          if (line.toLowerCase().includes('home:') || line.toLowerCase().includes('home team:')) {
            const homeMatch = line.match(/home(?:\s+team)?:\s*(.+)/i);
            if (homeMatch && !gameData.homeTeamName) {
              gameData.homeTeamName = homeMatch[1].trim();
            }
          }
          if (line.toLowerCase().includes('away:') || line.toLowerCase().includes('away team:')) {
            const awayMatch = line.match(/away(?:\s+team)?:\s*(.+)/i);
            if (awayMatch && !gameData.awayTeamName) {
              gameData.awayTeamName = awayMatch[1].trim();
            }
          }
        }

        // Add remaining description as notes if we haven't already set notes
        if (!gameData.notes && event.description) {
          gameData.notes = event.description;
        }
      }

      return gameData;
    });
  }

  /**
   * Validate ICS content format
   * @param content ICS file content
   * @returns True if valid ICS format
   */
  static isValidICS(content: string): boolean {
    const requiredHeaders = [
      'BEGIN:VCALENDAR',
      'VERSION:',
      'END:VCALENDAR'
    ];

    for (const header of requiredHeaders) {
      if (!content.includes(header)) {
        return false;
      }
    }

    return true;
  }
}

export default ICSParser;