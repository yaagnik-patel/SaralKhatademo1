import { AppRegistry, Platform } from 'react-native';
import App from './App';

// ✅ Manually match the name in app.json: "SaralKhata"
const appName = 'main';

if (Platform.OS === 'web') {
  require('./global.css');
}

AppRegistry.registerComponent(appName, () => App);

if (Platform.OS === 'web') {
  AppRegistry.runApplication(appName, {
    initialProps: {},
    rootTag: document.getElementById('root'),
  });
}
