import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme } from 'tamagui';
import { Toasts } from '@backpackapp-io/react-native-toast';
import { PortalProvider, PortalHost } from '@gorhom/portal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketClusterProvider } from './src/contexts/SocketClusterContext';
import { CartProvider } from './src/contexts/CartContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { AppScreenRegistryProvider } from './src/extensions/app-screen-registry';
import { BrandingProvider, useBranding } from './src/branding/BrandingProvider';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { StorefrontRuntimeProvider } from './src/contexts/StorefrontRuntimeContext';
import { getDefaultStyle as getDefaultToastStyle } from './src/utils/toast';
import config from './tamagui.config';

function AppContent(): React.JSX.Element {
    const { themeName: appTheme } = useBranding();

    return (
        <TamaguiProvider config={config} defaultTheme={appTheme} disableInjectCSS={true}>
            <Theme name={appTheme}>
                <GestureHandlerRootView style={{ flex: 1, width: '100%', height: '100%' }}>
                    <SafeAreaProvider>
                        <NotificationProvider>
                            <LanguageProvider>
                                <StorefrontRuntimeProvider>
                                    <AuthProvider>
                                        <SocketClusterProvider>
                                            <CartProvider>
                                                <AppScreenRegistryProvider>
                                                    <AppNavigator />
                                                </AppScreenRegistryProvider>
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
                    </SafeAreaProvider>
                </GestureHandlerRootView>
            </Theme>
        </TamaguiProvider>
    );
}

function App(): React.JSX.Element {
    return (
        <PortalProvider>
            <BrandingProvider>
                <AppContent />
            </BrandingProvider>
        </PortalProvider>
    );
}

export default App;
