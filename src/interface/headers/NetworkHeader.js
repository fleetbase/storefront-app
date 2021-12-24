import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground, TextInput, TouchableOpacity, Modal, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt, faTimes, faInfoCircle, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import { Collection } from '@fleetbase/sdk';
import { Network, Category } from '@fleetbase/storefront';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { useResourceCollection } from 'utils/Storage';
import { config } from 'utils';
import LocationPicker from '../LocationPicker';
import LangPicker from '../LangPicker';
import StorePicker from '../StorePicker';
import NetworkSearch from '../NetworkSearch';
import StoreCategoryPicker from '../StoreCategoryPicker';
import tailwind from 'tailwind';

const NetworkHeader = (props) => {
    let { info, onBack, backButtonIcon, hideSearch, hideCategoryPicker, categories, searchPlaceholder, onSearchResultPress, onCategoryPress } = props;

    searchPlaceholder = searchPlaceholder ?? 'Search';

    const insets = useSafeAreaInsets();
    const storefront = useStorefront();
    const navigation = useNavigation();

    const network = new Network(info, storefront.getAdapter());

    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState(new Collection());
    const [networkCategories, setNetworkCategories] = useResourceCollection('category', Category, StorefrontAdapter, categories ?? new Collection());

    return (
        <ImageBackground source={config('ui.headerComponent.backgroundImage')} resizeMode={config('ui.headerComponent.backgroundImageResizeMode')} style={[tailwind('z-50'), { paddingTop: insets.top }, props.style, config('ui.headerComponent.backgroundImageStyle')]}>
            <View style={[tailwind('border-b border-gray-100'), props.wrapperStyle, config('ui.headerComponent.containerStyle')]}>
                <View style={[tailwind('flex flex-row items-center justify-between px-4 py-1 overflow-hidden'), props.innerStyle]}>
                    <View style={tailwind('flex flex-row items-center')}>
                        {onBack && (
                            <TouchableOpacity style={tailwind('mr-2')} onPress={onBack}>
                                <View style={[tailwind('rounded-full bg-gray-50 w-8 h-8 flex items-center justify-center'), props.backButtonStyle ?? {}]}>
                                    <FontAwesomeIcon icon={backButtonIcon ?? faArrowLeft} style={[tailwind('text-gray-900'), props.backButtonIconStyle ?? {}]} />
                                </View>
                            </TouchableOpacity>
                        )}
                        {config('ui.headerComponent.displayLogoText') === true && <Text style={[tailwind('font-bold text-lg'), props.logoStyle ?? {}]}>{props.info.name}</Text>}
                    </View>
                    <View style={tailwind('flex flex-row')}>
                        {config('ui.headerComponent.displayLocalePicker') === true && <LangPicker wrapperStyle={tailwind('mr-2')} buttonStyle={[config('ui.headerComponent.localePickerStyle')]} />}
                        {config('ui.headerComponent.displayLocationPicker') === true && <LocationPicker buttonStyle={[config('ui.headerComponent.locationPickerStyle')]} />}
                    </View>
                </View>

                {!hideSearch && (
                    <View style={tailwind('px-4 py-2 flex flex-row items-center')}>
                        <View style={tailwind('flex-1')}>
                            <NetworkSearch network={network} buttonTitle={searchPlaceholder} onResultPress={onSearchResultPress} buttonStyle={[config('ui.headerComponent.searchButtonStyle')]} buttonIconStyle={[config('ui.headerComponent.searchButtonIconStyle')]} />
                        </View>
                        {!hideCategoryPicker && (
                            <View style={tailwind('ml-3')}>
                                <StoreCategoryPicker categories={networkCategories} hideButtonTitle={true} onCategoryPress={onCategoryPress} buttonStyle={[tailwind('h-10'), config('ui.headerComponent.categoryButtonStyle')]} />
                            </View>
                        )}
                    </View>
                )}
            </View>
        </ImageBackground>
    );
};

export default NetworkHeader;
