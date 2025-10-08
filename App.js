import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, DatabaseProvider } from './src/app/providers';
import AppNavigator from './src/navigation/AppNavigator';

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
