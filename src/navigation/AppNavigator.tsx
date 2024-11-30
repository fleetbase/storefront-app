import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getTheme } from '../utils';
import { Boot } from './stacks/CoreStack';
import { LocationPermission } from './stacks/LocationStack';
import StoreNavigator from './StoreNavigator';
import NetworkHomeScreen from '../screens/NetworkHomeScreen';

const RootStack = createNativeStackNavigator({
    initialRouteName: 'Boot',
    screens: {
        Boot,
        LocationPermission,
        NetworkHome: {
            screen: NetworkHomeScreen,
            options: ({ route }) => {
                return {
                    title: route.params.info.name,
                    headerBackVisible: false,
                    headerBackButtonMenuEnabled: false,
                    headerBlurEffect: 'regular',
                    gestureEnabled: false,
                    animation: 'none',
                };
            },
        },
        StoreNavigator: {
            screen: StoreNavigator,
            options: { headerShown: false, gestureEnabled: false, animation: 'none' },
        },
    },
});

const AppNavigator = createStaticNavigation(RootStack);
export default AppNavigator;
