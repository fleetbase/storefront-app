import StoreHomeScreen from '../../screens/StoreHomeScreen';
import StoreMapScreen from '../../screens/StoreMapScreen';
import StoreSearchScreen from '../../screens/StoreSearchScreen';
import StoreCategoryScreen from '../../screens/StoreCategoryScreen';
import BackButton from '../../components/BackButton';
import LocationPicker from '../../components/LocationPicker';
import { PortalHost } from '@gorhom/portal';
import { getTheme } from '../../utils';

export const StoreHome = {
    screen: StoreHomeScreen,
    options: ({ route }) => {
        return {
            title: '',
            headerLeft: () => {
                return (
                    <LocationPicker
                        triggerStyle={{ borderWidth: 1, backgroundColor: 'black', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3 }}
                        onPressAddNewLocation={(navigation) => navigation.navigate('StoreHomeTab', { screen: 'AddNewLocation' })}
                    />
                );
            },
            headerTransparent: true,
            headerShadowVisible: false,
            gestureEnabled: false,
            animation: 'none',
            headerStyle: {
                transform: [{ translateY: -15 }],
            },
        };
    },
};

export const StoreCategory = {
    screen: StoreCategoryScreen,
    options: ({ route, navigation }) => {
        return {
            title: route.params.category.name,
            headerTitleAlign: 'left',
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

const StoreStack = {
    StoreHome,
    StoreMap,
    StoreSearch,
    StoreCategory,
};

export default StoreStack;
