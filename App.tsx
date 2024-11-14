import React from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme } from 'tamagui';
import { PortalProvider, PortalHost } from '@gorhom/portal';
import useTheme from './src/hooks/use-theme';
import AppNavigator from './src/navigation/AppNavigator';
import config from './tamagui.config';

function App(): React.JSX.Element {
    const { theme } = useTheme();
    console.log('App');

    return (
        <TamaguiProvider config={config}>
            <PortalProvider>
                <Theme name={theme}>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                        <AppNavigator />
                    </GestureHandlerRootView>
                </Theme>
                <PortalHost name='MainPortal' />
                <PortalHost name='LocationPickerPortal' />
            </PortalProvider>
        </TamaguiProvider>
    );
}

export default App;
