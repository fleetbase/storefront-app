import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, Image, ImageBackground, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { Collection } from '@fleetbase/sdk';
import { Store, Category, Product } from '@fleetbase/storefront';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { useMountedState } from 'hooks';
import { NetworkInfoService } from 'services';
import { useResourceCollection } from 'utils/Storage';
import { formatCurrency, logError } from 'utils';
import NetworkHeader from 'ui/headers/NetworkHeader';
import CategoryProductSlider from 'ui/CategoryProductSlider';
import StoreCategoryPicker from 'ui/StoreCategoryPicker';
import StoreSearch from 'ui/StoreSearch';
import ProductPriceView from 'ui/ProductPriceView';
import StorePicker from 'ui/StorePicker';
import tailwind from 'tailwind';

const StoreScreen = ({ navigation, route }) => {
    const { info, data } = route.params;

    const storefront = useStorefront();
    const isMounted = useMountedState();
    const store = new Store(data);

    const [categories, setCategories] = useResourceCollection(`${store.id}_categories`, Category, StorefrontAdapter);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState(new Collection());
    const shouldDisplayLoader = categories?.length === 0 && isLoading;

    const loadCategories = () => {
        setIsLoading(true);

        storefront.categories
            .query({ store: store.id, with_products: true })
            .then((categories) => {
                if (isMounted()) {
                    setIsLoading(false);
                    setCategories(categories);
                }
            })
            .catch(logError)
            .finally(() => {
                if (isMounted()) {
                    setIsLoading(false);
                }
            });
    };

    const transitionToCategory = (category, actionSheet) => {
        navigation.navigate('CategoryScreen', { attributes: category.serialize(), store: data });
        actionSheet?.hide();
    };

    const transitionToProduct = (product, close, timeout = 300) => {
        if (typeof close === 'function') {
            close();
        }

        setTimeout(() => {
            navigation.navigate('ProductScreen', { attributes: product.serialize(), store: data });
        }, timeout);
    };

    const StoreHeader = ({ store, wrapperStyle }) => (
        <View style={[tailwind('w-full z-20'), wrapperStyle]}>
            <View style={tailwind('w-full flex items-center justify-center px-4')}>
                <View style={tailwind('shadow-sm rounded-md bg-white w-full my-5 mx-10')}>
                    <View style={tailwind('p-4')}>
                        <View style={tailwind('flex flex-row border-b border-gray-100 pb-2')}>
                            <View style={tailwind('mr-3')}>
                                <View style={tailwind('border border-gray-300 shadow-sm rounded-md')}>
                                    <Image source={{ uri: store.getAttribute('logo_url') }} style={tailwind('h-18 w-18 rounded-md')} />
                                </View>
                            </View>
                            <View style={tailwind('w-3/4')}>
                                <Text style={tailwind('font-bold text-lg mb-1')} numberOfLines={1}>
                                    {store.getAttribute('name')}
                                </Text>
                                <Text style={tailwind('text-gray-400')}>{store.getAttribute('description')}</Text>
                            </View>
                        </View>
                        <View style={tailwind('mt-2')}>
                            <StorePicker
                                info={data}
                                displayAddressForTitle={true}
                                buttonIcon={faMapMarkerAlt}
                                buttonTitleMaxLines={2}
                                buttonStyle={tailwind('bg-gray-50')}
                                buttonTitleStyle={tailwind('text-sm text-gray-800')}
                                buttonTitleWrapperStyle={tailwind('w-full flex-1')}
                                buttonIconStyle={tailwind('text-gray-800')}
                                buttonIconSize={22}
                            />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );

    // get categories
    useEffect(() => {
        loadCategories();
    }, [isMounted]);

    return (
        <View style={tailwind('bg-white h-full')}>
            <View style={tailwind('relative z-20')}>
                <ImageBackground source={{ uri: store.getAttribute('backdrop_url') }} style={tailwind('h-44')} imageStyle={tailwind('bg-cover')}>
                    <NetworkHeader
                        style={tailwind('bg-transparent')}
                        wrapperStyle={tailwind('border-b-0')}
                        backButtonStyle={tailwind('bg-opacity-50 bg-gray-900')}
                        backButtonIconStyle={tailwind('text-gray-50')}
                        info={info}
                        onBack={() => navigation.goBack()}
                        hideSearch={true}
                    />
                    <StoreHeader store={store} wrapperStyle={tailwind('-mt-2')} />
                </ImageBackground>
            </View>
            <View style={tailwind('w-full h-full')}>
                <ScrollView style={tailwind('pt-24 pb-40')} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                    {shouldDisplayLoader && (
                        <View style={tailwind('py-6 w-full flex flex-row items-center justify-center')}>
                            <ActivityIndicator />
                            <Text style={tailwind('ml-3 text-gray-500')}>Loading...</Text>
                        </View>
                    )}
                    {categories
                        .filter((category) => category.getAttribute('products.length') > 0)
                        .map((category) => (
                            <View key={category.id}>
                                <View style={tailwind('w-full px-4 py-4')}>
                                    <Text style={tailwind('font-bold text-base')}>{category.getAttribute('name')}</Text>
                                </View>
                                <View style={tailwind('flex flex-row')}>
                                    {category
                                        .getAttribute('products')
                                        .map((product) => new Product(product, StorefrontAdapter))
                                        .map((product, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                onPress={() => navigation.navigate('ProductScreen', { attributes: product.serialize(), store: data })}
                                                style={tailwind('w-1/2')}
                                            >
                                                <View>
                                                    <View style={tailwind('p-2')}>
                                                        <View style={tailwind('bg-gray-50 py-2 px-3 flex items-center justify-center')}>
                                                            <Image source={{ uri: product.getAttribute('primary_image_url') }} style={tailwind('h-28 w-28')} />
                                                        </View>
                                                        <View style={tailwind('flex p-2')}>
                                                            <Text style={tailwind('font-semibold mb-1')}>{product.getAttribute('name')}</Text>
                                                            <ProductPriceView product={product} textStyle={tailwind('font-bold')} />
                                                        </View>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                </View>
                            </View>
                        ))}
                    <View style={tailwind('w-full h-80')}></View>
                </ScrollView>
            </View>
            <View style={tailwind('absolute w-full bottom-0 bg-white shadow-sm')}>
                <View style={tailwind('w-full bg-white shadow-sm')}>
                    <View style={tailwind('flex flex-row items-center justify-between h-20 px-4')}>
                        <View style={tailwind('flex-1 pr-2')}>
                            <StoreSearch store={store} onResultPress={transitionToProduct} />
                        </View>
                        <View style={tailwind('flex-1 pl-2')}>
                            <StoreCategoryPicker categories={categories.filter((category) => category.getAttribute('products.length') > 0)} onCategoryPress={transitionToCategory} />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default StoreScreen;
