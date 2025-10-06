import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import onboardingService from '../services/onboardingService';
import ProgressBar from '../components/ProgressBar';

const IncomeSetupScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [incomeData, setIncomeData] = useState({
    primary: {
      amount: '',
      source: '',
      frequency: 'monthly'
    },
    secondary: {
      amount: '',
      source: '',
      frequency: 'monthly'
    }
  });
  const [loading, setLoading] = useState(false);

  const frequencyOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi-weekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  const handleNext = async () => {
    // Validation
    if (!incomeData.primary.amount || parseFloat(incomeData.primary.amount) <= 0) {
      Alert.alert('Error', 'Please enter your primary income amount');
      return;
    }

    if (!incomeData.primary.source.trim()) {
      Alert.alert('Error', 'Please enter your income source');
      return;
    }

    setLoading(true);
    
    try {
      // Save income data
      const success = await onboardingService.saveIncomeData(incomeData);
      
      if (success) {
        await onboardingService.saveCurrentStep(4);
        navigation.navigate('ExpenseSetup');
      } else {
        Alert.alert('Error', 'Failed to save income data. Please try again.');
      }
    } catch (error) {
      console.error('Error saving income:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const updatePrimaryIncome = (field, value) => {
    setIncomeData(prev => ({
      ...prev,
      primary: {
        ...prev.primary,
        [field]: value
      }
    }));
  };

  const updateSecondaryIncome = (field, value) => {
    setIncomeData(prev => ({
      ...prev,
      secondary: {
        ...prev.secondary,
        [field]: value
      }
    }));
  };

  const formatCurrency = (value) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    return numericValue;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          
          {/* Progress Bar */}
          <ProgressBar currentStep={3} totalSteps={8} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Let's set up your income
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              This helps us create accurate budgets and recommendations for you.
            </Text>
          </View>

          {/* Primary Income Section */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Primary Income *
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Income Source
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.primary + '30',
                  color: theme.colors.text
                }]}
                placeholder="e.g., Full-time job, Business"
                placeholderTextColor={theme.colors.textSecondary}
                value={incomeData.primary.source}
                onChangeText={(value) => updatePrimaryIncome('source', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Amount (EUR)
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.primary + '30',
                  color: theme.colors.text
                }]}
                placeholder="50000"
                placeholderTextColor={theme.colors.textSecondary}
                value={incomeData.primary.amount}
                onChangeText={(value) => updatePrimaryIncome('amount', formatCurrency(value))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Frequency
              </Text>
              <View style={styles.frequencyContainer}>
                {frequencyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.frequencyButton,
                      {
                        backgroundColor: incomeData.primary.frequency === option.value 
                          ? theme.colors.primary 
                          : theme.colors.background,
                        borderColor: incomeData.primary.frequency === option.value 
                          ? theme.colors.primary 
                          : theme.colors.primary + '30',
                      }
                    ]}
                    onPress={() => updatePrimaryIncome('frequency', option.value)}
                  >
                    <Text style={[
                      styles.frequencyText,
                      {
                        color: incomeData.primary.frequency === option.value 
                          ? '#FFFFFF' 
                          : theme.colors.text
                      }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Secondary Income Section */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Secondary Income (Optional)
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              Add any additional income sources like freelance work or investments.
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Income Source
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.primary + '30',
                  color: theme.colors.text
                }]}
                placeholder="e.g., Freelance, Investments"
                placeholderTextColor={theme.colors.textSecondary}
                value={incomeData.secondary.source}
                onChangeText={(value) => updateSecondaryIncome('source', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Amount (EUR)
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.primary + '30',
                  color: theme.colors.text
                }]}
                placeholder="10000"
                placeholderTextColor={theme.colors.textSecondary}
                value={incomeData.secondary.amount}
                onChangeText={(value) => updateSecondaryIncome('amount', formatCurrency(value))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Frequency
              </Text>
              <View style={styles.frequencyContainer}>
                {frequencyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.frequencyButton,
                      {
                        backgroundColor: incomeData.secondary.frequency === option.value 
                          ? theme.colors.primary 
                          : theme.colors.background,
                        borderColor: incomeData.secondary.frequency === option.value 
                          ? theme.colors.primary 
                          : theme.colors.primary + '30',
                      }
                    ]}
                    onPress={() => updateSecondaryIncome('frequency', option.value)}
                  >
                    <Text style={[
                      styles.frequencyText,
                      {
                        color: incomeData.secondary.frequency === option.value 
                          ? '#FFFFFF' 
                          : theme.colors.text
                      }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  section: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  frequencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  frequencyText: {
    fontSize: 14,
    fontWeight: '500',
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

export default IncomeSetupScreen;