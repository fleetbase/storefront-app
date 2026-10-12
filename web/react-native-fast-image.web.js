import React, { forwardRef } from 'react';
import { Image } from 'tamagui';

// Web stand-in for react-native-fast-image: a plain image, plus the static constants
// callers read (FastImage.resizeMode.contain, FastImage.priority.high, ...).
const FastImage = forwardRef(function FastImage(props, ref) {
    return <Image ref={ref} {...props} />;
});

FastImage.resizeMode = { contain: 'contain', cover: 'cover', stretch: 'stretch', center: 'center' };
FastImage.priority = { low: 'low', normal: 'normal', high: 'high' };
FastImage.cacheControl = { immutable: 'immutable', web: 'web', cacheOnly: 'cacheOnly' };
FastImage.preload = () => {};
FastImage.clearMemoryCache = () => Promise.resolve();
FastImage.clearDiskCache = () => Promise.resolve();

export default FastImage;
