import { useLocale, useMountedState } from 'hooks';
import React, { createRef, useEffect, useState } from 'react';
import { Dimensions, Text, View, TouchableOpacity } from 'react-native';
import ActionSheet from 'react-native-actions-sheet';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { CreditCardInput } from 'react-native-credit-card-input-plus';
import tailwind from 'tailwind';
import { translate } from '../utils';
import { set } from '../utils/Storage';

const windowHeight = Dimensions.get('window').height;
const dialogHeight = windowHeight / 1.4;

const StripePaymentSheet = ({ title, wrapperStyle, onReady, onPress }) => {
    const actionSheetRef = createRef();
    const isMounted = useMountedState();

    const [card, setCard] = useState({});

    const pressHandler = (card) => {
        if (typeof onPress === 'function') {
            onPress(card);
        }

        actionSheetRef?.current?.hide();
    };

    useEffect(() => {
        if (typeof onReady === 'function') {
            onReady(actionSheetRef?.current);
        }
        setCard({});
        return () => {
            setCard({});
        };
    }, [isMounted]);

    useEffect(() => {
        return () => {
            setCard({});
        };
    }, []);

    return (
        <View style={[wrapperStyle]}>
            <ActionSheet
                containerStyle={[{ height: dialogHeight }]}
                gestureEnabled={true}
                bounceOnOpen={true}
                nestedScrollEnabled={true}
                onMomentumScrollEnd={() => actionSheetRef.current?.handleChildScrollEnd()}
                ref={actionSheetRef}>
                <View style={tailwind('px-5')}>
                    <View style={tailwind('py-2 flex flex-row items-center justify-between mb-2')}>
                        <View style={tailwind('flex flex-row items-center')}>
                            <Text style={tailwind('text-lg font-semibold')}>{title ?? 'Card Details'}</Text>
                        </View>

                        <View>
                            <TouchableOpacity onPress={() => actionSheetRef.current?.hide()}>
                                <View style={tailwind('rounded-full bg-red-50 w-8 h-8 flex items-center justify-center')}>
                                    <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <CreditCardInput
                        horizontalScroll={false}
                        requiresName={true}
                        onChange={(value) => {
                            setCard(value);
                        }}
                    />
                    <TouchableOpacity
                        onPress={() => {
                            pressHandler(card);
                        }}
                        disabled={!card?.valid}>
                        <View
                            style={tailwind(
                                `flex flex-row items-center justify-center rounded-md px-8 py-2 bg-white bg-green-500 border border-green-500 ${!card?.valid ? 'bg-opacity-50 border-opacity-50' : ''}`
                            )}>
                            <Text style={tailwind(`font-semibold text-white text-lg`)}>{translate('Cart.CheckoutScreen.confirmButtonText')}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </ActionSheet>
        </View>
    );
};

export default StripePaymentSheet;
