import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme, useTheme } from 'tamagui';
import { Toasts } from '@backpackapp-io/react-native-toast';
import { PortalProvider, PortalHost } from '@gorhom/portal';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketClusterProvider } from './src/contexts/SocketClusterContext';
import { CartProvider } from './src/contexts/CartContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import StoreSwitchHost from './src/components/StoreSwitchHost';
import { AppScreenRegistryProvider } from './src/extensions/app-screen-registry';
import { BrandingProvider, useBranding } from './src/branding/BrandingProvider';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { StorefrontRuntimeProvider, useStorefrontRuntime } from './src/contexts/StorefrontRuntimeContext';
import { useLanguage } from './src/contexts/LanguageContext';
import { createWebLinking, titleKeyForRoute } from './src/navigation/web-linking';
import { getDefaultStyle as getDefaultToastStyle } from './src/utils/toast';
import config from './tamagui.config';
import { getBuildBranding } from './src/branding/build-branding';
import { registerBrandFonts } from './src/branding/fonts';

// Brand fonts (brand/fonts) are registered with @font-face before the first render.
registerBrandFonts(getBuildBranding().branding.typography);

// URLs for the pages (see web-linking.ts). The host page's title (the store's name) is the
// title of the home page and follows every other page's.
const linking = createWebLinking();
const SITE_TITLE = typeof document !== 'undefined' ? document.title : '';

function WebAppNavigator() {
    const { t } = useLanguage();
    const { mode, ownerInfo } = useStorefrontRuntime();
    const siteTitle = ownerInfo?.name || SITE_TITLE;
    const documentTitle = {
        formatter: (options: any, route: any) => {
            const key = titleKeyForRoute(route?.name, mode === 'network' ? 'network' : 'store');
            const page = (typeof options?.title === 'string' && options.title) || (key ? t(key) : '');
            return page && page !== siteTitle ? `${page} · ${siteTitle}` : siteTitle;
        },
    };
    return <AppNavigator linking={linking} documentTitle={documentTitle} />;
}

// The page around the app's column on wide screens takes the app's background (global.css).
function PageBackground() {
    const theme = useTheme();
    const background = theme.background?.val;
    useEffect(() => {
        if (typeof document !== 'undefined' && background) document.documentElement.style.setProperty('--app-page-background', background);
    }, [background]);
    return null;
}

function AppContent(): React.JSX.Element {
    const { themeName: appTheme } = useBranding();

    return (
        <TamaguiProvider config={config} defaultTheme={appTheme} disableInjectCSS={true}>
            <Theme name={appTheme}>
                <PageBackground />
                <GestureHandlerRootView style={{ flex: 1, width: '100%', height: '100%' }}>
                    <SafeAreaProvider>
                        <NotificationProvider>
                            <LanguageProvider>
                                <StorefrontRuntimeProvider>
                                    <AuthProvider>
                                        <SocketClusterProvider>
                                            <CartProvider>
                                                <AppScreenRegistryProvider>
                                                    <WebAppNavigator />
                                                    <StoreSwitchHost />
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
