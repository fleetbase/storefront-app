import BootScreen from '../../screens/BootScreen';

export const Boot = {
    screen: BootScreen,
    options: {
        headerShown: false,
        gestureEnabled: false,
        animation: 'none',
    },
};

const CoreStack = {
    Boot,
};

export default CoreStack;
