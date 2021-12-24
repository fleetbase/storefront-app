import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Dimensions, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPhotoVideo, faTimes, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { Store, Product } from '@fleetbase/storefront';
import useStorefront, { adapter as StorefrontAdapter } from 'hooks/use-storefront';
import { useCustomer, useLocale } from 'hooks';
import { logError, translate } from 'utils';
import PhotoUpload from 'ui/PhotoUpload';
import Rating from 'ui/Rating';
import tailwind from 'tailwind';

const WriteReviewScreen = ({ navigation, route }) => {
    const { info, subjectData, subjectType } = route.params;

    const storefront = useStorefront();
    const insets = useSafeAreaInsets();

    const [locale] = useLocale();
    const [customer, setCustomer] = useCustomer();
    const [isLoading, setIsLoading] = useState(false);
    const [rating, setRating] = useState(0);
    const [content, setContent] = useState('');
    const [photos, setPhotos] = useState([]);

    let subject;

    if (subjectType === 'store') {
        subject = new Store(subjectData, StorefrontAdapter);
    } else if (subjectType === 'product') {
        subject = new Product(subjectData, StorefrontAdapter);
    }

    const isValid = rating > 0 && content.length > 0;

    const login = () => {
        return navigation.navigate('LoginScreen', { redirectTo: 'WriteReviewScreen' });
    };

    const queueReviewPhoto = (photo) => {
        setPhotos([photo, ...photos]);
    };

    const removeQueuedReviewPhoto = (index) => {
        if (index < -1) {
            return;
        }

        const mutateablePhotos = [...photos];
        mutateablePhotos.splice(index, 1);

        setPhotos(mutateablePhotos);
    };

    const submitReview = async () => {
        setIsLoading(true);

        return storefront.reviews
            .create({
                subject: subject.id,
                rating,
                content,
                files: photos,
            })
            .then(() => {
                navigation.goBack();
            })
            .catch(logError)
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <View style={[tailwind('bg-white'), { paddingTop: insets.top }]}>
            <View style={tailwind('relative h-full')}>
                <View style={tailwind('w-full')}>
                    <View style={tailwind('flex flex-row items-center p-4')}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={tailwind('mr-4')} disabled={isLoading}>
                            <View style={tailwind('rounded-full bg-gray-100 w-10 h-10 flex items-center justify-center')}>
                                <FontAwesomeIcon icon={faTimes} />
                            </View>
                        </TouchableOpacity>
                        <Text style={tailwind('text-xl font-semibold')}>{subject.getAttribute('name')}</Text>
                    </View>
                </View>
                <ScrollView>
                    {!customer && (
                        <View style={tailwind('flex flex-row items-center py-4 px-5')}>
                            <View style={tailwind('p-4 rounded-md bg-red-50 mb-4')}>
                                <View style={tailwind('flex flex-col overflow-hidden')}>
                                    <View style={tailwind('flex flex-row items-center mb-3 w-full')}>
                                        <FontAwesomeIcon icon={faExclamationTriangle} size={14} style={tailwind('text-red-500 mr-2')} />
                                        <Text style={tailwind('text-red-600 text-sm font-semibold')} numberOfLines={1}>
                                            {translate('Shared.WriteReviewScreen.loginToReviewWarningText')}
                                        </Text>
                                    </View>
                                    <TouchableOpacity style={tailwind('w-full')} disabled={isLoading} onPress={login}>
                                        <View style={tailwind('btn border border-red-100 bg-red-100 w-full')}>
                                            <Text style={tailwind('font-semibold text-red-900')}>{translate('Shared.WriteReviewScreen.login')}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                    <View style={tailwind(`flex flex-row items-center py-4 px-5 ${!customer ? 'opacity-50' : ''}`)}>
                        <Rating value={rating} size={30} onRatingChange={setRating} readonly={!customer} />
                        <Text style={tailwind('text-gray-500 text-base ml-3')}>{translate('Shared.WriteReviewScreen.selectYourRating')}</Text>
                    </View>
                    <View style={tailwind('flex flex-row items-center px-5 mb-4')}>
                        <TextInput
                            multiline={true}
                            numberOfLines={22}
                            onChangeText={setContent}
                            value={content}
                            style={tailwind(`border border-gray-100 rounded-md w-full min-h-44 p-4 ${!customer ? 'opacity-50' : ''}`)}
                            placeholder={'Write your review or feedback (optional)'}
                            placeholderTextColor={tailwind('text-gray-400')}
                            editable={![null, undefined, ''].includes(customer)}
                        />
                    </View>
                    {customer && (
                        <View style={tailwind('flex flex-row items-center px-5 mb-4')}>
                            <View style={tailwind('rounded-md border border-dashed border-gray-200 p-4 w-full flex flex-col')}>
                                <PhotoUpload
                                    onPhotoSelect={queueReviewPhoto}
                                    containerStyle={tailwind('w-full flex items-center justify-center')}
                                    style={tailwind('w-full flex items-center justify-center')}
                                >
                                    <View style={tailwind('w-full flex items-center justify-center')}>
                                        <FontAwesomeIcon icon={faPhotoVideo} size={35} style={tailwind('text-gray-300')} />
                                    </View>
                                </PhotoUpload>
                                <View style={tailwind(`flex flex-row flex-wrap ${photos.length === 0 ? 'hidden' : 'mt-5'}`)}>
                                    {photos.map((photo, index) => (
                                        <View key={index} style={tailwind('mr-2 mb-2')}>
                                            <Image source={{ uri: `data:${photo.type};base64,${photo.data}` }} style={tailwind('w-24 h-24 z-10')} />
                                            <TouchableOpacity
                                                onPress={() => removeQueuedReviewPhoto(index)}
                                                style={tailwind(
                                                    'absolute top-0 right-0 -mt-2 -mr-2 z-20 rounded-full border border-white h-6 w-6 bg-red-500 flex items-center justify-center'
                                                )}
                                            >
                                                <FontAwesomeIcon icon={faTimes} style={tailwind('text-white')} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}
                    <View style={tailwind('flex flex-row items-center px-5')}>
                        <TouchableOpacity onPress={submitReview} style={tailwind(`btn bg-blue-500 shadow-sm ${!isValid ? 'bg-opacity-50' : ''}`)} disabled={!isValid || isLoading}>
                            {isLoading && <ActivityIndicator style={tailwind('mr-3')} color={'#ffffff'} size={'small'} />}
                            <Text style={tailwind('text-white text-lg font-semibold')}>{translate('Shared.WriteReviewScreen.submitReview')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
};

export default WriteReviewScreen;
