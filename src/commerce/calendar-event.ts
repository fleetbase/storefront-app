/** A calendar event for a booking, and the parts every platform builds it from. */

export type CalendarEvent = {
    title: string;
    start: Date;
    /** Defaults to an hour after the start. */
    end?: Date | null;
    location?: string | null;
    notes?: string | null;
};

export type CalendarResult = 'saved' | 'canceled' | 'opened' | 'unavailable';

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

export function eventEnd(event: CalendarEvent): Date {
    return event.end && event.end.getTime() > event.start.getTime() ? event.end : new Date(event.start.getTime() + DEFAULT_DURATION_MS);
}

/** "20261010T060000Z" */
export function compactUtc(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** A Google Calendar "new event" link, prefilled. */
export function googleCalendarUrl(event: CalendarEvent): string {
    const params = [
        ['action', 'TEMPLATE'],
        ['text', event.title],
        ['dates', `${compactUtc(event.start)}/${compactUtc(eventEnd(event))}`],
        ['location', event.location ?? ''],
        ['details', event.notes ?? ''],
    ]
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
    return `https://calendar.google.com/calendar/render?${params}`;
}
