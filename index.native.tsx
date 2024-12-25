// index.native.tsx
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import 'react-native-get-random-values';

console.log('[index.native.tsx]');
AppRegistry.registerComponent(appName, () => App);
