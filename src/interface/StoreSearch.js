import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, Image, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { logError, debounce, stripHtml, translate } from 'utils';
import { useStorefront, useLocale } from 'hooks';
import ProductPriceView from './ProductPriceView';
import tailwind from 'tailwind';

const windowHeight = Dimensions.get('window').height;
const dialogHeight = windowHeight / 2;

const StoreSearch = ({ store, wrapperStyle, buttonTitle, buttonStyle, buttonTitleStyle, buttonIcon, buttonIconSize, buttonIconStyle, numberOfLines, onResultPress }) => {
    buttonTitle = buttonTitle ?? 'Search';
    buttonIcon = buttonIcon ?? faSearch;

    const insets = useSafeAreaInsets();
    const storefront = useStorefront();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [results, setResults] = useState([]);
    const [query, setQuery] = useState(null);
    const [locale] = useLocale();

    const closeDialog = () => setIsDialogOpen(false);

    const handleResultPress = (result) => {
        if (typeof onResultPress === 'function') {
            onResultPress(result, closeDialog);
        }
    };

    const fetchResultsFromStore = async (query, cb) => {
        const results = await storefront.search(query, { store: store?.id }).catch(logError);

        if (typeof cb === 'function') {
            cb(results);
        }
    };

    const debouncedSearch = debounce((query, cb) => {
        fetchResultsFromStore(query, cb);
    }, 600);

    useEffect(() => {
        if (!query) {
            return;
        }

        debouncedSearch(query, (results) => {
            setResults(results);
        });
    }, [query]);

    return (
        <View style={[wrapperStyle]}>
            <TouchableOpacity onPress={() => setIsDialogOpen(true)}>
                <View style={[tailwind(`flex flex-row items-center justify-center rounded-lg px-4 py-2 bg-white bg-gray-50 border border-gray-100`), buttonStyle]}>
                    <FontAwesomeIcon icon={buttonIcon} size={buttonIconSize} style={[tailwind('mr-2 text-gray-900'), buttonIconStyle]} />
                    <Text style={[tailwind('text-gray-900 text-base'), buttonTitleStyle]} numberOfLines={numberOfLines}>
                        {buttonTitle}
                    </Text>
                </View>
            </TouchableOpacity>

            <Modal animationType={'slide'} transparent={true} visible={isDialogOpen} onRequestClose={closeDialog}>
                <View style={[tailwind('w-full h-full bg-white'), { paddingTop: Math.max(insets.top, 47) }]}>
                    <View style={tailwind('px-5 py-2 flex flex-row items-center justify-between')}>
                        <View style={tailwind('flex-1 pr-4')}>
                            <View style={tailwind('relative overflow-hidden')}>
                                <View style={tailwind('absolute top-0 bottom-0 left-0 h-full flex items-center justify-center z-10')}>
                                    <FontAwesomeIcon icon={buttonIcon} style={[tailwind('text-gray-800 ml-3'), buttonIconStyle]} />
                                </View>
                                <TextInput
                                    value={query}
                                    onChangeText={setQuery}
                                    autoComplete={'off'}
                                    autoCorrect={false}
                                    autoCapitalize={'none'}
                                    autoFocus={true}
                                    clearButtonMode={'while-editing'}
                                    textAlign={'left'}
                                    style={tailwind('bg-gray-100 rounded-md pl-10 pr-2 h-10')}
                                    placeholder={translate('components.interface.StoreSearch.inputPlaceholderText', { storeName: store?.getAttribute('name') })}
                                />
                            </View>
                        </View>

                        <View>
                            <TouchableOpacity onPress={closeDialog}>
                                <View style={tailwind('rounded-full bg-red-50 w-8 h-8 flex items-center justify-center')}>
                                    <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>
                        {results.map((product, index) => (
                            <TouchableOpacity key={index} onPress={() => handleResultPress(product)}>
                                <View style={tailwind('px-5 py-4 border-b border-gray-100')}>
                                    <View style={tailwind('flex flex-row')}>
                                        <View style={tailwind('mr-3')}>
                                            <View style={tailwind('border border-gray-200 shadow-sm')}>
                                                <Image source={{ uri: product.getAttribute('primary_image_url') }} style={tailwind('h-14 w-14')} />
                                            </View>
                                        </View>
                                        <View style={tailwind('flex-1')}>
                                            <Text style={tailwind('font-semibold text-base')} numberOfLines={1}>
                                                {product.getAttribute('name')}
                                            </Text>
                                            <Text style={tailwind('text-gray-400 mb-2')} numberOfLines={1}>
                                                {stripHtml(product.getAttribute('description')) || 'No description'}
                                            </Text>
                                            <ProductPriceView product={product} />
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                        <View style={tailwind('w-full h-40')}></View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
};

export default StoreSearch;
