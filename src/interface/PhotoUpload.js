import React, { useState, createRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform, Appearance, Dimensions } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faSort, faFilter } from '@fortawesome/free-solid-svg-icons';
import ImageResizer from 'react-native-image-resizer';
import ActionSheet from 'react-native-actions-sheet';
import RNFS from 'react-native-fs';
import tailwind from 'tailwind';

const isDarkMode = Appearance.getColorScheme() === 'dark';
const windowHeight = Dimensions.get('window').height;
const dialogHeight = windowHeight / 2;

const PhotoUpload = (props) => {
    const [maxHeight, setMaxHeight] = useState(props.maxHeight ?? 600);
    const [maxWidth, setMaxWidth] = useState(props.maxWidth ?? 600);
    const [format, setFormat] = useState(props.format ?? 'PNG');
    const [quality, setQuality] = useState(props.quality ?? 100);
    const [disabled, setDisabled] = useState(false);
    const [source, setSource] = useState(null);
    const actionSheetRef = createRef();

    const options = {
        title: props.photoPickerTitle ?? 'Select photo',
        includeBase64: true,
        storageOptions: {
            skipBackup: true,
            path: 'images',
        },
        ...props.imagePickerProps,
    };

    const openImagePicker = () => {
        actionSheetRef.current?.setModalVisible();
        setDisabled(true);

        if (typeof props.onStart === 'function') {
            props.onStart();
        }
    };

    const onSelectPhoto = async (response) => {
        setDisabled(false);
        // actionSheetRef.current?.hide();

        if (typeof props.onResponse === 'function') {
            props.onResponse(response);
        }

        if (response.didCancel && typeof props.onCancel === 'function') {
            props.onCancel('User cancelled image picker');
        }

        if (response.errorCode && typeof props.onError === 'function') {
            props.onError(response.errorCode, response.errorMessage);
        }

        const mimeType = response.assets[0].type;
        const base64 = response.assets[0].base64;
        const resizedImageUri = await ImageResizer.createResizedImage(`data:${mimeType};base64,${base64}`, maxHeight, maxWidth, format, quality, 0);

        if (typeof props.onResizedImageUri === 'function') {
            props.onResizedImageUri(resizedImageUri);
        }

        const filePath = Platform.OS === 'android' && resizedImageUri.uri.replace ? resizedImageUri.uri.replace('file:/data', '/data') : resizedImageUri.uri;
        const photoData = await RNFS.readFile(filePath, 'base64');
        const source = { uri: resizedImageUri.uri };

        // update state
        setSource(source);

        // handle photo in props functions as data string
        if (typeof props.onPhotoSelect === 'function') {
            props.onPhotoSelect({
                data: photoData,
                type: mimeType,
            });
        }
    };

    const onLaunchImageLibrary = () => launchImageLibrary(options, (response) => {
        actionSheetRef.current?.hide();
        onSelectPhoto(response);
    });

    const onLaunchCamera = () => launchCamera(options, (response) => {
        actionSheetRef.current?.hide();
        onSelectPhoto(response);
    });

    return (
        <View>
            <View style={[props.containerStyle]}>
                <TouchableOpacity style={[props.style]} onPress={openImagePicker} disabled={disabled}>
                    {props.children}
                </TouchableOpacity>
            </View>
            <ActionSheet ref={actionSheetRef} containerStyle={[{ height: dialogHeight, zIndex: 99999 }]} gestureEnabled={true} bounceOnOpen={true} onClose={() => setDisabled(false)}>
                <View style={tailwind('z-40 w-full h-full')}>
                    <View style={tailwind('px-5 py-2 flex flex-row items-center justify-between mb-2')}>
                        <View style={tailwind('flex flex-row items-center')}>
                            <Text style={tailwind('text-lg font-semibold')}>Select action</Text>
                        </View>
                        <View>
                            <TouchableOpacity onPress={() => actionSheetRef.current?.hide()}>
                                <View style={tailwind('rounded-full bg-red-50 w-8 h-8 flex items-center justify-center')}>
                                    <FontAwesomeIcon icon={faTimes} style={tailwind('text-red-900')} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View>
                        <View style={tailwind('flex flex-row border-b border-gray-100')}>
                            <TouchableOpacity onPress={onLaunchCamera} style={tailwind('px-4 py-5 flex flex-row items-center justify-center')}>
                                <Text style={tailwind('text-blue-500 font-semibold text-lg')}>Take Photo</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={tailwind('flex flex-row w-full border-b border-gray-100')}>
                            <TouchableOpacity onPress={onLaunchImageLibrary} style={tailwind('px-4 py-5 flex flex-row items-center justify-center')}>
                                <Text style={tailwind('text-blue-500 font-semibold text-lg')}>Choose from Library</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={tailwind('flex flex-row w-full border-b border-gray-100')}>
                            <TouchableOpacity onPress={() => actionSheetRef.current?.hide()} style={tailwind('px-4 py-5 flex flex-row items-center justify-center')}>
                                <Text style={tailwind('text-red-500 font-semibold text-lg')}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ActionSheet>
        </View>
    );
};

export default PhotoUpload;
