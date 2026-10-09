import { compactUtc, eventEnd, type CalendarEvent, type CalendarResult } from './calendar-event';

export type { CalendarEvent, CalendarResult };

/** iCalendar text values escape backslashes, semicolons, commas and newlines. */
function icsText(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/;/g, '\x5c;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export function icsFor(event: CalendarEvent, uid: string): string {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Fleetbase//Storefront//EN',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${compactUtc(new Date())}`,
        `DTSTART:${compactUtc(event.start)}`,
        `DTEND:${compactUtc(eventEnd(event))}`,
        `SUMMARY:${icsText(event.title)}`,
        event.location ? `LOCATION:${icsText(event.location)}` : null,
        event.notes ? `DESCRIPTION:${icsText(event.notes)}` : null,
        'END:VEVENT',
        'END:VCALENDAR',
    ].filter(Boolean);
    return lines.join('\r\n');
}

/** On the web the event downloads as an .ics file, which the computer's calendar opens. */
export async function addToCalendar(event: CalendarEvent): Promise<CalendarResult> {
    if (typeof document === 'undefined') return 'unavailable';
    const blob = new Blob([icsFor(event, `${event.start.getTime()}-${Math.random().toString(36).slice(2)}@storefront`)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^\w\- ]+/g, '').trim() || 'booking'}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'opened';
}
