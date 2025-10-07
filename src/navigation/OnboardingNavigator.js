import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {SplashScreen} from '../features/onboarding/screens/SplashScreen';
import WelcomeCarouselScreen from '../features/onboarding/screens/WelcomeCarouselScreen';
import ExpenseSetupScreen from '../features/onboarding/screens/ExpenseSetupScreen';


const Stack = createStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="WelcomeCarousel" component={WelcomeCarouselScreen} />
      <Stack.Screen name="GoalSetting" component={GoalSettingScreen} />
      <Stack.Screen
        name="ExpenseSetup"
        component={ExpenseSetupScreen}
        options={{ headerShown: false }}  
        />
      {/* Add other screens here once you create them */}
    </Stack.Navigator>
  );
}




