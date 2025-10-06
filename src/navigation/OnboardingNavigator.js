import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { 
  SplashScreen, 
  WelcomeCarouselScreen, 
  GoalSettingScreen,
  IncomeSetupScreen
} from '../features/onboarding';

const Stack = createStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="WelcomeCarousel" component={WelcomeCarouselScreen} />
      <Stack.Screen name="GoalSetting" component={GoalSettingScreen} />
      <Stack.Screen name="IncomeSetup" component={IncomeSetupScreen} />
      {/* Add other screens here once you create them */}
    </Stack.Navigator>
  );
}