import BackButton from '../../components/BackButton';
import { PortalHost } from '@gorhom/portal';
import { getTheme } from '../../utils';
import { screenSlot } from '../../extensions';

export const StoreHome = {
    screen: screenSlot('store.home'),
    options: ({ route }) => {
        return {
            headerShown: false,
        };
    },
};

export const StoreCategory = {
    screen: screenSlot('catalog.category'),
    options: ({ route, navigation }) => {
        return {
            title: route.params?.category?.name ?? '',
            headerTitleAlign: 'left',
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
            headerTransparent: true,
            headerShadowVisible: false,
            headerLeft: () => {
                return <BackButton onPress={() => navigation.goBack()} />;
            },
            headerRight: () => {
                return <PortalHost name='LoadingIndicatorPortal' />;
            },
        };
    },
};

export const StoreMap = {
    screen: screenSlot('store.map'),
    options: ({ route }) => {
        return {
            headerShown: false,
        };
    },
};

export const StoreSearch = {
    screen: screenSlot('store.search'),
    options: ({ route }) => {
        return {
            headerShown: false,
        };
    },
};

export const StoreInfo = {
    screen: screenSlot('store.info'),
    options: ({ route }) => {
        return {
            presentation: 'modal',
            headerShown: false,
        };
    },
};

const StoreStack = {
    StoreHome,
    StoreMap,
    StoreSearch,
    StoreCategory,
    StoreInfo,
};

export default StoreStack;
