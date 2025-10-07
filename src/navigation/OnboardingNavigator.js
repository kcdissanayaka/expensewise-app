import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Onboarding screens
import SplashScreen from '../features/onboarding/screens/SplashScreen';
import WelcomeCarouselScreen from '../features/onboarding/screens/WelcomeCarouselScreen';
import GoalSettingScreen from '../features/onboarding/screens/GoalSettingScreen';
import IncomeSetupScreen from '../features/onboarding/screens/IncomeSetupScreen';
import ExpenseSetupScreen from '../features/onboarding/screens/ExpenseSetupScreen';
// import AllocationSetupScreen from '../features/onboarding/screens/AllocationSetupScreen';
// import PreferencesSetupScreen from '../features/onboarding/screens/PreferencesSetupScreen';
// import OnboardingCompleteScreen from '../features/onboarding/screens/OnboardingCompleteScreen';

const Stack = createStackNavigator();

const OnboardingNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' }
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="WelcomeCarousel" component={WelcomeCarouselScreen} />
      <Stack.Screen name="GoalSetting" component={GoalSettingScreen} />
      <Stack.Screen name="IncomeSetup" component={IncomeSetupScreen} />
      <Stack.Screen name="ExpenseSetup" component={ExpenseSetupScreen} />
      {/* 
      <Stack.Screen name="AllocationSetup" component={AllocationSetupScreen} />
      <Stack.Screen name="PreferencesSetup" component={PreferencesSetupScreen} />
      <Stack.Screen name="OnboardingComplete" component={OnboardingCompleteScreen} /> */}
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;