import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, Image } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faFolder } from '@fortawesome/free-solid-svg-icons';
import { Collection } from '@fleetbase/sdk';
import { Category } from '@fleetbase/storefront';
import { useNavigation } from '@react-navigation/native';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { formatCurrency, logError } from 'utils';
import { useResourceCollection } from 'utils/Storage';
import tailwind from 'tailwind';

const NetworkCategoryBlock = (props) => {
    const navigation = useNavigation();
    const storefront = useStorefront();

    const [networkCategories, setNetworkCategories] = useResourceCollection('category', Category, StorefrontAdapter, new Collection());
    const [isLoading, setIsLoading] = useState(true);

    const onPress = (category) => {
        if (typeof props?.onPress === 'function') {
            props.onPress(category);
        }
    }

    useEffect(() => {
        setIsLoading(true);

        storefront.categories
            .findAll()
            .then((categories) => {
                setNetworkCategories(categories);

                if (typeof props?.onCategoriesLoaded === 'function') {
                    props.onCategoriesLoaded(categories);
                }
            })
            .catch(logError)
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    return (
        <View style={[props.containerStyle ?? {}, tailwind('rounded-md border border-gray-200 p-4 drop-shadow-lg')]}>
            <View style={tailwind('flex flex-row justify-evenly')}>
                {networkCategories.map((category) => (
                    <TouchableOpacity key={category.id} onPress={() => onPress(category)} style={tailwind('w-1/4 flex items-center justify-center')}>
                        <View style={tailwind('flex items-center justify-center mb-2')}>
                            <View style={tailwind('rounded-full flex items-center justify-center w-12 h-12 bg-blue-50')}>
                                <FontAwesomeIcon icon={faFolder} size={23} style={tailwind('text-blue-900')} />
                            </View>
                        </View>
                        <Text style={tailwind('font-semibold')}>{category.getAttribute('name')}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

export default NetworkCategoryBlock;
