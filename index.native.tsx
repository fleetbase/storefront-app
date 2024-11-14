// index.native.tsx
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

console.log('EntryPoint');

AppRegistry.registerComponent(appName, () => App);
