import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { YStack } from 'tamagui';

/**
 * A category is a section of the store page, so opening one (a link, an older screen,
 * the category list) goes back to the store page and jumps to that section.
 */
const StoreCategoryJumpScreen = ({ route }: any) => {
    const navigation = useNavigation<any>();
    const categoryId = route.params?.categoryId ?? route.params?.category?.id ?? null;

    useEffect(() => {
        const target = { categoryId };
        if (typeof navigation.popTo === 'function') navigation.popTo('StoreHome', target);
        else navigation.navigate('StoreHome', target);
    }, [categoryId, navigation]);

    return <YStack flex={1} backgroundColor='$background' />;
};

export default StoreCategoryJumpScreen;
