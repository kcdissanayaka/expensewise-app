import React from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, DatabaseProvider } from './src/app/providers';
import AppNavigator from './src/navigation/AppNavigator';

// Completely disable LogBox error notifications (we use custom error UI)
LogBox.ignoreAllLogs(true);

// Override console.error to prevent LogBox from catching errors
const originalConsoleError = console.error;
console.error = (...args) => {
  // Only log to console, don't trigger LogBox
  if (__DEV__) {
    originalConsoleError(...args);
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DatabaseProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </DatabaseProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
