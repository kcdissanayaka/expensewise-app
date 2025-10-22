import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import onboardingService from '../services/onboardingService';
import ProgressBar from '../components/ProgressBar';
import OnboardingCard from '../components/OnboardingCard';

const GoalSettingScreen = ({ navigation }) => {
  const { theme } = useTheme();
  // Selected goals are stored in this state array
  const [selectedGoals, setSelectedGoals] = useState([]);
  // Loading state for saving goals
  const [loading, setLoading] = useState(false);

  // Goals are loaded from the onboarding service
  const goals = onboardingService.getFinancialGoalsOptions();

  // This function toggles goals when user taps on a card
  const handleGoalToggle = (goalId) => {
    setSelectedGoals(prev => {
      if (prev.includes(goalId)) {
        return prev.filter(id => id !== goalId);
      } else {
        return [...prev, goalId];
      }
    });
  };

  // Next button handler with validation
  const handleNext = async () => {
    // Validation: Check if at least one goal is selected
    if (selectedGoals.length === 0) {
      Alert.alert('Select Goals', 'Please select at least one financial goal to continue.');
      return;
    }

    setLoading(true);
    
    try {
      // Save selected goals to the service
      const success = await onboardingService.saveFinancialGoals(selectedGoals);
      
      if (success) {
        await onboardingService.saveCurrentStep(3);
        navigation.navigate('IncomeSetup');
      } else {
        Alert.alert('Error', 'Failed to save your goals. Please try again.');
      }
    } catch (error) {
      console.error('Error saving goals:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Progress Bar showing step 2 of 8 */}
        <ProgressBar currentStep={2} totalSteps={8} />

        {/* Header section with title and subtitle */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            What are your financial goals?
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Select one or more goals that matter most to you. We'll personalize your experience accordingly.
          </Text>
        </View>

        {/* Goals container with mapped goal cards */}
        <View style={styles.goalsContainer}>
          {goals.map((goal) => (
            <OnboardingCard
              key={goal.id}
              title={goal.title}
              description={goal.description}
              icon={goal.icon}
              color={goal.color}
              isSelected={selectedGoals.includes(goal.id)}
              onPress={() => handleGoalToggle(goal.id)}
            />
          ))}
        </View>

        {/* Selection info showing count of selected goals */}
        {selectedGoals.length > 0 && (
          <View style={[styles.selectionInfo, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.selectionText, { color: theme.colors.text }]}>
              {selectedGoals.length} goal{selectedGoals.length > 1 ? 's' : ''} selected
            </Text>
          </View>
        )}

      </ScrollView>

      {/* Footer buttons with conditional styling */}
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

        {/* Next button changes appearance based on selection and loading state */}
        <TouchableOpacity
          style={[
            styles.nextButton,
            { 
              // Button is colored only when goals are selected
              backgroundColor: selectedGoals.length > 0 ? theme.colors.primary : theme.colors.surface,
              opacity: loading ? 0.6 : 1
            }
          ]}
          onPress={handleNext}
          // Disabled when no goals selected or loading
          disabled={selectedGoals.length === 0 || loading}
        >
          <Text style={[
            styles.nextButtonText, 
            { 
              // Text color changes based on selection state
              color: selectedGoals.length > 0 ? '#FFFFFF' : theme.colors.textSecondary
            }
          ]}>
            {/* Shows loading text when saving */}
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
  goalsContainer: {
    marginBottom: 24,
  },
  selectionInfo: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  selectionText: {
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

export default GoalSettingScreen;