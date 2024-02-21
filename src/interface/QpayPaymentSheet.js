import React, { useState, useEffect, useRef, createRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, Modal, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { isResource, logError, mutatePlaces, translate } from 'utils';
import { useLocale, useMountedState } from 'hooks';
import FastImage from 'react-native-fast-image';
import ActionSheet from 'react-native-actions-sheet';
import tailwind from 'tailwind';

const windowHeight = Dimensions.get('window').height;
const dialogHeight = windowHeight / 1.2;

const QpayPaymentSheet = ({ invoice, title, wrapperStyle, onReady, onPress }) => {
    const actionSheetRef = createRef();
    const isMounted = useMountedState();
    const [locale] = useLocale();

    const pressHandler = (bank) => {
        if (typeof onPress === 'function') {
            onPress(bank);
        }

        actionSheetRef?.current?.hide();
    };

    useEffect(() => {
        if (typeof onReady === 'function') {
            onReady(actionSheetRef?.current);
        }
    }, [isMounted]);

    return (
        <View style={[wrapperStyle]}>
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
                            <Text style={tailwind('text-lg font-semibold')}>{title ?? 'Select Bank'}</Text>
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
                        {invoice?.urls?.map((bank, index) => (
                            <TouchableOpacity key={index} onPress={() => pressHandler(bank)}>
                                <View style={tailwind('px-5 py-4 border-b border-gray-100')}>
                                    <View style={tailwind('flex flex-row items-center')}>
                                        <View style={tailwind('mr-4')}>
                                            <FastImage source={{ uri: bank.logo }} style={tailwind('w-10 h-10')} />
                                        </View>
                                        <View>
                                            <Text style={tailwind('font-semibold')} numberOfLines={1}>
                                                {bank.name}
                                            </Text>
                                            <Text numberOfLines={1}>{bank.description}</Text>
                                        </View>
                                    </View>
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

export default QpayPaymentSheet;
