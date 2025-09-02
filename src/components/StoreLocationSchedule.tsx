import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCalendarDay } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../contexts/LanguageContext';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const StoreLocationSchedule = ({ storeLocation, showToday = false }) => {
    const theme = useTheme();
    const { t } = useLanguage();
    const isAlwaysOpen = storeLocation.isAlwaysOpen;
    const today = weekdays[new Date().getDay()];
    const localeToday = t(`StoreLocationSchedule.${today}`);

    if (isAlwaysOpen) {
        return (
            <YStack>
                <Text padding='$2' fontSize={12} fontWeight='bold' color='$green-600'>
                    {t('StoreLocationSchedule.open24')}
                </Text>
            </YStack>
        );
    }

    const renderToday = showToday === true && storeLocation.today.length > 0;
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
                        {storeLocation.today[0] ? (
                            <Text fontSize={11} color='$textPrimary'>
                                {storeLocation.today[0].humanReadableHours}
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
                        const daySchedule = storeLocation?.schedule?.[weekday] || [];
                        return (
                            <YStack key={weekday} width='30%' borderWidth={1} padding='$2' borderRadius='$4' borderColor={weekday === localeToday ? '$blue-600' : 'transparent'}>
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
