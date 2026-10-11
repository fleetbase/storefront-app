import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCalendarDay } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../contexts/LanguageContext';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Date#getDay() counts from Sunday.
const daysFromSunday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * The location's opening hours by weekday. Grouped here rather than with the SDK's
 * `schedule` getter, which crashes unless days are written exactly "Monday".."Sunday";
 * the API can return them in any case ("monday").
 */
export function scheduleByDay(storeLocation: any): Record<string, any[]> {
    const hours: any[] = storeLocation?.getAttribute?.('hours') ? Array.from(storeLocation.hours ?? []) : [];
    const dayOf = (hour: any) => String(hour?.getAttribute?.('day') ?? hour?.day ?? '').toLowerCase();
    return Object.fromEntries(weekdays.map((weekday) => [weekday, hours.filter((hour) => dayOf(hour) === weekday.toLowerCase())]));
}

const StoreLocationSchedule = ({ storeLocation, showToday = false }) => {
    const theme = useTheme();
    const { t } = useLanguage();
    const schedule = scheduleByDay(storeLocation);
    const allHours = Object.values(schedule).flat();
    // No hours at all isn't "open 24 hours".
    const isAlwaysOpen = allHours.length > 0 && allHours.every((hour: any) => hour?.is24Hours);
    const today = daysFromSunday[new Date().getDay()];
    const todayHours = schedule[today] ?? [];

    if (isAlwaysOpen) {
        return (
            <YStack>
                <Text padding='$2' fontSize={12} fontWeight='bold' color='$green-600'>
                    {t('StoreLocationSchedule.open24')}
                </Text>
            </YStack>
        );
    }

    const renderToday = showToday === true && todayHours.length > 0;
    if (!isAlwaysOpen) {
        return (
            <YStack flexWrap='wrap'>
                {renderToday && (
                    <YStack>
                        <XStack gap='$2' mb='$2' alignItems='center'>
                            <Text fontSize={12} fontWeight='bold' color='$textPrimary'>
                                {t('StoreLocationSchedule.today')}
                            </Text>
                        </XStack>
                        {todayHours[0] ? (
                            <Text fontSize={11} color='$textPrimary'>
                                {todayHours[0].humanReadableHours}
                            </Text>
                        ) : (
                            <Text fontSize={11} color='$textPrimary'>
                                {t('StoreLocationSchedule.closed')}
                            </Text>
                        )}
                    </YStack>
                )}

                <XStack flexWrap='wrap' gap='$1' mt={renderToday ? '$4' : 0}>
                    {weekdays.map((weekday) => {
                        const daySchedule = schedule[weekday];
                        return (
                            <YStack key={weekday} width='30%' borderWidth={1} padding='$2' borderRadius='$4' borderColor={weekday === today ? '$blue-600' : 'transparent'}>
                                <Text fontSize={12} fontWeight='bold' color='$textPrimary' mb='$2'>
                                    {t(`StoreLocationSchedule.${weekday}`)}
                                </Text>
                                {daySchedule.length > 0 ? (
                                    daySchedule.map((hour, index) => (
                                        <YStack key={hour.id || index} marginBottom='$1'>
                                            <Text fontSize={11} color='$textPrimary'>
                                                {hour.humanReadableHours}
                                            </Text>
                                        </YStack>
                                    ))
                                ) : (
                                    <Text fontSize={11} color='$textPrimary'>
                                        {t('StoreLocationSchedule.closed')}
                                    </Text>
                                )}
                            </YStack>
                        );
                    })}
                </XStack>
            </YStack>
        );
    }

    return null;
};

export default StoreLocationSchedule;
