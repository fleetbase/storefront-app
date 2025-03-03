import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme, useTheme, View, Text } from 'tamagui';
import { Toasts } from '@backpackapp-io/react-native-toast';
import { PortalProvider, PortalHost } from '@gorhom/portal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketClusterProvider } from './src/contexts/SocketClusterContext';
import { CartProvider } from './src/contexts/CartContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useThemeContext } from './src/contexts/ThemeContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { getDefaultStyle as getDefaultToastStyle } from './src/utils/toast';
import config from './tamagui.config';

function AppContent(): React.JSX.Element {
    const { appTheme } = useThemeContext();

    return (
        <TamaguiProvider config={config} theme={appTheme}>
            <Theme name={appTheme}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <SafeAreaProvider>
                        <NotificationProvider>
                            <LanguageProvider>
                                <AuthProvider>
                                    <SocketClusterProvider>
                                        <CartProvider>
                                            <View flex={1} alignItems='center' justifyContent='center'>
                                                <Text>Hello World</Text>
                                            </View>
                                            <AppNavigator />
                                            {/* <Toasts extraInsets={{ bottom: 80 }} defaultStyle={getDefaultToastStyle()} /> */}
                                            <PortalHost name='MainPortal' />
                                            <PortalHost name='BottomSheetPanelPortal' />
                                            <PortalHost name='LocationPickerPortal' />
                                        </CartProvider>
                                    </SocketClusterProvider>
                                </AuthProvider>
                            </LanguageProvider>
                        </NotificationProvider>
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
