import LocationPermissionScreen from '../../screens/LocationPermissionScreen';
import LocationPickerScreen from '../../screens/LocationPickerScreen';
import SavedLocationsScreen from '../../screens/SavedLocationsScreen';
import AddNewLocationScreen from '../../screens/AddNewLocationScreen';
import EditLocationScreen from '../../screens/EditLocationScreen';
import AddressBookScreen from '../../screens/AddressBookScreen';
import BackButton from '../../components/BackButton';
import HeaderButton from '../../components/HeaderButton';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { getTheme } from '../../utils';

export const LocationPermission = {
    screen: LocationPermissionScreen,
    options: {
        headerShown: false,
        gestureEnabled: false,
        animation: 'none',
    },
};

export const SavedLocations = {
    screen: SavedLocationsScreen,
    options: {},
};

export const AddressBook = {
    screen: AddressBookScreen,
    options: ({ navigation, route }) => {
        return {
            title: 'Address Book',
            headerTransparent: true,
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} size={40} />,
            headerRight: () => <HeaderButton icon={faPlus} onPress={() => navigation.navigate('AddNewLocation', { redirectTo: 'AddressBook' })} size={40} />,
            headerBlurEffect: 'light',
        };
    },
};

export const AddNewLocation = {
    screen: AddNewLocationScreen,
    options: {
        headerShown: false,
    },
};

export const EditLocation = {
    screen: EditLocationScreen,
    options: ({ navigation, route }) => {
        return {
            title: route.params.place.street1,
            headerTransparent: true,
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} size={40} />,
            headerBlurEffect: 'light',
        };
    },
};

export const LocationPicker = {
    screen: LocationPickerScreen,
    options: ({ navigation }) => {
        return {
            title: 'Choose delivery location',
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} size={40} />,
            headerTransparent: true,
            headerBlurEffect: 'light',
        };
    },
};

const LocationStack = {
    LocationPermission,
    SavedLocations,
    AddNewLocation,
    EditLocation,
    LocationPicker,
    AddressBook,
};

export default LocationStack;
