import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Boot } from './stacks/CoreStack';
import { AddNewLocation, AddressBook, EditLocation, EditLocationCoord, LocationPermission, LocationPicker } from './stacks/LocationStack';
import { OrderChat, OrderModal, Receipt, StoreReviews, WriteReview } from './stacks/OrderStack';
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
        // An order opened from a notification, and what it links to: the chat with the
        // driver or store, the receipt and reviews. Registered here so they resolve from the
        // root modal in either edition.
        OrderModal,
        OrderChat,
        Receipt,
        StoreReviews,
        WriteReview,
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
