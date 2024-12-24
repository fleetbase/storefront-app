import { LogBox } from 'react-native';

if (__DEV__) {
    const ignoreWarns = ['No stops in gradient'];

    const warn = console.warn;
    console.warn = (...arg) => {
        for (const warning of ignoreWarns) {
            if (arg[0].startsWith(warning)) {
                return;
            }
        }
        warn(...arg);
    };

    LogBox.ignoreLogs(ignoreWarns);
}
