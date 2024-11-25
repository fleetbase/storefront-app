import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme } from 'tamagui';
import { Toasts } from '@backpackapp-io/react-native-toast';
import { PortalProvider, PortalHost } from '@gorhom/portal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import useTheme from './src/hooks/use-theme';
import AppNavigator from './src/navigation/AppNavigator';
import config from './tamagui.config';

function App(): React.JSX.Element {
    const { theme } = useTheme();

    return (
        <TamaguiProvider config={config}>
            <PortalProvider>
                <Theme name={theme}>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                        <PortalProvider>
                            <SafeAreaProvider>
                                <AppNavigator />
                                <Toasts extraInsets={{ bottom: 80 }} />
                                <PortalHost name='MainPortal' />
                                <PortalHost name='BottomSheetPanelPortal' />
                                <PortalHost name='LocationPickerPortal' />
                            </SafeAreaProvider>
                        </PortalProvider>
                    </GestureHandlerRootView>
                </Theme>
            </PortalProvider>
        </TamaguiProvider>
    );
}

export default App;
