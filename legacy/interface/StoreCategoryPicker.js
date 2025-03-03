import React, { useState, useEffect, useRef, createRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { isResource, logError, mutatePlaces, translate } from 'utils';
import { useLocale } from 'hooks';
import ActionSheet from 'react-native-actions-sheet';
import tailwind from 'tailwind';

const windowHeight = Dimensions.get('window').height;
const dialogHeight = windowHeight / 2;

const StoreCategoryPicker = ({
    categories,
    wrapperStyle,
    buttonTitle,
    hideButtonTitle,
    buttonStyle,
    buttonTitleStyle,
    dialogIconStyle,
    buttonIcon,
    buttonIconSize,
    buttonIconStyle,
    numberOfLines,
    onCategoryPress,
}) => {
    categories = categories ?? [];
    buttonTitle = buttonTitle ?? translate('components.interface.StoreCategoryPicker.viewCategories');
    buttonIcon = buttonIcon ?? faBars;

    const actionSheetRef = createRef();
    const [locale] = useLocale();

    const handleCategoryPress = (category) => {
        if (typeof onCategoryPress === 'function') {
            onCategoryPress(category, actionSheetRef?.current);
        }
    };

    return (
        <View style={[wrapperStyle]}>
            <TouchableOpacity onPress={() => actionSheetRef.current?.show()}>
                <View style={[tailwind(`flex flex-row items-center justify-center rounded-lg px-4 py-2 bg-white bg-gray-50 border border-gray-100`), buttonStyle]}>
                    <FontAwesomeIcon icon={buttonIcon} size={buttonIconSize} style={[tailwind(`text-gray-900 ${!hideButtonTitle ? 'mr-2' : ''}`), buttonIconStyle]} />
                    {!hideButtonTitle && (
                        <Text style={[tailwind('text-gray-900 text-base'), buttonTitleStyle]} numberOfLines={numberOfLines}>
                            {buttonTitle}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>

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
                            <FontAwesomeIcon icon={buttonIcon} style={[tailwind(`text-gray-900 mr-2`), dialogIconStyle]} />
                            <Text style={tailwind('text-lg font-semibold')}>{translate('components.interface.StoreCategoryPicker.categories')}</Text>
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
                        {categories.map((category, index) => (
                            <TouchableOpacity key={index} onPress={() => handleCategoryPress(category)}>
                                <View style={tailwind('px-5 py-4 border-b border-gray-100')}>
                                    <Text style={tailwind('font-semibold')}>{translate(category, 'name')}</Text>
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

export default StoreCategoryPicker;
