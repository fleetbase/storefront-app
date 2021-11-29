import React, { useState, useEffect, useRef, createRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, Image, Dimensions } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faFolder, faTimes, faEllipsisH } from '@fortawesome/free-solid-svg-icons';
import { Collection } from '@fleetbase/sdk';
import { Category } from '@fleetbase/storefront';
import { useNavigation } from '@react-navigation/native';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { formatCurrency, logError } from 'utils';
import { useResourceCollection } from 'utils/Storage';
import ActionSheet from 'react-native-actions-sheet';
import tailwind from 'tailwind';

const windowHeight = Dimensions.get('window').height;
const dialogHeight = windowHeight / 1.12;

const NetworkCategoryBlock = (props) => {
    const navigation = useNavigation();
    const storefront = useStorefront();
    const actionSheetRef = createRef();

    const [networkCategories, setNetworkCategories] = useResourceCollection('category', Category, StorefrontAdapter, new Collection());
    const [isLoading, setIsLoading] = useState(true);

    const on = (action = 'press', ...params) => {
        const capitalize = ([first, ...rest]) => first.toUpperCase() + rest.join('');
        const actionName = `on${capitalize(action)}`;
        const fn = props[actionName];

        if (actionName === 'onPressMore') {
            actionSheetRef.current?.setModalVisible();
        }

        if (typeof fn  === 'function') {
            fn(...params);
        }
    }

    useEffect(() => {
        setIsLoading(true);

        storefront.categories
            .query({ parents_only: true })
            .then((categories) => {
                setNetworkCategories(categories);
                on('categoriesLoaded', categories);
            })
            .catch(logError)
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    if (!networkCategories || networkCategories?.length === 0) {
        return <View />;
    }

    const categories = networkCategories?.length > 7 ? networkCategories.slice(0, 7) : networkCategories;

    return (
        <View style={[tailwind('rounded-md border border-gray-200 drop-shadow-lg'), props.containerStyle]}>
            <View style={tailwind('flex flex-row flex-wrap justify-evenly w-full')}>
                {categories.map((category) => (
                    <TouchableOpacity key={category.id} onPress={() => on('press', category)} style={[tailwind('w-1/4 flex items-center text-center mb-3'), props.categoryStyle]}>
                        <View style={[tailwind('flex items-center justify-center mb-1 h-16 w-20'), props.iconContainerStyle]}>
                            <View style={[tailwind('rounded-full flex items-center justify-center w-12 h-12 bg-blue-50'), props.iconWrapperStyle]}>
                                <FontAwesomeIcon icon={faFolder} size={23} style={[tailwind('text-blue-900'), props.iconStyle]} />
                            </View>
                        </View>
                        <Text style={[tailwind('font-semibold flex items-center justify-center text-center w-20'), props.labelStyle]} numberOfLines={2}>
                            {category.getAttribute('name')}
                        </Text>
                    </TouchableOpacity>
                ))}
                {networkCategories.length > 7 && (
                    <TouchableOpacity onPress={() => on('pressMore')} style={[tailwind('w-1/4 flex items-center mb-3'), props.categoryStyle]}>
                        <View style={[tailwind('flex items-center justify-center mb-1 h-18 w-20'), props.iconContainerStyle]}>
                            <View style={[tailwind('rounded-full flex items-center justify-center w-12 h-12 bg-blue-50'), props.iconWrapperStyle, props.moreIconWrapperStyle]}>
                                <FontAwesomeIcon icon={faEllipsisH} size={23} style={[tailwind('text-blue-900'), props.iconStyle, props.moreIconStyle]} />
                            </View>
                        </View>
                        <Text style={[tailwind('font-semibold flex items-center justify-center text-center w-20'), props.labelStyle]} numberOfLines={2}>
                            More
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
            <ActionSheet
                containerStyle={[{ height: dialogHeight }]}
                gestureEnabled={true}
                bounceOnOpen={true}
                nestedScrollEnabled={true}
                onMomentumScrollEnd={() => actionSheetRef.current?.handleChildScrollEnd()}
                ref={actionSheetRef}
            >
                <View>
                    <View style={tailwind('px-5 py-2 flex flex-row items-center justify-between mb-2')}>
                        <View style={tailwind('flex flex-row items-center')}>
                            <FontAwesomeIcon icon={faFolder} style={[tailwind(`text-gray-900 mr-2`), props.buttonIconStyle]} />
                            <Text style={tailwind('text-lg font-semibold')}>Categories</Text>
                        </View>

                        <View>
                            <TouchableOpacity onPress={() => actionSheetRef.current?.hide()}>
                                <View style={tailwind('rounded-full bg-red-50 w-8 h-8 flex items-center justify-center')}>
                                    <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                        {networkCategories.map((category, index) => (
                            <TouchableOpacity key={index} onPress={() => on('press', category, actionSheetRef?.current)}>
                                <View style={tailwind('px-5 py-4 border-b border-gray-100')}>
                                    <Text style={tailwind('font-semibold')}>{category.getAttribute('name')}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                        <View style={tailwind('w-full h-40')}></View>
                    </ScrollView>
                </View>
            </ActionSheet>
        </View>
    );
};

export default NetworkCategoryBlock;
