import React from 'react';
import { Animated, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Text, YStack, XStack, useTheme } from 'tamagui';

const StoreTagCloud = ({ tags = [], maxTags = 20, onTagPress = () => {}, gap = '$2', padding = '$3', fontColor, bg }) => {
    const theme = useTheme();

    // Limit displayed tags
    const displayedTags = tags.slice(0, maxTags);

    return (
        <YStack padding={padding} alignItems='center'>
            <XStack gap={gap} flexWrap='wrap' alignItems='center' justifyContent='center'>
                {displayedTags.map((tag, index) => (
                    <Tag key={index} label={tag} onPress={() => onTagPress(tag)} bg={bg} theme={theme} fontColor={fontColor} />
                ))}
            </XStack>
        </YStack>
    );
};

export const Tag = ({ label, onPress, theme, fontSize = '$5', bg, fontColor }) => {
    const scale = new Animated.Value(1);
    const opacity = new Animated.Value(1);

    const handlePressIn = () => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: 1.1,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0.8,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    return (
        <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
            <Animated.View
                style={[
                    styles.tag,
                    {
                        backgroundColor: bg || theme.primary.val,
                        transform: [{ scale }],
                        opacity,
                    },
                ]}
            >
                <Text fontSize='$5' color={fontColor}>
                    {label}
                </Text>
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    tag: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        margin: 4,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
});

export default StoreTagCloud;
