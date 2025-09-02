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
    options: ({ route }) => {
        const params = route.params || {};
        const title = params.text ?? 'Hello World';
        const count = params.count ?? 0;

        return {
            title: `${title}: ${count}`,
        };
    },
};

const CoreStack = {
    Boot,
    Test,
};

export default CoreStack;
