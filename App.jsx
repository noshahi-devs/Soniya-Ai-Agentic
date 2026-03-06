import { SafeAreaProvider } from 'react-native-safe-area-context';
import SoniyaCompanionScreen from './src/screens/SoniyaCompanionScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <SoniyaCompanionScreen />
    </SafeAreaProvider>
  );
}
