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

export default {
  isOnboardingComplete,
  setOnboardingComplete,
  resetOnboarding, // optional
};
