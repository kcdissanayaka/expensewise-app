import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';

const ProgressBar = ({ currentStep, totalSteps, showText = true }) => {
  const { theme } = useTheme();
  const progress = (currentStep / totalSteps) * 100;

  return (
    <View style={styles.container}>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.stepText, { color: theme.textSecondary }]}>
            Step {currentStep} of {totalSteps}
          </Text>
          <Text style={[styles.progressText, { color: theme.primary }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      )}
      
      <View style={[styles.progressBarBackground, { backgroundColor: theme.surface }]}>
        <View 
          style={[
            styles.progressBarFill,
            { 
              backgroundColor: theme.primary,
              width: `${progress}%`
            }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
});

export default ProgressBar;