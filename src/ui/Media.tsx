import React, { useState } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { YStack } from 'tamagui';
import { initials, tintFor } from './format';
import { UIText } from './Text';
import { radius as radii } from './tokens';

export type StoreLogoProps = { uri: string | null | undefined; name: string; size?: number; radius?: number; border?: boolean };

/**
 * A store or network logo. Without a logo, or if it fails to load, it shows the
 * name's initials on a tint derived from the name, never a broken image.
 */
export function StoreLogo({ uri, name, size = 40, radius = radii.tile, border = false }: StoreLogoProps) {
    const [failed, setFailed] = useState(false);
    const showImage = !!uri && !failed;

    return (
        <YStack
            width={size}
            height={size}
            borderRadius={radius}
            overflow='hidden'
            alignItems='center'
            justifyContent='center'
            borderWidth={border ? 3 : 0}
            borderColor='$background'
            style={{ backgroundColor: showImage ? '#ffffff' : tintFor(name) }}
            accessibilityElementsHidden
            importantForAccessibility='no-hide-descendants'
        >
            {showImage ? (
                <Image source={{ uri: uri! }} style={{ width: '100%', height: '100%' }} resizeMode='cover' onError={() => setFailed(true)} />
            ) : (
                <UIText variant='bodyStrong' style={{ color: '#1b2230', fontSize: Math.max(10, Math.round(size * 0.32)), lineHeight: Math.round(size * 0.4) }}>
                    {initials(name)}
                </UIText>
            )}
        </YStack>
    );
}

export type MediaImageProps = {
    uri: string | null | undefined;
    /** Used to pick a stable fallback tint. */
    seed: string;
    height?: number;
    width?: number | string;
    radius?: number;
    dimmed?: boolean;
    style?: StyleProp<ImageStyle>;
    children?: React.ReactNode;
};

/**
 * A photo (backdrop, product image) with a soft patterned tint when it is missing or
 * fails to load. Children are layered on top, for badges.
 */
export function MediaImage({ uri, seed, height = 132, width = '100%', radius = radii.card, dimmed = false, style, children }: MediaImageProps) {
    const [failed, setFailed] = useState(false);
    const tint = tintFor(seed);

    return (
        <YStack width={width as any} height={height} borderRadius={radius} overflow='hidden' style={{ backgroundColor: tint, opacity: dimmed ? 0.55 : 1 }}>
            {uri && !failed ? (
                <Image source={{ uri }} style={[{ width: '100%', height: '100%' }, style]} resizeMode='cover' onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
            ) : (
                <Pattern />
            )}
            {children}
        </YStack>
    );
}

/** Diagonal stripes drawn with plain views, so the fallback needs no image asset. */
function Pattern() {
    return (
        <YStack position='absolute' top={0} left={0} right={0} bottom={0} overflow='hidden' accessibilityElementsHidden>
            {Array.from({ length: 14 }).map((_, index) => (
                <YStack
                    key={index}
                    position='absolute'
                    top={-60}
                    left={index * 34 - 60}
                    width={14}
                    height={400}
                    style={{ backgroundColor: 'rgba(255,255,255,0.22)', transform: [{ rotate: '35deg' }] }}
                />
            ))}
        </YStack>
    );
}
