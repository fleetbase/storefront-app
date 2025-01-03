import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Image, Text } from 'tamagui';
import { SimpleGrid } from 'react-native-super-grid';

const StoreCategoriesGrid = ({ categories = [], onPressCategory = null }) => {
    const handleCategoryPress = (category) => {
        if (typeof onPressCategory === 'function') {
            onPressCategory(category);
        }
    };

    const renderCategory = ({ item: category, index }) => {
        return (
            <Pressable key={index} onPress={() => handleCategoryPress(category)}>
                <YStack alignItems='center' justifyContent='center' py='$2' space='$2'>
                    <Image source={{ uri: category.getAttribute('icon_url') }} width={50} height={50} borderRadius={25} />
                    <Text fontSize='$5' fontWeight='bold' textAlign='center' color='$textPrimary' numberOfLines={1}>
                        {category.getAttribute('name')}
                    </Text>
                </YStack>
            </Pressable>
        );
    };

    return (
        <YStack bg='$surface' borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' paddingVertical='$2' space='$2' flex={1}>
            <SimpleGrid maxItemsPerRow={4} itemDimension={50} data={categories} renderItem={renderCategory} />
        </YStack>
    );
};

export default StoreCategoriesGrid;
