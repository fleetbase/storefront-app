import LocationPermissionScreen from '../../screens/LocationPermissionScreen';
import LocationPickerScreen from '../../screens/LocationPickerScreen';
import SavedLocationsScreen from '../../screens/SavedLocationsScreen';
import AddNewLocationScreen from '../../screens/AddNewLocationScreen';
import EditLocationScreen from '../../screens/EditLocationScreen';
import AddressBookScreen from '../../screens/AddressBookScreen';

// The address screens draw their own headers.
const ownHeader = { headerShown: false };

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
    options: ownHeader,
};

/** Address search. */
export const AddNewLocation = {
    screen: AddNewLocationScreen,
    options: ownHeader,
};

/** Map pin: place a new address, or move the pin of one being edited. */
export const LocationPicker = {
    screen: LocationPickerScreen,
    options: ownHeader,
};

/** Kept for links to the old "move the pin" screen; it is the map pin in adjust mode. */
export const EditLocationCoord = {
    screen: LocationPickerScreen,
    options: ownHeader,
};

export const EditLocation = {
    screen: EditLocationScreen,
    options: ownHeader,
};

const LocationStack = {
    LocationPermission,
    SavedLocations,
    AddNewLocation,
    EditLocation,
    EditLocationCoord,
    LocationPicker,
    AddressBook,
};

export default LocationStack;
