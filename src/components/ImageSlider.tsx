import React, { useRef, useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import FastImage from 'react-native-fast-image';

const ImageSlider = ({
    images = [],
    sliderWidth,
    sliderHeight = 200,
    autoplay = true,
    autoplayInterval = 3000,
    loop = true,
    showPagination = true,
    containerStyle = {},
    sliderStyle = {},
    paginationStyle = {},
    dotStyle = {},
    activeDotStyle = {},
    onImagePress,
}) => {
    const scrollViewRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (autoplay && images.length > 1) {
            const interval = setInterval(() => {
                if (!scrollViewRef.current) return;

                const nextIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
                scrollViewRef.current.scrollTo({
                    x: nextIndex * sliderWidth,
                    animated: true,
                });
                setCurrentIndex(nextIndex);
            }, autoplayInterval);

            return () => clearInterval(interval);
        }
    }, [currentIndex, autoplay, autoplayInterval, images.length, sliderWidth]);

    const handleScroll = (event) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / sliderWidth);
        setCurrentIndex(index);
    };

    const handleImagePress = (index) => {
        if (onImagePress) {
            onImagePress(index);
        }
    };

    return (
        <View style={containerStyle}>
            {/* ScrollView for Images */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={[{ height: sliderHeight }, sliderStyle]}
            >
                {images.map((image, index) => (
                    <Pressable key={index} activeOpacity={0.8} onPress={() => handleImagePress(index)}>
                        <FastImage
                            source={{ uri: image }}
                            style={{
                                width: sliderWidth,
                                height: sliderHeight,
                            }}
                        />
                    </Pressable>
                ))}
            </ScrollView>

            {/* Pagination Indicators */}
            {showPagination && images.length > 1 && (
                <View style={[styles.paginationContainer, paginationStyle]}>
                    {images.map((_, index) => (
                        <View key={index} style={[styles.dot, dotStyle, currentIndex === index ? [styles.activeDot, activeDotStyle] : {}]} />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    paginationContainer: {
        position: 'absolute',
        bottom: 10,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: 'rgba(255, 255, 255, 1)',
    },
});

export default ImageSlider;
