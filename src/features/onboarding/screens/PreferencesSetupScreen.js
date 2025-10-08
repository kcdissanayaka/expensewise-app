import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert
} from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import onboardingService from '../services/onboardingService';
import ProgressBar from '../components/ProgressBar';
import { CURRENCIES } from '../../../constants';

const PreferencesSetupScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [preferences, setPreferences] = useState({
    notifications: {
      dueReminder: true,
      allocationReminder: true,
      summary: true,
      frequency: 'weekly'
    },
    theme: 'auto',
    currency: 'LKR'
  });
  const [loading, setLoading] = useState(false);

  const notificationFrequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  const themeOptions = [
    { value: 'auto', label: 'Auto', description: 'Follows system setting' },
    { value: 'light', label: 'Light', description: 'Always light mode' },
    { value: 'dark', label: 'Dark', description: 'Always dark mode' }
  ];

  const currencyOptions = [
    { value: 'USD', label: 'US Dollar (USD)', symbol: CURRENCIES.USD },
    { value: 'EUR', label: 'Euro (EUR)', symbol: CURRENCIES.EUR },
    { value: 'GBP', label: 'British Pound (GBP)', symbol: CURRENCIES.GBP }
  ];

  const handleNext = async () => {
    setLoading(true);
    
    try {
      const success = await onboardingService.saveUserPreferences(preferences);
      
      if (success) {
        await onboardingService.saveCurrentStep(7);
        navigation.navigate('OnboardingComplete');
      } else {
        Alert.alert('Error', 'Failed to save preferences. Please try again.');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const updateNotificationPreference = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const updatePreference = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderNotificationSetting = (title, description, key, icon) => (
    <View key={key} style={[styles.settingItem, { borderBottomColor: theme.colors.surface }]}>
      <View style={styles.settingContent}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
            {description}
          </Text>
        </View>
        <Switch
          value={preferences.notifications[key]}
          onValueChange={(value) => updateNotificationPreference(key, value)}
          trackColor={{ false: theme.colors.surface, true: theme.colors.primary + '60' }}
          thumbColor={preferences.notifications[key] ? theme.colors.primary : theme.colors.textSecondary}
        />
      </View>
    </View>
  );

  const renderOptionSelector = (title, options, currentValue, onSelect, icon) => (
    <View style={[styles.sectionContainer, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
      </View>
      
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionItem,
              {
                backgroundColor: currentValue === option.value ? theme.colors.primary : theme.colors.background,
                borderColor: currentValue === option.value ? theme.colors.primary : theme.colors.primary + '30',
              }
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[
              styles.optionLabel,
              {
                color: currentValue === option.value ? '#FFFFFF' : theme.colors.text
              }
            ]}>
              {option.label}
            </Text>
            {option.description && (
              <Text style={[
                styles.optionDescription,
                {
                  color: currentValue === option.value ? '#FFFFFF' + 'CC' : theme.colors.textSecondary
                }
              ]}>
                {option.description}
              </Text>
            )}
            {option.symbol && (
              <Text style={[
                styles.optionSymbol,
                {
                  color: currentValue === option.value ? '#FFFFFF' : theme.colors.primary
                }
              ]}>
                {option.symbol}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Progress Bar */}
        <ProgressBar currentStep={6} totalSteps={8} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Customize your experience
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Set up notifications and preferences to make ExpenseWise work best for you.
          </Text>
        </View>

        {/* Notifications Section */}
        <View style={[styles.sectionContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔔</Text>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Notifications
            </Text>
          </View>
          
          <View style={styles.notificationsContainer}>
            {renderNotificationSetting(
              'Due Date Reminders',
              'Get notified when bills are due',
              'dueReminder',
              '📅'
            )}
            {renderNotificationSetting(
              'Budget Allocation',
              'Reminders to allocate new income',
              'allocationReminder',
              '💰'
            )}
            {renderNotificationSetting(
              'Weekly Summary',
              'Get spending insights and summaries',
              'summary',
              '📈'
            )}
          </View>

          {/* Notification Frequency */}
          {(preferences.notifications.summary) && (
            <View style={styles.frequencyContainer}>
              <Text style={[styles.frequencyLabel, { color: theme.colors.text }]}>
                Summary Frequency
              </Text>
              <View style={styles.frequencyOptions}>
                {notificationFrequencies.map((freq) => (
                  <TouchableOpacity
                    key={freq.value}
                    style={[
                      styles.frequencyButton,
                      {
                        backgroundColor: preferences.notifications.frequency === freq.value 
                          ? theme.colors.primary 
                          : theme.colors.background,
                        borderColor: theme.colors.primary + '30',
                      }
                    ]}
                    onPress={() => updateNotificationPreference('frequency', freq.value)}
                  >
                    <Text style={[
                      styles.frequencyText,
                      {
                        color: preferences.notifications.frequency === freq.value 
                          ? '#FFFFFF' 
                          : theme.colors.text
                      }
                    ]}>
                      {freq.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Theme Selection */}
        {renderOptionSelector(
          'Theme Preference',
          themeOptions,
          preferences.theme,
          (value) => updatePreference('theme', value),
          '🎨'
        )}

        {/* Currency Selection */}
        {renderOptionSelector(
          'Default Currency',
          currencyOptions,
          preferences.currency,
          (value) => updatePreference('currency', value),
          '💱'
        )}

      </ScrollView>

      {/* Footer Buttons */}
      <View style={[styles.footer, { borderTopColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: theme.colors.surface }]}
          onPress={handleBack}
          disabled={loading}
        >
          <Text style={[styles.backButtonText, { color: theme.colors.text }]}>
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.nextButton,
            { 
              backgroundColor: theme.colors.primary,
              opacity: loading ? 0.6 : 1
            }
          ]}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={[styles.nextButtonText, { color: '#FFFFFF' }]}>
            {loading ? 'Saving...' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  sectionContainer: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  notificationsContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  settingItem: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
  },
  frequencyContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  frequencyLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  frequencyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  frequencyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionsContainer: {
    gap: 12,
  },
  optionItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  optionDescription: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  optionSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    gap: 16,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PreferencesSetupScreen;