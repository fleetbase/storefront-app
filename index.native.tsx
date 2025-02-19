// index.native.tsx
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { enableScreens } from 'react-native-screens';
import 'react-native-get-random-values';
import 'react-native-gesture-handler';

enableScreens();
AppRegistry.registerComponent(appName, () => App);
