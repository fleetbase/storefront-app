import LocationPermissionScreen from '../../screens/LocationPermissionScreen';
import LocationPickerScreen from '../../screens/LocationPickerScreen';
import SavedLocationsScreen from '../../screens/SavedLocationsScreen';
import AddNewLocationScreen from '../../screens/AddNewLocationScreen';
import BackButton from '../../components/BackButton';
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

export const AddNewLocation = {
    screen: AddNewLocationScreen,
    options: {
        headerShown: false,
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
    LocationPicker,
};

export default LocationStack;
