import { styled, YStack } from 'tamagui';
import { elevation, radius } from './tokens';

/** A rounded surface. `raised` adds the card shadow; `outlined` a hairline border. */
export const Card = styled(YStack, {
    name: 'UICard',
    backgroundColor: '$background',
    borderRadius: radius.card,
    overflow: 'hidden',
    variants: {
        appearance: {
            raised: { ...elevation.card },
            outlined: { borderWidth: 1, borderColor: '$borderColor' },
            flat: { backgroundColor: '$surface' },
        },
    } as const,
    defaultVariants: { appearance: 'raised' },
});
