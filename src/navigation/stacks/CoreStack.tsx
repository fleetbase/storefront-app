import BootScreen from '../../screens/BootScreen';
import TestScreen from '../../screens/TestScreen';

export const Boot = {
    screen: BootScreen,
    options: {
        headerShown: false,
        gestureEnabled: false,
        animation: 'none',
    },
};

export const Test = {
    screen: TestScreen,
};

const CoreStack = {
    Boot,
    Test,
};

export default CoreStack;
