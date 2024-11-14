import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getTheme } from '../utils';
import BootScreen from '../screens/BootScreen';
import NetworkHomeScreen from '../screens/NetworkHomeScreen';
import StoreHomeScreen from '../screens/StoreHomeScreen';
import LocationPermissionScreen from '../screens/LocationPermissionScreen';
import LocationPickerScreen from '../screens/LocationPickerScreen';
import SavedLocationsScreen from '../screens/SavedLocationsScreen';
import AddNewLocationScreen from '../screens/AddNewLocationScreen';
import LocationPicker from '../components/LocationPicker';
import BackButton from '../components/BackButton';

const RootStack = createNativeStackNavigator({
    initialRouteName: 'Boot',
    screens: {
        Boot: {
            screen: BootScreen,
            options: {
                headerShown: false,
                gestureEnabled: false,
                animation: 'none',
            },
        },
        LocationPermission: {
            screen: LocationPermissionScreen,
            options: {
                headerShown: false,
                gestureEnabled: false,
                animation: 'none',
            },
        },
        SavedLocationsScreen: {
            screen: SavedLocationsScreen,
            options: {},
        },
        AddNewLocationScreen: {
            screen: AddNewLocationScreen,
            options: {
                headerShown: false,
            },
        },
        LocationPicker: {
            screen: LocationPickerScreen,
            options: ({ navigation }) => {
                return {
                    title: 'Choose delivery location',
                    headerLeft: () => <BackButton onPress={() => navigation.goBack()} size={30} />,
                    headerStyle: {
                        backgroundColor: getTheme('background'),
                    },
                };
            },
        },
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
        StoreHome: {
            screen: StoreHomeScreen,
            options: ({ route }) => {
                return {
                    // title: route.params.info.name,
                    title: '',
                    headerLeft: () => {
                        return <LocationPicker mt='$3' />;
                    },
                    headerShadowVisible: false,
                    headerBlurEffect: 'regular',
                    gestureEnabled: false,
                    animation: 'none',
                    headerStyle: {
                        backgroundColor: getTheme('background'),
                    },
                };
            },
        },
    },
});

const AppNavigator = createStaticNavigation(RootStack);
export default AppNavigator;
