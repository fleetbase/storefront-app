import React from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme } from 'tamagui';
import { Toasts } from '@backpackapp-io/react-native-toast';
import { PortalProvider, PortalHost } from '@gorhom/portal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketClusterProvider } from './src/contexts/SocketClusterContext';
import { CartProvider } from './src/contexts/CartContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { TestTabNavigator } from './src/navigation/TestNavigator';
import { ThemeProvider, useThemeContext } from './src/contexts/ThemeContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { StorefrontRuntimeProvider } from './src/contexts/StorefrontRuntimeContext';
import { getDefaultStyle as getDefaultToastStyle } from './src/utils/toast';
import config from './tamagui.config';

const DEBUG_APP = false;
function AppContent(): React.JSX.Element {
    const { appTheme } = useThemeContext();

    return (
        <TamaguiProvider config={config} theme={appTheme}>
            <Theme name={appTheme}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <SafeAreaProvider>
                        <BottomSheetModalProvider>
                            <NotificationProvider>
                                <LanguageProvider>
                                    <StorefrontRuntimeProvider>
                                        <AuthProvider>
                                            <SocketClusterProvider>
                                                <CartProvider>
                                                    <AppNavigator />
                                                    <Toasts extraInsets={{ bottom: Platform.OS === 'android' ? 25 : 80 }} defaultStyle={getDefaultToastStyle()} />
                                                    <PortalHost name='MainPortal' />
                                                    <PortalHost name='BottomSheetPanelPortal' />
                                                    <PortalHost name='LocationPickerPortal' />
                                                </CartProvider>
                                            </SocketClusterProvider>
                                        </AuthProvider>
                                    </StorefrontRuntimeProvider>
                                </LanguageProvider>
                            </NotificationProvider>
                        </BottomSheetModalProvider>
                    </SafeAreaProvider>
                </GestureHandlerRootView>
            </Theme>
        </TamaguiProvider>
    );
}

function TestContent(): React.JSX.Element {
    const { appTheme } = useThemeContext();
    return (
        <TamaguiProvider config={config} theme={appTheme}>
            <Theme name={appTheme}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <SafeAreaProvider>
                        <BottomSheetModalProvider>
                            <NotificationProvider>
                                <LanguageProvider>
                                    <StorefrontRuntimeProvider>
                                        <AuthProvider>
                                            <SocketClusterProvider>
                                                <CartProvider>
                                                    <TestTabNavigator />
                                                    {/* <TestNavigator /> */}
                                                    <Toasts extraInsets={{ bottom: 80 }} defaultStyle={getDefaultToastStyle()} />
                                                    <PortalHost name='MainPortal' />
                                                    <PortalHost name='BottomSheetPanelPortal' />
                                                    <PortalHost name='LocationPickerPortal' />
                                                </CartProvider>
                                            </SocketClusterProvider>
                                        </AuthProvider>
                                    </StorefrontRuntimeProvider>
                                </LanguageProvider>
                            </NotificationProvider>
                        </BottomSheetModalProvider>
                    </SafeAreaProvider>
                </GestureHandlerRootView>
            </Theme>
        </TamaguiProvider>
    );
}

function App(): React.JSX.Element {
    if (DEBUG_APP) {
        return (
            <PortalProvider>
                <ThemeProvider>
                    <TestContent />
                </ThemeProvider>
            </PortalProvider>
        );
    }

    return (
        <PortalProvider>
            <ThemeProvider>
                <AppContent />
            </ThemeProvider>
        </PortalProvider>
    );
}

export default App;
