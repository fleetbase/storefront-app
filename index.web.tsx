import 'leaflet/dist/leaflet.css';
import { AppRegistry } from 'react-native';
import App from './App.web';
import { name as appName } from './app.json';
import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');

if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
}
