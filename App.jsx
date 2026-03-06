import { SafeAreaProvider } from 'react-native-safe-area-context';
import AgentStepTwoScreen from './src/screens/AgentStepTwoScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <AgentStepTwoScreen />
    </SafeAreaProvider>
  );
}
