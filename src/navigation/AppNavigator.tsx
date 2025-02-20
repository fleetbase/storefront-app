import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getTheme } from '../utils';
import { Boot } from './stacks/CoreStack';
import { LocationPermission, LocationPicker, EditLocation, EditLocationCoord } from './stacks/LocationStack';
import { OrderModal } from './stacks/OrderStack';
import StoreNavigator from './StoreNavigator';
import NetworkHomeScreen from '../screens/NetworkHomeScreen';

const RootStack = createNativeStackNavigator({
    initialRouteName: 'Boot',
    screens: {
        Boot,
        LocationPermission,
        LocationPicker,
        EditLocation,
        EditLocationCoord,
        OrderModal,
        NetworkHome: {
            screen: NetworkHomeScreen,
            options: { headerShown: false, gestureEnabled: false, animation: 'none' },
        },
        StoreNavigator: {
            screen: StoreNavigator,
            options: { headerShown: false, gestureEnabled: false, animation: 'none' },
        },
    },
});

const AppNavigator = createStaticNavigation(RootStack);
export default AppNavigator;
