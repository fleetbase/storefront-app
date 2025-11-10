import React from 'react';
import { Pressable, FlatList } from 'react-native';
import { XStack, Text, Image } from 'tamagui';
import FastImage from 'react-native-fast-image';

const StoreCategoriesPills = ({ categories = [], onPressCategory }) => {
    const handleCategoryPress = (category) => {
        if (typeof onPressCategory === 'function') {
            onPressCategory(category);
        }
    };

    const renderCategory = ({ item: category }) => {
        if (typeof category.getAttribute !== 'function') return;
        if (typeof category.getAttribute === 'function' && !category.getAttribute('name')) return;
        return (
            <Pressable onPress={() => handleCategoryPress(category)}>
                <XStack
                    alignItems='center'
                    py='$1'
                    marginLeft='$3'
                    paddingLeft='$1'
                    paddingRight='$4'
                    space='$3'
                    borderRadius='$6'
                    backgroundColor='$surface'
                    borderWidth={1}
                    borderColor='$borderColorWithShadow'
                >
                    <Image source={{ uri: category.getAttribute('icon_url') }} width={25} height={25} borderRadius={999} circular />
                    <Text fontSize='$5' color='$textPrimary' numberOfLines={1}>
                        {category.getAttribute('name')}
                    </Text>
                </XStack>
            </Pressable>
        );
    };

    return <FlatList data={categories} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item) => item.id} renderItem={renderCategory} />;
};

export default StoreCategoriesPills;
