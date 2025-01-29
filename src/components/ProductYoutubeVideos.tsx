import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, FlatList, Linking, Dimensions } from 'react-native';
import { Text, YStack, useTheme } from 'tamagui';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import FastImage from 'react-native-fast-image';
import useStorage from '../hooks/use-storage';

/**
 * Helper function to extract the YouTube video ID from various
 * possible URL formats (e.g., https://www.youtube.com/watch?v=VIDEO_ID
 * or https://youtu.be/VIDEO_ID, etc.)
 */
const getYoutubeVideoId = (url) => {
    let videoId = '';

    // Match the standard YouTube watch URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)
    const match = url.match(/[?&]v=([^&]+)/);
    if (match && match[1]) {
        videoId = match[1];
    }

    // Match the short YouTube URL (e.g., https://youtu.be/VIDEO_ID)
    const shortLinkMatch = url.match(/youtu\.be\/([^?]+)/);
    if (shortLinkMatch && shortLinkMatch[1]) {
        videoId = shortLinkMatch[1];
    }

    // Match YouTube Shorts URL (e.g., https://www.youtube.com/shorts/VIDEO_ID)
    const shortsMatch = url.match(/youtube\.com\/shorts\/([^?]+)/);
    if (shortsMatch && shortsMatch[1]) {
        videoId = shortsMatch[1];
    }

    return videoId;
};

/**
 * Attempts to open the YouTube video in the YouTube app,
 * falling back to a browser URL if not supported.
 */
const openYoutubeVideo = async (videoId) => {
    const youtubeAppUrl = `vnd.youtube://${videoId}`;
    const youtubeWebUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        const supported = await Linking.canOpenURL(youtubeAppUrl);
        if (supported) {
            await Linking.openURL(youtubeAppUrl);
        } else {
            await Linking.openURL(youtubeWebUrl);
        }
    } catch (error) {
        console.warn('Error opening YouTube link:', error);
        // As a fallback, just open the web URL:
        Linking.openURL(youtubeWebUrl);
    }
};

const fetchYoutubeVideoTitle = async (videoId, fallback = null) => {
    try {
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        const data = await response.json();
        return data.title || fallback;
    } catch (error) {
        console.warn('Error fetching video title:', error);
        return fallback;
    }
};

const ProductYoutubeVideos = ({ product }) => {
    const theme = useTheme();
    const urls = product.getAttribute('youtube_urls', []);
    const screenWidth = Dimensions.get('window').width;
    const videoContainerWidth = screenWidth / 2;
    const [videoTitles, setVideoTitles] = useStorage(`${product.id}_youtube_titles`, {});

    useEffect(() => {
        const loadTitles = async () => {
            const titles = {};
            for (const url of urls) {
                const videoId = getYoutubeVideoId(url);
                if (videoId) {
                    titles[videoId] = await fetchYoutubeVideoTitle(videoId);
                }
            }
            setVideoTitles(titles);
        };

        loadTitles();
    }, [urls]);

    /**
     * Renders each item in the grid.
     */
    const renderItem = ({ item: url, index }) => {
        const videoId = getYoutubeVideoId(url);
        if (!videoId) return null; // Invalid URL or no ID found

        // YouTube thumbnail URL format
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        const videoTitle = videoTitles[videoId];

        return (
            <Pressable style={{ width: videoContainerWidth }} onPress={() => openYoutubeVideo(videoId)}>
                <YStack px='$2' py='$2' justifyContent='center' alignItems='center'>
                    <YStack position='relative'>
                        <FastImage source={{ uri: thumbnailUrl }} style={styles.thumbnail} resizeMode='cover' />
                        <YStack alignItems='center' justifyContent='center' position='absolute' top={0} left={0} right={0} bottom={0} backgroundColor='rgba(0, 0, 0, 0.3)'>
                            <FontAwesomeIcon icon={faPlay} color={theme['$textPrimary'].val} size={40} />
                        </YStack>
                    </YStack>
                    <Text color='$textPrimary' style={styles.title}>
                        {videoTitle ? videoTitle : `Video #{${index + 1}}`}
                    </Text>
                </YStack>
            </Pressable>
        );
    };

    return (
        <FlatList
            data={urls}
            keyExtractor={(item, index) => index}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContainer}
            nestedScrollEnabled={true}
            scrollEnabled={false}
        />
    );
};

export default ProductYoutubeVideos;

const styles = StyleSheet.create({
    listContainer: {
        padding: 8,
    },
    row: {
        justifyContent: 'space-between',
    },
    thumbnail: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: 9,
        backgroundColor: '#ccc',
    },
    title: {
        marginTop: 8,
        fontSize: 14,
        textAlign: 'center',
    },
});
