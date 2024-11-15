import React from 'react';
import { Dimensions, TouchableOpacity } from 'react-native';
import { YStack, XStack, Image, Text } from 'tamagui';

const calculateCategoriesPerRow = (numCategories) => {
    if (numCategories <= 2) return numCategories;
    if (numCategories <= 4) return 2;
    if (numCategories <= 6) return 3;
    if (numCategories <= 8) return 4;
    if (numCategories <= 10) return 5;
    return 6;
};

const organizeCategoriesIntoRows = (categories, categoriesPerRow) => {
    const rows = [];
    for (let i = 0; i < categories.length; i += categoriesPerRow) {
        rows.push(categories.slice(i, i + categoriesPerRow));
    }
    return rows;
};

const StoreCategoriesGrid = ({
    categories = [],
    categoriesPerRow = null,
    wrapperStyle = {},
    wrapperProps = {},
    justifyContent = 'space-between',
    rowStyle = {},
    rowProps = {},
    itemStyle = {},
    itemContainerProps = {},
    itemContainerWidth = null,
    onPressCategory = null,
}) => {
    const adjustedCategoriesPerRow = categoriesPerRow || calculateCategoriesPerRow(categories.length);

    // Calculate item width with fixed padding
    const screenWidth = Dimensions.get('window').width;
    const sidePadding = 16; // Padding on each side
    const itemSpacing = 8; // Space between items
    const totalItemWidth = screenWidth - sidePadding * 2 - itemSpacing * (adjustedCategoriesPerRow - 1);
    const itemWidth = itemContainerWidth ? itemContainerWidth : totalItemWidth / adjustedCategoriesPerRow;
    const rows = organizeCategoriesIntoRows(categories, adjustedCategoriesPerRow);

    const handleCategoryPress = (category) => {
        if (typeof onPressCategory === 'function') {
            onPressCategory(category);
        }
    };

    return (
        <YStack paddingHorizontal={sidePadding} paddingVertical='$2' space='$2' style={[{ flex: 1 }, wrapperStyle]} {...wrapperProps}>
            {rows.map((row, rowIndex) => (
                <XStack key={rowIndex} justifyContent={justifyContent} space={itemSpacing} style={rowStyle} {...rowProps}>
                    {row.map((category, index) => (
                        <TouchableOpacity key={index} onPress={() => handleCategoryPress(category)}>
                            <YStack alignItems='center' justifyContent='center' paddingVertical='$4' space='$2' width={itemWidth} style={itemStyle} {...itemContainerProps}>
                                <Image source={{ uri: category.getAttribute('icon_url') }} width={50} height={50} borderRadius={25} />
                                <Text fontSize='$4' fontWeight='600' textAlign='center' color='$color'>
                                    {category.getAttribute('name')}
                                </Text>
                            </YStack>
                        </TouchableOpacity>
                    ))}
                </XStack>
            ))}
        </YStack>
    );
};

export default StoreCategoriesGrid;
