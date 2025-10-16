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
      console.log('Starting authentication check...');
      
      // First, try to restore session from AsyncStorage
      const restoredUser = await authService.restoreSession();
      console.log('Restored user:', restoredUser);
      
      // Check if user is logged in
      const isLoggedIn = await authService.isLoggedIn();
      console.log('Is logged in:', isLoggedIn);

      // Check current token and user data
      const token = await authService.getToken();
      const currentUser = authService.getCurrentUser();
      console.log('Token exists:', !!token);
      console.log('Current user exists:', !!currentUser);
      
      if (!isLoggedIn) {
        console.log('Not logged in - clearing onboarding flags and going to Login');
        // Not logged in, clear any onboarding completion flags and show login screen
        await AsyncStorage.removeItem('onboarding_completed');
        await AsyncStorage.removeItem('onboarding_current_step');
        setInitialRoute('Login');
      } else {
        console.log('User is logged in - checking onboarding status');
        // User is logged in, check if onboarding is complete
        const isOnboardingComplete = await onboardingService.isOnboardingComplete();
        console.log('Onboarding complete:', isOnboardingComplete);

        if (isOnboardingComplete) {
          console.log('Going to Dashboard');
          // Onboarding is complete, go directly to dashboard
          setInitialRoute('Dashboard');
        } else {
          console.log('Existing user without onboarding flag - marking as complete and going to Dashboard');
          // For existing logged-in users, mark onboarding as complete and go to dashboard
          // This handles cases where users logged in before onboarding tracking was implemented
          await onboardingService.completeOnboarding();
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