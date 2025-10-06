import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, StatusBar } from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // intro anim
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 5, useNativeDriver: true }),
    ]).start();

    // loading dots loop
    const loopDots = () => {
      Animated.sequence([
        Animated.timing(dotAnim1, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(dotAnim2, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(dotAnim3, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(dotAnim1, { toValue: 0, duration: 180, useNativeDriver: true }),
          Animated.timing(dotAnim2, { toValue: 0, duration: 180, useNativeDriver: true }),
          Animated.timing(dotAnim3, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]),
      ]).start(() => loopDots());
    };
    const dotTimer = setTimeout(loopDots, 900);

    // after a short delay, ALWAYS go to onboarding carousel
    const navigationTimer = setTimeout(() => {
      navigation.replace('WelcomeCarousel');
    }, 2000);

    return () => {
      clearTimeout(dotTimer);
      clearTimeout(navigationTimer);
    };
  }, [navigation, fadeAnim, scaleAnim, dotAnim1, dotAnim2, dotAnim3]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>💰</Text>
          <Text style={[styles.appName, { color: '#fff' }]}>ExpenseWise</Text>
          <Text style={[styles.tagline, { color: '#fff' }]}>Track  •  Plan  •  Save</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingDot, { backgroundColor: '#fff', opacity: dotAnim1 }]} />
          <Animated.View style={[styles.loadingDot, { backgroundColor: '#fff', opacity: dotAnim2 }]} />
          <Animated.View style={[styles.loadingDot, { backgroundColor: '#fff', opacity: dotAnim3 }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' },
  content: { 
    alignItems: 'center' },
  logoContainer: {
    alignItems: 'center', 
    marginBottom: 50 },
  logoIcon: { fontSize: 80,
    marginBottom: 20 },
  appName: { fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8 },
  tagline: { fontSize: 16,
    fontWeight: '400',
    opacity: 0.95,
    letterSpacing: 0.5 },
  loadingContainer: {
    flexDirection: 'row' },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4 },
});
