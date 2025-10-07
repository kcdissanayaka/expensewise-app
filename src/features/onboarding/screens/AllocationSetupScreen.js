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

const AllocationSetupScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [allocation, setAllocation] = useState(onboardingService.getSuggestedAllocation());
  const [loading, setLoading] = useState(false);

  const allocationTypes = [
    {
      key: 'needs',
      title: 'Needs',
      description: 'Essential expenses like housing, utilities, groceries',
      icon: '🏠',
      color: '#E74C3C',
      examples: ['Housing', 'Transportation', 'Utilities', 'Healthcare']
    },
    {
      key: 'wants',
      title: 'Wants',
      description: 'Entertainment, dining out, shopping, hobbies',
      icon: '🎉',
      color: '#3498DB',
      examples: ['Entertainment', 'Dining Out', 'Shopping', 'Travel']
    },
    {
      key: 'savings',
      title: 'Savings',
      description: 'Emergency fund, investments, retirement',
      icon: '💰',
      color: '#27AE60',
      examples: ['Emergency Fund', 'Investments', 'Retirement', 'Goals']
    }
  ];

  const handleAdjustment = (key, change) => {
    const newValue = Math.max(0, Math.min(100, allocation[key] + change));
    const diff = newValue - allocation[key];
    
    if (diff === 0) return;
    
    // Adjust other categories proportionally
    const otherKeys = allocationTypes.filter(type => type.key !== key).map(type => type.key);
    const totalOthers = otherKeys.reduce((sum, k) => sum + allocation[k], 0);
    
    if (totalOthers === 0) {
      // If others are 0, split the remaining equally
      const remaining = 100 - newValue;
      const splitAmount = Math.round(remaining / 2);
      
      setAllocation({
        ...allocation,
        [key]: newValue,
        [otherKeys[0]]: splitAmount,
        [otherKeys[1]]: remaining - splitAmount
      });
    } else {
      // Distribute the change proportionally
      const ratio1 = allocation[otherKeys[0]] / totalOthers;
      const ratio2 = allocation[otherKeys[1]] / totalOthers;
      const distributeDiff = -diff;
      
      const newOther1 = Math.max(0, allocation[otherKeys[0]] + Math.round(distributeDiff * ratio1));
      const newOther2 = Math.max(0, allocation[otherKeys[1]] + Math.round(distributeDiff * ratio2));
      
      // Ensure total is 100
      const total = newValue + newOther1 + newOther2;
      const adjustment = 100 - total;
      
      setAllocation({
        ...allocation,
        [key]: newValue,
        [otherKeys[0]]: newOther1,
        [otherKeys[1]]: newOther2 + adjustment
      });
    }
  };

  const resetToDefault = () => {
    setAllocation(onboardingService.getSuggestedAllocation());
  };

  const handleNext = async () => {
    const total = Object.values(allocation).reduce((sum, val) => sum + val, 0);
    
    if (total !== 100) {
      Alert.alert('Invalid Allocation', 'Budget allocation must total 100%. Please adjust your percentages.');
      return;
    }

    setLoading(true);
    
    try {
      const success = await onboardingService.saveBudgetAllocation(allocation);
      
      if (success) {
        await onboardingService.saveCurrentStep(6);
        navigation.navigate('PreferencesSetup');
      } else {
        Alert.alert('Error', 'Failed to save budget allocation. Please try again.');
      }
    } catch (error) {
      console.error('Error saving allocation:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const total = Object.values(allocation).reduce((sum, val) => sum + val, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Progress Bar */}
        <ProgressBar currentStep={5} totalSteps={8} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Set your budget allocation
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            We recommend the 50/30/20 rule, but you can adjust based on your financial situation.
          </Text>
        </View>

        {/* Total Percentage Display */}
        <View style={[styles.totalContainer, { 
          backgroundColor: total === 100 ? theme.colors.success + '20' : theme.colors.warning + '20',
          borderColor: total === 100 ? theme.colors.success : theme.colors.warning
        }]}>
          <Text style={[styles.totalText, { 
            color: total === 100 ? theme.colors.success : theme.colors.warning
          }]}>
            Total: {total}%
          </Text>
          {total !== 100 && (
            <Text style={[styles.totalWarning, { color: theme.colors.warning }]}>
              {total > 100 ? 'Over budget!' : 'Under budget!'}
            </Text>
          )}
        </View>

        {/* Allocation Sliders */}
        <View style={[styles.allocationContainer, { backgroundColor: theme.colors.surface }]}>
          {allocationTypes.map((type) => (
            <View key={type.key} style={styles.allocationItem}>
              <View style={styles.allocationHeader}>
                <View style={styles.allocationTitleContainer}>
                  <Text style={styles.allocationIcon}>{type.icon}</Text>
                  <View style={styles.allocationTextContainer}>
                    <Text style={[styles.allocationTitle, { color: theme.colors.text }]}>
                      {type.title}
                    </Text>
                    <Text style={[styles.allocationDescription, { color: theme.colors.textSecondary }]}>
                      {type.description}
                    </Text>
                  </View>
                </View>
                <View style={[styles.percentageContainer, { backgroundColor: type.color + '20' }]}>
                  <Text style={[styles.percentageText, { color: type.color }]}>
                    {allocation[type.key]}%
                  </Text>
                </View>
              </View>

              <View style={styles.adjustmentContainer}>
                <TouchableOpacity
                  style={[styles.adjustButton, { backgroundColor: type.color + '20' }]}
                  onPress={() => handleAdjustment(type.key, -5)}
                >
                  <Text style={[styles.adjustButtonText, { color: type.color }]}>-5%</Text>
                </TouchableOpacity>
                
                <View style={[styles.sliderTrack, { backgroundColor: theme.colors.surface }]}>
                  <View 
                    style={[
                      styles.sliderFill, 
                      { 
                        backgroundColor: type.color,
                        width: `${allocation[type.key]}%`
                      }
                    ]} 
                  />
                </View>
                
                <TouchableOpacity
                  style={[styles.adjustButton, { backgroundColor: type.color + '20' }]}
                  onPress={() => handleAdjustment(type.key, 5)}
                >
                  <Text style={[styles.adjustButtonText, { color: type.color }]}>+5%</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.examplesContainer}>
                <Text style={[styles.examplesText, { color: theme.colors.textSecondary }]}>
                  Examples: {type.examples.join(', ')}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Preset Options */}
        <View style={[styles.presetsContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.presetsTitle, { color: theme.colors.text }]}>
            Quick Presets
          </Text>
          
          <View style={styles.presetButtons}>
            <TouchableOpacity
              style={[styles.presetButton, { 
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.primary + '30'
              }]}
              onPress={() => setAllocation({ needs: 50, wants: 30, savings: 20 })}
            >
              <Text style={[styles.presetButtonText, { color: theme.colors.text }]}>
                50/30/20 Rule
              </Text>
              <Text style={[styles.presetButtonSubtext, { color: theme.colors.textSecondary }]}>
                Balanced approach
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetButton, { 
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.primary + '30'
              }]}
              onPress={() => setAllocation({ needs: 60, wants: 20, savings: 20 })}
            >
              <Text style={[styles.presetButtonText, { color: theme.colors.text }]}>
                Conservative
              </Text>
              <Text style={[styles.presetButtonSubtext, { color: theme.colors.textSecondary }]}>
                Focus on needs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetButton, { 
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.primary + '30'
              }]}
              onPress={() => setAllocation({ needs: 40, wants: 30, savings: 30 })}
            >
              <Text style={[styles.presetButtonText, { color: theme.colors.text }]}>
                Aggressive Saver
              </Text>
              <Text style={[styles.presetButtonSubtext, { color: theme.colors.textSecondary }]}>
                Maximize savings
              </Text>
            </TouchableOpacity>
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
              backgroundColor: total === 100 ? theme.colors.primary : theme.colors.surface,
              opacity: loading ? 0.6 : 1
            }
          ]}
          onPress={handleNext}
          disabled={total !== 100 || loading}
        >
          <Text style={[
            styles.nextButtonText, 
            { 
              color: total === 100 ? '#FFFFFF' : theme.colors.textSecondary
            }
          ]}>
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
  totalContainer: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  totalWarning: {
    fontSize: 14,
    marginTop: 4,
  },
  allocationContainer: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  allocationItem: {
    marginBottom: 24,
  },
  allocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  allocationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  allocationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  allocationTextContainer: {
    flex: 1,
  },
  allocationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  allocationDescription: {
    fontSize: 14,
  },
  percentageContainer: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  adjustmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adjustButton: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  adjustButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 4,
  },
  examplesContainer: {
    marginTop: 8,
  },
  examplesText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  presetsContainer: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  presetsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  presetButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  presetButtonSubtext: {
    fontSize: 12,
    textAlign: 'center',
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

export default AllocationSetupScreen;