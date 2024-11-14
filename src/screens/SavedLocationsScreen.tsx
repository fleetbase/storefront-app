import React, { useState, useRef, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { View, Button, Text, YStack, useTheme } from 'tamagui';
import { useNavigation } from '@react-navigation/native';

const SavedLocationsScreen = ({ route }) => {
    const navigation = useNavigation();
    const theme = useTheme();

    return <YStack flex={1} alignItems='center' justifyContent='center' bg='$surface' width='100%' height='100%'></YStack>;
};

export default SavedLocationsScreen;
