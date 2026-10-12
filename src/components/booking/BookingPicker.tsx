import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCalendarXmark } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../../contexts/LanguageContext';
import { bookingDays, nextOpenDay, parseScheduledAt, startTimes, type BookingHour, type StartTime } from '../../commerce/booking';
import { Button, UIText, formatClock, formatDuration, radius, space, usesTwelveHourClock } from '../../ui';

const PERIODS: StartTime['period'][] = ['morning', 'afternoon', 'evening'];

function dayDate(key: string): Date {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Date rail and start-time grid for a bookable service. Days without booking hours are
 * shown but marked closed; picking one explains it and offers the next open day.
 */
export default function BookingPicker({
    hours,
    duration,
    value,
    onChange,
    providerName,
}: {
    hours: BookingHour[];
    duration: number | null;
    value: string | null;
    onChange: (scheduledAt: string | null) => void;
    providerName: string;
}) {
    const theme = useTheme();
    const { t, locale } = useLanguage();
    const hour12 = usesTwelveHourClock(locale);
    const now = useMemo(() => new Date(), []);
    const days = useMemo(() => bookingDays(hours, now, 14), [hours, now]);
    const chosen = parseScheduledAt(value);
    // Start on the chosen day, else the first day that still has a time to book.
    const [selectedDate, setSelectedDate] = useState<string>(
        () => chosen?.date ?? days.find((entry) => entry.open && startTimes(entry.date, hours, { now, duration }).some((time) => !time.past))?.date ?? days[0].date
    );
    const day = days.find((entry) => entry.date === selectedDate) ?? days[0];
    const times = useMemo(() => (day.open ? startTimes(day.date, hours, { now, duration }) : []), [day, duration, hours, now]);
    const available = times.filter((time) => !time.past);
    const next = nextOpenDay(days, day.date);
    const weekday = (key: string, style: 'short' | 'long') => dayDate(key).toLocaleDateString(locale, { weekday: style });
    const month = dayDate(selectedDate).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const timeLabel = (time: StartTime) => (time.endMinutes ? `${formatClock(time.minutes, hour12)} – ${formatClock(time.endMinutes, hour12)}` : formatClock(time.minutes, hour12));

    const pickDay = (key: string) => {
        setSelectedDate(key);
        if (chosen?.date !== key) onChange(null);
    };

    return (
        <YStack gap={22}>
            <YStack gap={10}>
                <XStack paddingHorizontal={space.gutter} justifyContent='space-between' alignItems='baseline'>
                    <UIText variant='subheading' style={{ fontSize: 17 }} accessibilityRole='header'>
                        {t('Booking.chooseDate')}
                    </UIText>
                    <UIText variant='caption' tone='secondary'>
                        {month}
                    </UIText>
                </XStack>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 8 }}
                    accessibilityRole='radiogroup'
                    accessibilityLabel={t('Booking.date')}
                >
                    {days.map((entry, index) => {
                        const selected = entry.date === selectedDate;
                        const label = `${weekday(entry.date, 'long')} ${dayDate(entry.date).getDate()}${entry.open ? '' : `, ${t('Booking.noBookings')}`}`;
                        return (
                            <Pressable
                                key={entry.date}
                                onPress={() => pickDay(entry.date)}
                                accessibilityRole='radio'
                                accessibilityState={{ checked: selected }}
                                accessibilityLabel={label}
                                style={{
                                    width: 58,
                                    height: 76,
                                    borderRadius: radius.button,
                                    borderWidth: 1,
                                    borderColor: selected ? theme.primary.val : theme.borderColor.val,
                                    backgroundColor: selected ? theme.primary.val : theme.background.val,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 2,
                                    opacity: !entry.open && !selected ? 0.55 : 1,
                                }}
                            >
                                <UIText variant='captionStrong' tone={selected ? 'onPrimary' : entry.open ? 'primary' : 'secondary'} style={{ fontSize: 12 }}>
                                    {index === 0 ? t('Booking.today') : weekday(entry.date, 'short')}
                                </UIText>
                                <UIText variant='heading' tone={selected ? 'onPrimary' : entry.open ? 'primary' : 'secondary'}>
                                    {dayDate(entry.date).getDate()}
                                </UIText>
                                {!entry.open && (
                                    <UIText variant='caption' tone={selected ? 'onPrimary' : 'secondary'} style={{ fontSize: 10, lineHeight: 12 }}>
                                        {t('Booking.closed')}
                                    </UIText>
                                )}
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </YStack>

            <YStack gap={10} paddingHorizontal={space.gutter}>
                <XStack justifyContent='space-between' alignItems='baseline'>
                    <UIText variant='subheading' style={{ fontSize: 17 }} accessibilityRole='header'>
                        {t('Booking.chooseTime')}
                    </UIText>
                    {!!duration && (
                        <UIText variant='caption' tone='secondary'>
                            {t('Booking.visitLength', { duration: formatDuration(duration) })}
                        </UIText>
                    )}
                </XStack>
                {available.length > 0 ? (
                    <>
                        {PERIODS.map((period) => {
                            const slots = times.filter((time) => time.period === period);
                            if (slots.length === 0) return null;
                            return (
                                <YStack key={period} gap={8}>
                                    <UIText variant='label' tone='secondary'>
                                        {t(`Booking.${period}`)}
                                    </UIText>
                                    <XStack flexWrap='wrap' gap={8} accessibilityRole='radiogroup' accessibilityLabel={t(`Booking.${period}`)}>
                                        {slots.map((time) => {
                                            const selected = chosen?.date === day.date && chosen.minutes === time.minutes;
                                            return (
                                                <Pressable
                                                    key={time.at}
                                                    disabled={time.past}
                                                    onPress={() => onChange(time.at)}
                                                    accessibilityRole='radio'
                                                    accessibilityState={{ checked: selected, disabled: time.past }}
                                                    accessibilityLabel={`${timeLabel(time)}${time.past ? `, ${t('Booking.unavailable')}` : ''}`}
                                                    style={{
                                                        width: '31.5%',
                                                        height: 44,
                                                        borderRadius: radius.button,
                                                        borderWidth: 1,
                                                        borderColor: selected ? theme.primary.val : time.past ? 'transparent' : theme.borderColor.val,
                                                        backgroundColor: selected ? theme.primary.val : time.past ? theme.surface.val : theme.background.val,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <UIText
                                                        variant='captionStrong'
                                                        tone={selected ? 'onPrimary' : time.past ? 'placeholder' : 'primary'}
                                                        style={{ fontSize: 14, textDecorationLine: time.past ? 'line-through' : 'none' }}
                                                    >
                                                        {formatClock(time.minutes, hour12)}
                                                    </UIText>
                                                </Pressable>
                                            );
                                        })}
                                    </XStack>
                                </YStack>
                            );
                        })}
                        <UIText variant='caption' tone='secondary'>
                            {t('Booking.timesNote', { store: providerName })}
                        </UIText>
                    </>
                ) : (
                    <YStack alignItems='center' gap={8} padding={20} borderRadius={radius.card} backgroundColor='$surface' accessibilityRole='summary'>
                        <FontAwesomeIcon icon={faCalendarXmark} size={26} color={theme.textSecondary.val} />
                        <UIText variant='bodyStrong' textAlign='center'>
                            {day.open ? t('Booking.fullyPast', { day: weekday(day.date, 'long') }) : t('Booking.noBookingsOn', { day: weekday(day.date, 'long') })}
                        </UIText>
                        {!day.open && (
                            <UIText variant='caption' tone='secondary' textAlign='center'>
                                {t('Booking.noBookingsBody', { store: providerName })}
                            </UIText>
                        )}
                        {next && (
                            <Button variant='inverse' size='sm' onPress={() => pickDay(next.date)}>
                                {t('Booking.seeDay', { day: `${weekday(next.date, 'short')} ${dayDate(next.date).getDate()}` })}
                            </Button>
                        )}
                    </YStack>
                )}
            </YStack>
        </YStack>
    );
}
