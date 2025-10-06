import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SplashScreen, WelcomeCarouselScreen } from '../features/onboarding';

const Stack = createStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="WelcomeCarousel" component={WelcomeCarouselScreen} />
    </Stack.Navigator>
  );
}
