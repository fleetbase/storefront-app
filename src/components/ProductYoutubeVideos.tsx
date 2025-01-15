import React from 'react';
import { View, Pressable, StyleSheet, FlatList, Linking } from 'react-native';
import { Text } from 'tamagui';
import FastImage from 'react-native-fast-image';

/**
 * Helper function to extract the YouTube video ID from various
 * possible URL formats (e.g., https://www.youtube.com/watch?v=VIDEO_ID
 * or https://youtu.be/VIDEO_ID, etc.)
 */
const getYoutubeVideoId = (url) => {
    let videoId = '';

    // Match the standard watch URL
    const match = url.match(/[?&]v=([^&]+)/);
    if (match && match[1]) {
        videoId = match[1];
    }

    // Match the short youtu.be URL
    const shortLinkMatch = url.match(/youtu\.be\/([^?]+)/);
    if (shortLinkMatch && shortLinkMatch[1]) {
        videoId = shortLinkMatch[1];
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

const ProductYoutubeVideos = ({ product }) => {
    const urls = product.getAttribute('youtube_urls', []) ?? [];

    /**
     * Renders each item in the grid.
     */
    const renderItem = ({ item: url, index }) => {
        const videoId = getYoutubeVideoId(url);
        if (!videoId) return null; // Invalid URL or no ID found

        // YouTube thumbnail URL format
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        return (
            <Pressable style={styles.videoContainer} onPress={() => openYoutubeVideo(videoId)}>
                <FastImage source={{ uri: thumbnailUrl }} style={styles.thumbnail} resizeMode='cover' />
                <Text color='$textPrimary' style={styles.title}>
                    Video #{index + 1}
                </Text>
            </Pressable>
        );
    };

    return <FlatList data={urls} keyExtractor={(item, index) => index} renderItem={renderItem} numColumns={2} columnWrapperStyle={styles.row} contentContainerStyle={styles.listContainer} />;
};

export default ProductYoutubeVideos;

const styles = StyleSheet.create({
    listContainer: {
        padding: 8,
    },
    row: {
        justifyContent: 'space-between',
    },
    videoContainer: {
        flex: 1,
        margin: 8,
        alignItems: 'center',
    },
    thumbnail: {
        width: '100%',
        aspectRatio: 16 / 9, // keeps 16:9 ratio
        borderRadius: 6,
        backgroundColor: '#ccc',
    },
    title: {
        marginTop: 8,
        fontSize: 14,
        textAlign: 'center',
    },
});
