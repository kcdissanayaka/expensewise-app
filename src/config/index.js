import { Platform } from 'react-native';

// API Configuration
const getApiBaseUrl = () => {
  if (!__DEV__) {
    return 'https://your-production-api.com/api'; // Production API URL
  }
  
  // Development environment
  if (Platform.OS === 'android') {
    // For Android emulator, use 10.0.2.2 to access host machine
    // For physical Android device, use your computer's network IP
    return 'http://10.0.2.2:3000/api';  // Android emulator
    // return 'http://192.168.1.210:3000/api';  // Physical device - uncomment if needed
  } else if (Platform.OS === 'ios') {
    // For iOS simulator, localhost works
    return 'http://localhost:3000/api';
  } else {
    // Web or other platforms
    return 'http://localhost:3000/api';
  }
};

// App Configuration
export const CONFIG = {
  // Database Configuration
  DATABASE_NAME: 'expensewise.db',
  DATABASE_VERSION: 1,
  
  // API Configuration
  API_BASE_URL: getApiBaseUrl(),
  API_TIMEOUT: 30000, // 30 seconds
  
  // App Settings
  DEFAULT_CURRENCY: 'EUR',
  DATE_FORMAT: 'YYYY-MM-DD',
  CHART_COLORS: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
  
  // Environment
  IS_DEVELOPMENT: __DEV__,
  PLATFORM: Platform.OS
};