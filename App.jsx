import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SoniyaCompanionScreen from './src/screens/SoniyaCompanionScreen';
import SoniyaSplashScreen from './src/screens/SoniyaSplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }, 2300);

    return () => clearTimeout(timer);
  }, [splashOpacity]);

  return (
    <SafeAreaProvider>
      <SoniyaCompanionScreen />
      {showSplash ? (
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: splashOpacity }]}>
          <SoniyaSplashScreen />
        </Animated.View>
      ) : null}
    </SafeAreaProvider>
  );
}
