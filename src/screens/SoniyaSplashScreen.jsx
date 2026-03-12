import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const ORB_SIZE = Math.min(width * 0.72, 320);
const RING_SIZE = ORB_SIZE + 92;

const FONT_STACK = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: 'monospace',
});

export default function SoniyaSplashScreen() {
  const ringRotate = useRef(new Animated.Value(0)).current;
  const ringRotateAlt = useRef(new Animated.Value(0)).current;
  const orbPulse = useRef(new Animated.Value(0)).current;
  const floatShift = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ringLoop = Animated.loop(
      Animated.timing(ringRotate, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const ringAltLoop = Animated.loop(
      Animated.timing(ringRotateAlt, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(orbPulse, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatShift, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(floatShift, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ])
    );
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );

    ringLoop.start();
    ringAltLoop.start();
    pulseLoop.start();
    floatLoop.start();
    shimmerLoop.start();

    return () => {
      ringLoop.stop();
      ringAltLoop.stop();
      pulseLoop.stop();
      floatLoop.stop();
      shimmerLoop.stop();
    };
  }, [floatShift, orbPulse, ringRotate, ringRotateAlt, shimmer]);

  const ringSpin = useMemo(
    () => ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
    [ringRotate]
  );
  const ringSpinAlt = useMemo(
    () => ringRotateAlt.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }),
    [ringRotateAlt]
  );
  const orbScale = useMemo(
    () => orbPulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.04] }),
    [orbPulse]
  );
  const floatY = useMemo(
    () => floatShift.interpolate({ inputRange: [0, 1], outputRange: [4, -8] }),
    [floatShift]
  );
  const shimmerX = useMemo(
    () => shimmer.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] }),
    [shimmer]
  );

  const gridLines = Array.from({ length: 7 }, (_, i) => (
    <View key={`h-${i}`} style={[styles.gridLine, { top: 70 + i * 44 }]} />
  ));
  const gridCols = Array.from({ length: 6 }, (_, i) => (
    <View key={`v-${i}`} style={[styles.gridLineVertical, { left: 40 + i * 54 }]} />
  ));

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#040b18', '#101a2a', '#1a0f1f']} style={styles.background}>
        <View style={styles.grid}>{gridLines}{gridCols}</View>
        <View style={styles.glowLeft} />
        <View style={styles.glowRight} />

        <View style={styles.centerStage}>
          <Animated.View style={[styles.ring, { transform: [{ translateY: floatY }, { rotate: ringSpin }, { rotateX: '18deg' }] }]}>
            <View style={styles.ringEdge} />
          </Animated.View>
          <Animated.View style={[styles.ringAlt, { transform: [{ translateY: floatY }, { rotate: ringSpinAlt }, { rotateX: '-14deg' }] }]} />

          <Animated.View style={[styles.orbWrap, { transform: [{ translateY: floatY }, { scale: orbScale }] }]}>
            <LinearGradient
              colors={['rgba(120, 215, 255, 0.75)', 'rgba(39, 89, 144, 0.85)', 'rgba(10, 12, 22, 0.95)']}
              style={styles.orbGradient}
              start={{ x: 0.1, y: 0.1 }}
              end={{ x: 0.9, y: 0.9 }}
            />
            <View style={styles.orbCore} />
          </Animated.View>
        </View>

        <View style={styles.brandBlock}>
          <Text style={styles.brandEyebrow}>Soniya Agentic AI</Text>
          <Text style={styles.brandTitle}>SONIYA</Text>
          <Text style={styles.brandSubtitle}>Neural companion booting</Text>

          <View style={styles.dataStripe}>
            <Animated.View style={[styles.dataShimmer, { transform: [{ translateX: shimmerX }] }]} />
            <Text style={styles.dataText}>Local-first  Secure  Adaptive</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#040b18',
  },
  background: {
    flex: 1,
    paddingTop: 48,
    justifyContent: 'space-between',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(120, 214, 255, 0.3)',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(244, 160, 255, 0.2)',
  },
  glowLeft: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    left: -40,
    top: 120,
    backgroundColor: 'rgba(86, 247, 255, 0.18)',
  },
  glowRight: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    right: -70,
    top: 180,
    backgroundColor: 'rgba(255, 118, 199, 0.16)',
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(104, 217, 255, 0.4)',
  },
  ringEdge: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#88f6ff',
    right: 8,
    top: 48,
    shadowColor: '#88f6ff',
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 6,
  },
  ringAlt: {
    position: 'absolute',
    width: RING_SIZE - 50,
    height: RING_SIZE - 50,
    borderRadius: (RING_SIZE - 50) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 168, 227, 0.45)',
  },
  orbWrap: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#59e3ff',
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 12,
  },
  orbGradient: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
  },
  orbCore: {
    position: 'absolute',
    width: ORB_SIZE * 0.42,
    height: ORB_SIZE * 0.42,
    borderRadius: ORB_SIZE * 0.21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  brandBlock: {
    paddingHorizontal: 28,
    paddingBottom: 36,
  },
  brandEyebrow: {
    color: '#7be9ff',
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontFamily: FONT_STACK,
  },
  brandTitle: {
    marginTop: 10,
    fontSize: 36,
    color: '#f7f2ff',
    letterSpacing: 6,
    fontWeight: '700',
    fontFamily: FONT_STACK,
  },
  brandSubtitle: {
    marginTop: 6,
    color: '#c5d5e6',
    fontSize: 14,
    letterSpacing: 1.2,
    fontFamily: FONT_STACK,
  },
  dataStripe: {
    marginTop: 16,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(8, 12, 26, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  dataShimmer: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    width: 60,
    backgroundColor: 'rgba(120, 231, 255, 0.25)',
  },
  dataText: {
    color: '#d4ecff',
    fontSize: 11,
    letterSpacing: 1.1,
    fontFamily: FONT_STACK,
    textTransform: 'uppercase',
  },
});
