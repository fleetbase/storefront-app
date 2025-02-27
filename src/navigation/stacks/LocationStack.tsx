import LocationPermissionScreen from '../../screens/LocationPermissionScreen';
import LocationPickerScreen from '../../screens/LocationPickerScreen';
import SavedLocationsScreen from '../../screens/SavedLocationsScreen';
import AddNewLocationScreen from '../../screens/AddNewLocationScreen';
import EditLocationScreen from '../../screens/EditLocationScreen';
import EditLocationCoordScreen from '../../screens/EditLocationCoordScreen';
import AddressBookScreen from '../../screens/AddressBookScreen';
import BackButton from '../../components/BackButton';
import HeaderButton from '../../components/HeaderButton';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { getTheme } from '../../utils';
import { useLanguage } from '../../contexts/LanguageContext';

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
        const { t } = useLanguage();
        return {
            title: t('AddressBookScreen.addressBook'),
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
            headerTransparent: true,
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} size={40} />,
            headerRight: () => <HeaderButton icon={faPlus} onPress={() => navigation.navigate('AddNewLocation', { redirectTo: 'AddressBook' })} size={40} />,
        };
    },
};

export const AddNewLocation = {
    screen: AddNewLocationScreen,
    options: {
        headerShown: false,
    },
};

export const EditLocationCoord = {
    screen: EditLocationCoordScreen,
    options: ({ route, navigation }) => {
        return {
            title: `${route.params.place.name}`,
            headerTransparent: true,
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} size={40} />,
        };
    },
};

export const EditLocation = {
    screen: EditLocationScreen,
    options: ({ navigation, route }) => {
        return {
            title: route.params.place.street1,
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
            headerTransparent: true,
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} size={40} />,
        };
    },
};

export const LocationPicker = {
    screen: LocationPickerScreen,
    options: ({ navigation }) => {
        const { t } = useLanguage();
        return {
            title: t('LocationPickerScreen.chooseDeliveryLocation'),
            headerTitleStyle: {
                color: getTheme('textPrimary'),
            },
            headerLeft: () => <BackButton onPress={() => navigation.goBack()} size={40} />,
            headerTransparent: true,
        };
    },
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
