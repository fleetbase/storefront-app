import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme } from 'tamagui';
import { Toasts } from '@backpackapp-io/react-native-toast';
import { PortalProvider, PortalHost } from '@gorhom/portal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketClusterProvider } from './src/contexts/SocketClusterContext';
import { CartProvider } from './src/contexts/CartContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useThemeContext } from './src/contexts/ThemeContext';
import config from './tamagui.config';

function AppContent(): React.JSX.Element {
    const { appTheme } = useThemeContext();

    return (
        <TamaguiProvider config={config} theme={appTheme}>
            <Theme name={appTheme}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <SafeAreaProvider>
                        <BottomSheetModalProvider>
                            <AuthProvider>
                                <SocketClusterProvider>
                                    <CartProvider>
                                        <AppNavigator />
                                        <Toasts extraInsets={{ bottom: 80 }} />
                                        <PortalHost name='MainPortal' />
                                        <PortalHost name='BottomSheetPanelPortal' />
                                        <PortalHost name='LocationPickerPortal' />
                                    </CartProvider>
                                </SocketClusterProvider>
                            </AuthProvider>
                        </BottomSheetModalProvider>
                    </SafeAreaProvider>
                </GestureHandlerRootView>
            </Theme>
        </TamaguiProvider>
    );
}

function App(): React.JSX.Element {
    return (
        <PortalProvider>
            <ThemeProvider>
                <AppContent />
            </ThemeProvider>
        </PortalProvider>
    );
}

export default App;
