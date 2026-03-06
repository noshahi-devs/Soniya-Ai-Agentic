import { SafeAreaProvider } from 'react-native-safe-area-context';
import AgentHomeScreen from './src/screens/AgentHomeScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <AgentHomeScreen />
    </SafeAreaProvider>
  );
}
