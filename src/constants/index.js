// App Constants
export const COLORS = {
  PRIMARY: '#2196F3',
  SECONDARY: '#FF9800',
  SUCCESS: '#4CAF50',
  ERROR: '#F44336',
  WARNING: '#FFC107',
  INFO: '#00BCD4'
};

export const CURRENCIES = {
  USD: '$',
  LKR: 'Rs.',
  EUR: '€',
  GBP: '£'
};

export const DEFAULT_DB_CATEGORIES = [
  { name: 'Food & Dining', color: '#FF6B6B', icon: 'restaurant' },
  { name: 'Transportation', color: '#4ECDC4', icon: 'car' },
  { name: 'Shopping', color: '#45B7D1', icon: 'shopping-bag' },
  { name: 'Entertainment', color: '#FFA07A', icon: 'movie' },
  { name: 'Bills & Utilities', color: '#98D8C8', icon: 'receipt' },
  { name: 'Healthcare', color: '#F06292', icon: 'medical' },
  { name: 'Education', color: '#AED581', icon: 'school' },
  { name: 'Other', color: '#FFCC80', icon: 'folder' }
];

export const BUDGET_ALLOCATION = {
  NEEDS: 50,
  WANTS: 30,
  SAVINGS: 20
};

export const DEFAULT_EXPENSE_CATEGORIES = [
  { category: 'House Rent', amount: '', icon: '🏠', type: 'needs' },
  { category: 'Food & Dining', amount: '', icon: '🍽️', type: 'needs' },
  { category: 'Transportation', amount: '', icon: '🚗', type: 'needs' },
  { category: 'Utilities', amount: '', icon: '💡', type: 'needs' },
  { category: 'Healthcare', amount: '', icon: '🏥', type: 'needs' },
  { category: 'Entertainment', amount: '', icon: '🎬', type: 'wants' },
  { category: 'Shopping', amount: '', icon: '🛍️', type: 'wants' },
  { category: 'Dining Out', amount: '', icon: '🍕', type: 'wants' },
  { category: 'Emergency Fund', amount: '', icon: '🚨', type: 'savings' },
  { category: 'Investment', amount: '', icon: '📈', type: 'savings' }
];