import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Auth screens
import LoginScreen from '../features/auth/screens/LoginScreen';
import SignUpScreen from '../features/auth/screens/SignUpScreen';
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen';

// Onboarding screens (for new users)
import OnboardingNavigator from './OnboardingNavigator';

// Main app (for existing users)
import TabNavigator from '../features/dashboard/navigation/TabNavigator';

import authService from '../services/auth/authService';
import onboardingService from '../features/onboarding/services/onboardingService';

const Stack = createStackNavigator();

const AuthNavigator = () => {
  const [initialRoute, setInitialRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthenticationState();
  }, []);

  const checkAuthenticationState = async () => {
    try {
      // Check if user is logged in
      const isLoggedIn = await authService.isLoggedIn();
      
      if (!isLoggedIn) {
        // Not logged in, show login screen
        setInitialRoute('Login');
      } else {
        // User is logged in, check if onboarding is complete
        const isOnboardingComplete = await onboardingService.isOnboardingComplete();
        
        if (!isOnboardingComplete) {
          // Process any temporary data that was saved during onboarding
          await onboardingService.processTemporaryData();
          
          // Check if user has gone through onboarding flow
          const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
          
          if (!onboardingCompleted) {
            // User hasn't completed onboarding, go to onboarding
            setInitialRoute('Onboarding');
          } else {
            // Onboarding marked as complete but data missing, go to dashboard anyway
            setInitialRoute('Dashboard');
          }
        } else {
          // Everything is complete, go to dashboard
          setInitialRoute('Dashboard');
        }
      }
    } catch (error) {
      console.error('Error checking authentication state:', error);
      setInitialRoute('Login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; 
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' }
      }}
    >
      {/* Authentication Screens */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      
      {/* Onboarding Flow */}
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      
      {/* Main App */}
      <Stack.Screen name="Dashboard" component={TabNavigator} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;