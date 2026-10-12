import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowRight, faCircleInfo, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { XStack, YStack, useTheme } from 'tamagui';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorefrontRuntime } from '../contexts/StorefrontRuntimeContext';
import { registerStoreSwitchHost, type StoreSwitchRequest } from '../network/store-switch';
import { storeName } from '../network/store-names';
import { Button, Sheet, StoreLogo, UIText, radius } from '../ui';

type Pending = { request: StoreSwitchRequest; resolve: (accepted: boolean) => void };

/**
 * Presents store-switch and currency requests from the cart as a sheet. Mounted once,
 * near the root, so the cart context can ask from anywhere.
 */
export default function StoreSwitchHost() {
    const [pending, setPending] = useState<Pending | null>(null);
    const { t } = useLanguage();
    const theme = useTheme();
    const { ownerInfo } = useStorefrontRuntime();

    useEffect(
        () =>
            registerStoreSwitchHost((next) => {
                setPending((current) => {
                    // Only one decision at a time: decline any request still open.
                    current?.resolve(false);
                    return next;
                });
            }),
        []
    );

    const answer = (accepted: boolean) => {
        pending?.resolve(accepted);
        setPending(null);
    };

    const request = pending?.request;
    const from = request?.kind === 'replace' ? storeName(request.fromStoreId) : null;
    const to = request ? storeName(request.toStoreId) : null;
    const fromName = from?.name ?? t('StoreSwitch.yourCurrentStore');
    const toName = to?.name ?? t('StoreSwitch.thisStore');

    return (
        <Sheet open={!!pending} onClose={() => answer(false)} dismissible>
            {request?.kind === 'replace' && (
                <YStack gap={16} paddingTop={6}>
                    <XStack alignItems='center' gap={10} accessibilityElementsHidden>
                        <YStack opacity={0.55}>
                            <StoreLogo uri={from?.logoUrl} name={fromName} size={48} />
                        </YStack>
                        <FontAwesomeIcon icon={faArrowRight} size={18} color={theme.textSecondary.val} />
                        <StoreLogo uri={to?.logoUrl} name={toName} size={48} />
                    </XStack>
                    <YStack gap={8}>
                        <UIText variant='title' accessibilityRole='header' style={{ fontSize: 21, lineHeight: 27 }}>
                            {t('StoreSwitch.title', { store: toName })}
                        </UIText>
                        <UIText tone='secondary'>
                            {request.total
                                ? t('StoreSwitch.willClearWithTotal', { store: fromName, count: request.itemCount, items: t('UI.itemsCount', { count: request.itemCount }), total: request.total })
                                : t('StoreSwitch.willClear', { store: fromName, count: request.itemCount, items: t('UI.itemsCount', { count: request.itemCount }) })}
                        </UIText>
                    </YStack>
                    <XStack gap={10} padding={12} borderRadius={radius.card} backgroundColor='$surface'>
                        <FontAwesomeIcon icon={faCircleInfo} size={18} color={theme.primaryForeground.val} />
                        <UIText variant='caption' tone='secondary' flex={1}>
                            {t('StoreSwitch.reason', { network: ownerInfo?.name ?? '' })}
                        </UIText>
                    </XStack>
                    <YStack gap={10}>
                        <Button size='lg' fullWidth onPress={() => answer(true)}>
                            {t('StoreSwitch.startNewCart')}
                        </Button>
                        <Button size='lg' variant='outline' fullWidth onPress={() => answer(false)}>
                            {t('StoreSwitch.keepCart')}
                        </Button>
                    </YStack>
                </YStack>
            )}
            {request?.kind === 'currency' && (
                <YStack gap={16} paddingTop={6}>
                    <YStack width={48} height={48} borderRadius={24} backgroundColor='$warningSoft' alignItems='center' justifyContent='center' accessibilityElementsHidden>
                        <FontAwesomeIcon icon={faTriangleExclamation} size={22} color={theme.warningForeground.val} />
                    </YStack>
                    <YStack gap={8}>
                        <UIText variant='title' accessibilityRole='header' style={{ fontSize: 21, lineHeight: 27 }}>
                            {t('StoreSwitch.currencyTitle')}
                        </UIText>
                        <UIText tone='secondary'>
                            {t('StoreSwitch.currencyBody', { store: toName, cartCurrency: request.cartCurrency ?? '', itemCurrency: request.itemCurrency ?? '' })}
                        </UIText>
                    </YStack>
                    <Button size='lg' fullWidth onPress={() => answer(false)}>
                        {t('StoreSwitch.ok')}
                    </Button>
                </YStack>
            )}
        </Sheet>
    );
}
