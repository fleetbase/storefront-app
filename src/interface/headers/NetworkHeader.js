import { Collection } from '@fleetbase/sdk';
import { Category, Network } from '@fleetbase/storefront';
import { faArrowLeft, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation } from '@react-navigation/native';
import { useLocale, useMountedState } from 'hooks';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import React, { useState } from 'react';
import { ImageBackground, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tailwind from 'tailwind';
import { config, translate } from 'utils';
import { useResourceCollection } from 'utils/Storage';
import { truncateString } from '../../utils';
import LangPicker from '../LangPicker';
import LocationPicker from '../LocationPicker';
import NetworkSearch from '../NetworkSearch';
import StoreCategoryPicker from '../StoreCategoryPicker';

const NetworkHeader = (props) => {
    let {
        info,
        onBack,
        backButtonIcon,
        hideSearch,
        hideSearchBar,
        hideCategoryPicker,
        categories,
        searchPlaceholder,
        onSearchResultPress,
        onCategoryPress,
        backgroundImage,
        backgroundImageResizeMode,
        backgroundImageStyle,
        displayLogoText,
        children,
    } = props;

    searchPlaceholder = searchPlaceholder ?? translate('components.interface.headers.NetworkHeader.search');

    const insets = useSafeAreaInsets();
    const storefront = useStorefront();
    const navigation = useNavigation();
    const isMounted = useMountedState();

    const network = new Network(info, storefront.getAdapter());
    const [locale] = useLocale();
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState(new Collection());
    const [networkCategories, setNetworkCategories] = useResourceCollection('category', Category, StorefrontAdapter, categories ?? new Collection());

    const shouldDisplayLogoText = (displayLogoText ?? config('ui.headerComponent.displayLogoText')) === true;
    const displaySearchBar = !hideSearchBar;
    const displayNetworkSearch = !hideSearch;
    const displayCategoryPicker = !hideCategoryPicker;

    return (
        <ImageBackground
            source={backgroundImage ?? config('ui.headerComponent.backgroundImage')}
            resizeMode={backgroundImageResizeMode ?? config('ui.headerComponent.backgroundImageResizeMode')}
            style={[tailwind('z-50'), { paddingTop: insets.top }, props.style, backgroundImageStyle ?? config('ui.headerComponent.backgroundImageStyle')]}
        >
            <View style={[tailwind('border-b border-gray-100'), props.wrapperStyle, config('ui.headerComponent.containerStyle')]}>
                <View style={[tailwind('flex flex-row items-center justify-between px-2 py-1 overflow-hidden'), props.innerStyle]}>
                    <View style={tailwind('flex flex-row items-center')}>
                        {onBack && (
                            <TouchableOpacity style={tailwind('mr-0')} onPress={onBack}>
                                <View style={[tailwind('rounded-full bg-gray-50 w-8 h-8 flex items-center justify-center'), props.backButtonStyle ?? {}]}>
                                    <FontAwesomeIcon icon={backButtonIcon ?? faArrowLeft} style={[tailwind('text-gray-900'), props.backButtonIconStyle ?? {}]} />
                                </View>
                            </TouchableOpacity>
                        )}
                        {shouldDisplayLogoText && <Text style={[tailwind('font-bold text-lg pl-1'), props.logoStyle ?? {}]}>{truncateString(props.info.name, onBack ? 20 : 40)}</Text>}
                    </View>
                    <View style={tailwind('flex flex-row')}>
                        {config('ui.headerComponent.displayLocalePicker') === true && config('app.enableTranslations') === true && (
                            <LangPicker wrapperStyle={tailwind('mr-2')} buttonStyle={[config('ui.headerComponent.localePickerStyle')]} />
                        )}
                        {/* {config('ui.headerComponent.displayLocationPicker') === true && <LocationPicker buttonStyle={[config('ui.headerComponent.locationPickerStyle')]} />} */}
                        {config('ui.headerComponent.displayLocationPicker') === true && (
                            <TouchableOpacity onPress={() => navigation.navigate('LocationPickerStack')} style={tailwind('flex flex-row items-center rounded-full bg-blue-50 px-3 py-2')}>
                                <FontAwesomeIcon icon={faMapMarkerAlt} style={tailwind('text-blue-900 mr-2')} />
                                <Text style={tailwind('text-blue-900 font-semibold mr-1')}>{translate('components.interface.LocationPicker.selectLocation')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {displaySearchBar && (
                    <View style={tailwind('px-4 py-2 flex flex-row items-center')}>
                        {displayNetworkSearch && (
                            <View style={tailwind('flex-1')}>
                                <NetworkSearch
                                    network={network}
                                    buttonTitle={searchPlaceholder}
                                    onResultPress={onSearchResultPress}
                                    buttonStyle={[config('ui.headerComponent.searchButtonStyle')]}
                                    buttonTitleStyle={[config('ui.headerComponent.searchButtonTitleStyle')]}
                                    buttonIconStyle={[config('ui.headerComponent.searchButtonIconStyle')]}
                                />
                            </View>
                        )}
                        {displayCategoryPicker && (
                            <View style={tailwind('ml-3')}>
                                <StoreCategoryPicker
                                    categories={networkCategories}
                                    hideButtonTitle={true}
                                    onCategoryPress={onCategoryPress}
                                    buttonStyle={[tailwind('h-10'), config('ui.headerComponent.categoryButtonStyle')]}
                                    buttonIconStyle={[config('ui.headerComponent.categoryButtonIconStyle')]}
                                />
                            </View>
                        )}
                        {children}
                    </View>
                )}
            </View>
        </ImageBackground>
    );
};

export default NetworkHeader;
