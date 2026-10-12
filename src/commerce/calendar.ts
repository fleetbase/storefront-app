import { Linking, NativeModules, Platform } from 'react-native';
import { eventEnd, googleCalendarUrl, type CalendarEvent, type CalendarResult } from './calendar-event';

export type { CalendarEvent, CalendarResult };

/**
 * Opens the phone's own "New event" editor, prefilled, so the customer can adjust and save
 * it (no calendar access is needed to add an event this way on iOS 17+). Without the native
 * module (a build from before it was added), Android opens a prefilled Google Calendar event.
 */
export async function addToCalendar(event: CalendarEvent): Promise<CalendarResult> {
    const native = NativeModules.AddCalendarEvent;
    if (native?.presentEventCreatingDialog) {
        const result = await native.presentEventCreatingDialog({
            title: event.title,
            startDate: event.start.toISOString(),
            endDate: eventEnd(event).toISOString(),
            location: event.location ?? undefined,
            notes: event.notes ?? undefined,
        });
        return result?.action === 'SAVED' ? 'saved' : 'canceled';
    }

    if (Platform.OS === 'android') {
        await Linking.openURL(googleCalendarUrl(event));
        return 'opened';
    }

    return 'unavailable';
}
