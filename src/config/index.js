import { Platform } from 'react-native';

// API Configuration
// Using Google Cloud Run hosted backend
const getApiBaseUrl = () => {
  // Use Google Cloud hosted backend for all environments
  return 'https://expensewise-backend1-54x6yj5rca-ew.a.run.app/api';
  
  // Legacy local development URLs (commented out)
  // if (!__DEV__) {
  //   return 'https://your-production-api.com/api';
  // }
  // if (Platform.OS === 'android') {
  //   return 'http://10.0.2.2:3000/api';  // Android emulator
  // } else if (Platform.OS === 'ios') {
  //   return 'http://localhost:3000/api';
  // } else {
  //   return 'http://localhost:3000/api';
  // }
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