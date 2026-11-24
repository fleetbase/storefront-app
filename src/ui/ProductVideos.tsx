import React from 'react';
import { Linking, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import { YStack } from 'tamagui';
import { MediaImage } from './Media';
import { UIText } from './Text';
import type { ProductVideo } from './product-display';
import { space } from './tokens';

export type ProductVideosProps = {
    videos: ProductVideo[];
    /** Section heading, e.g. "Videos". */
    title: string;
    /** Accessibility label for the video at `index` (0-based). */
    labelFor: (index: number) => string;
    /** Opens a video; defaults to the YouTube app or the browser. */
    onOpen?: (video: ProductVideo) => void;
};

const openVideo = (video: ProductVideo) => {
    Linking.openURL(video.url).catch(() => {});
};

/**
 * A product's YouTube videos as thumbnails with a play button. One video spans the
 * screen; several scroll sideways. Tapping one plays it on YouTube.
 */
export function ProductVideos({ videos, title, labelFor, onOpen = openVideo }: ProductVideosProps) {
    const { width } = useWindowDimensions();
    if (videos.length === 0) return null;
    const full = width - space.gutter * 2;
    const cardWidth = videos.length === 1 ? full : Math.min(full, 260);
    const cardHeight = Math.round((cardWidth * 9) / 16);

    return (
        <YStack paddingTop={22} gap={10}>
            <UIText variant='subheading' style={{ fontSize: 17, paddingHorizontal: space.gutter }} accessibilityRole='header'>
                {title}
            </UIText>
            <ScrollView
                horizontal
                scrollEnabled={videos.length > 1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: space.gutter, gap: space.gap }}
            >
                {videos.map((video, index) => (
                    <Pressable key={video.id} onPress={() => onOpen(video)} accessibilityRole='link' accessibilityLabel={labelFor(index)} testID='product-video'>
                        <MediaImage uri={video.thumbnailUrl} seed={video.id} width={cardWidth} height={cardHeight}>
                            <YStack position='absolute' top={0} left={0} right={0} bottom={0} alignItems='center' justifyContent='center' style={{ backgroundColor: 'rgba(0,0,0,0.22)' }}>
                                <YStack width={52} height={52} borderRadius={26} alignItems='center' justifyContent='center' style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                                    <FontAwesomeIcon icon={faPlay} size={20} color='#ffffff' style={{ marginLeft: 3 }} />
                                </YStack>
                            </YStack>
                        </MediaImage>
                    </Pressable>
                ))}
            </ScrollView>
        </YStack>
    );
}
