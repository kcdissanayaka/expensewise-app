import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'onboarding_completed';

/**
 * Return true if onboarding is already completed.
 */
async function isOnboardingComplete() {
  try {
    const val = await AsyncStorage.getItem(KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark onboarding as completed.
 */
async function setOnboardingComplete() {
  await AsyncStorage.setItem(KEY, 'true');
}

/**
 * Optional helper for testing: clear the flag.
 */
async function resetOnboarding() {
  await AsyncStorage.removeItem(KEY);
}

// Add these new methods:

/**
 * Get financial goals options for GoalSettingScreen
 */
function getFinancialGoalsOptions() {
  return [
    {
      id: 'save_money',
      title: 'Save More Money',
      description: 'Build an emergency fund and save for future goals',
      icon: '💰',
      color: '#00B894'
    },
    {
      id: 'track_spending',
      title: 'Track My Spending',
      description: 'Understand where my money goes each month',
      icon: '📊',
      color: '#0984E3'
    },
    {
      id: 'budget_planning',
      title: 'Create a Budget',
      description: 'Plan and stick to a monthly budget',
      icon: '📋',
      color: '#6C5CE7'
    },
    {
      id: 'debt_reduction',
      title: 'Pay Off Debt',
      description: 'Create a plan to become debt-free',
      icon: '💳',
      color: '#E84393'
    }
  ];
}

/**
 * Save selected financial goals
 */
async function saveFinancialGoals(goals) {
  try {
    await AsyncStorage.setItem('user_financial_goals', JSON.stringify(goals));
    return true;
  } catch (error) {
    console.error('Error saving financial goals:', error);
    return false;
  }
}

/**
 * Save current onboarding step
 */
async function saveCurrentStep(step) {
  try {
    await AsyncStorage.setItem('onboarding_current_step', step.toString());
  } catch (error) {
    console.error('Error saving onboarding step:', error);
  }
}

/**
 * Get current onboarding step
 */
async function getCurrentStep() {
  try {
    const step = await AsyncStorage.getItem('onboarding_current_step');
    return step ? parseInt(step) : 1;
  } catch (error) {
    return 1;
  }
}

/**
 * Save income data
 */
async function saveIncomeData(incomeData) {
  try {
    // Store income data in AsyncStorage
    await AsyncStorage.setItem('user_income_data', JSON.stringify(incomeData));
    return true;
  } catch (error) {
    console.error('Error saving income data:', error);
    return false;
  }
}

export default {
  isOnboardingComplete,
  setOnboardingComplete,
  resetOnboarding,
  getFinancialGoalsOptions,
  saveFinancialGoals,
  saveCurrentStep,
  getCurrentStep,
  saveIncomeData
};