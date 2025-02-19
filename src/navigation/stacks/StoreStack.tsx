import StoreHomeScreen from '../../screens/StoreHomeScreen';
import StoreMapScreen from '../../screens/StoreMapScreen';
import StoreSearchScreen from '../../screens/StoreSearchScreen';
import StoreCategoryScreen from '../../screens/StoreCategoryScreen';
import StoreInfoScreen from '../../screens/StoreInfoScreen';
import BackButton from '../../components/BackButton';
import { PortalHost } from '@gorhom/portal';
import { getTheme } from '../../utils';

export const StoreHome = {
    screen: StoreHomeScreen,
    options: ({ route }) => {
        return {
            headerShown: false,
        };
    },
};

export const StoreCategory = {
    screen: StoreCategoryScreen,
    options: ({ route, navigation }) => {
        return {
            title: route.params.category.name,
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
    screen: StoreMapScreen,
    options: ({ route }) => {
        return {
            headerShown: false,
        };
    },
};

export const StoreSearch = {
    screen: StoreSearchScreen,
    options: ({ route }) => {
        return {
            headerShown: false,
        };
    },
};

export const StoreInfo = {
    screen: StoreInfoScreen,
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
