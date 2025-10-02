import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as defaultTheme } from '../../theme';

const ThemeContext = createContext({});

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(defaultTheme);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme_preference');
      if (savedTheme) {
        const isDark = savedTheme === 'dark';
        setIsDarkMode(isDark);
        setCurrentTheme(isDark ? getDarkTheme() : defaultTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDarkTheme = () => ({
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      primary: '#64B5F6',
      background: '#121212',
      surface: '#1E1E1E',
      text: '#FFFFFF',
      textSecondary: '#B0B0B0',
    }
  });

  const toggleTheme = async () => {
    try {
      const newIsDark = !isDarkMode;
      setIsDarkMode(newIsDark);
      setCurrentTheme(newIsDark ? getDarkTheme() : defaultTheme);
      
      await AsyncStorage.setItem('theme_preference', newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const contextValue = {
    theme: currentTheme,
    isDarkMode,
    toggleTheme,
    isLoading
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

export default ThemeProvider;