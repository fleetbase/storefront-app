// index.native.tsx
import './src/env';
import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import 'react-native-get-random-values';
import 'react-native-gesture-handler';

// Refusals the app already handles and shows to the customer, which the Storefront SDK also
// logs with console.error (in development that opens the red error overlay).
LogBox.ignoreLogs(['Error fetching service quotes']);

AppRegistry.registerComponent(appName, () => App);
