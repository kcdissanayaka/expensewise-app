// App Configuration
export const CONFIG = {
  DATABASE_NAME: 'expensewise.db',
  DATABASE_VERSION: 1,
  DEFAULT_CURRENCY: 'EUR',
  DATE_FORMAT: 'YYYY-MM-DD',
  CHART_COLORS: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://localhost:3000/api'  // Local development
    : 'https://production-api.com/api',  // Production
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  API_VERSION: 'v1'
};