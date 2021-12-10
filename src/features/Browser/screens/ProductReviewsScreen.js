import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUniqueId } from 'react-native-device-info';
import { EventRegister } from 'react-native-event-listeners';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faAsterisk, faPlus, faMinus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Product, StoreLocation } from '@fleetbase/storefront';
import { useStorefront, useCart } from 'hooks';
import { formatCurrency, isLastIndex, stripIframeTags, logError } from 'utils';
import { useResourceStorage } from 'utils/Storage';
import Carousel, { Pagination } from 'react-native-snap-carousel';
import Checkbox from 'react-native-bouncy-checkbox';
import RadioButton from 'react-native-animated-radio-button';
import RenderHtml from 'react-native-render-html';
import tailwind from 'tailwind';

const { isArray } = Array;
const { emit } = EventRegister;

const ProductReviewsScreen = ({ navigation, route }) => {
    const { attributes, cartItemAttributes, store, info } = route.params;

    const storefront = useStorefront();
    const product = new Product(attributes);
    const fullWidth = Dimensions.get('window').width;
    const fullHeight = Dimensions.get('window').height;
    const scrollViewMinHeight = fullHeight / 2;
    const insets = useSafeAreaInsets();

    return <View style={[tailwind('bg-white'), { paddingTop: insets.top }]}></View>;
};

export default ProductReviewsScreen;
