import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Boot } from './stacks/CoreStack';
import { AddNewLocation, AddressBook, EditLocation, EditLocationCoord, LocationPermission, LocationPicker } from './stacks/LocationStack';
import { OrderModal } from './stacks/OrderStack';
import StoreNavigator from './StoreNavigator';
import NetworkNavigator from './NetworkNavigator';

const RootStack = createNativeStackNavigator({
    initialRouteName: 'Boot',
    linking: { enabled: 'auto' },
    screens: {
        Boot,
        // The address flow, reachable from either edition.
        LocationPermission,
        AddNewLocation,
        LocationPicker,
        EditLocation,
        EditLocationCoord,
        AddressBook,
        OrderModal,
        NetworkNavigator: {
            screen: NetworkNavigator,
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
