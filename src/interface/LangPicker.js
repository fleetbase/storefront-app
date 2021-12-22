import React, { useState, useEffect, useRef, createRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, Modal } from 'react-native';
import * as RNLocalize from 'react-native-localize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { isResource, logError, mutatePlaces } from 'utils';
import { useLocale, useMountedState } from 'hooks';
import { activeTranslations, setLanguage, getLanguage } from 'utils/Localize';
import ActionSheet from 'react-native-actions-sheet';
import tailwind from 'tailwind';
import localeEmoji from 'locale-emoji';
import { getLangNameFromCode } from 'language-name-map'

const windowHeight = Dimensions.get('window').height;
const dialogHeight = windowHeight / 2;

const LangPicker = ({ title, buttonStyle, wrapperStyle, dialogIconStyle, hideButtonTitle, onLangPress }) => {
    title = title ?? 'Select language';

    const actionSheetRef = createRef();
    const isMounted = useMountedState();
    const [locale, setLocale] = useLocale();

    const selectLanguage = (lang) => {
        if (!isMounted()) {
            return;
        }

        setLocale(lang);

        if (typeof onLangPress === 'function') {
            onLangPress(lang, actionSheetRef?.current);
        }

        actionSheetRef?.current?.hide();
    };

    return (
        <View style={[wrapperStyle]}>
            <TouchableOpacity onPress={() => actionSheetRef.current?.setModalVisible()}>
                <View style={[tailwind(`flex flex-row items-center justify-center rounded-full px-2 py-2 bg-white bg-gray-50 border border-gray-100`), buttonStyle]}>
                    <Text>{localeEmoji(locale)}</Text>
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
                            <Text style={tailwind('text-lg font-semibold')}>{title}</Text>
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
                        {activeTranslations.map((lang, index) => (
                            <TouchableOpacity key={index} onPress={() => selectLanguage(lang)}>
                                <View style={tailwind('flex flex-row items-center px-5 py-4 border-b border-gray-100')}>
                                    <View style={tailwind('w-10')}>
                                        <Text style={tailwind('text-lg')}>{localeEmoji(lang)}</Text>
                                    </View>
                                    <Text style={tailwind('font-semibold text-lg')}>{getLangNameFromCode(lang)?.native}</Text>
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

export default LangPicker;
