import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  Alert
} from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import onboardingService from '../services/onboardingService';

const { width } = Dimensions.get('window');

const OnboardingCompleteScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  
  // Animation values
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    try {
      // Start entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        })
      ]).start();
    } catch (animationError) {
      console.error('Animation error:', animationError);
      // Set final values directly if animation fails
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      slideAnim.setValue(0);
    }
  }, []);

  const navigateToDashboard = () => {
    try {
      const parentNavigator = navigation.getParent();
      if (parentNavigator) {
        parentNavigator.navigate('Dashboard');
      } else {
        // Fallback navigation
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }
    } catch (navError) {
      console.error('Navigation error:', navError);
      Alert.alert(
        'Navigation Error',
        'Unable to navigate to the dashboard. Please restart the app.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      // Complete the onboarding process
      const success = await onboardingService.completeOnboarding();
      
      if (success) {
        // Navigate to the Dashboard
        navigateToDashboard();
      } else {
        // Show error but still allow proceeding
        Alert.alert(
          'Setup Warning',
          'There was an issue saving your onboarding progress, but you can still continue to use the app.',
          [
            {
              text: 'Continue Anyway',
              onPress: navigateToDashboard
            },
            {
              text: 'Try Again',
              onPress: handleComplete
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      
      // Show user-friendly error message with options
      Alert.alert(
        'Setup Error',
        'We encountered an issue completing your setup. Would you like to try again or continue to the app?',
        [
          {
            text: 'Continue to App',
            onPress: navigateToDashboard
          },
          {
            text: 'Try Again',
            onPress: handleComplete,
            style: 'default'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const achievements = [
    {
      icon: '💰',
      title: 'Income Configured',
      description: 'Your income sources are set up and ready'
    },
    {
      icon: '📈',
      title: 'Categories Selected',
      description: 'Expense tracking categories are organized'
    },
    {
      icon: '🎯',
      title: 'Budget Allocated',
      description: 'Your money is smartly allocated across needs, wants, and savings'
    },
    {
      icon: '⚙️',
      title: 'Preferences Set',
      description: 'Notifications and preferences are configured'
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        
        {/* Success Animation */}
        <Animated.View 
          style={[
            styles.successContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={[styles.successCircle, { backgroundColor: theme.colors.success + '20' }]}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          
          <Text style={[styles.congratsText, { color: theme.colors.text }]}>
            Congratulations!
          </Text>
          
          <Text style={[styles.setupCompleteText, { color: theme.colors.textSecondary }]}>
            Your ExpenseWise account is ready to use
          </Text>
        </Animated.View>

        {/* Achievements */}
        <Animated.View 
          style={[
            styles.achievementsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.achievementsTitle, { color: theme.colors.text }]}>
            Setup Complete
          </Text>
          
          {achievements.map((achievement, index) => (
            <Animated.View
              key={index}
              style={[
                styles.achievementItem,
                {
                  backgroundColor: theme.colors.surface,
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 50],
                        outputRange: [0, 50 + (index * 10)],
                      })
                    }
                  ]
                }
              ]}
            >
              <View style={[styles.achievementIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
              </View>
              
              <View style={styles.achievementText}>
                <Text style={[styles.achievementTitle, { color: theme.colors.text }]}>
                  {achievement.title}
                </Text>
                <Text style={[styles.achievementDescription, { color: theme.colors.textSecondary }]}>
                  {achievement.description}
                </Text>
              </View>
              
              <View style={[styles.checkmark, { backgroundColor: theme.colors.success }]}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Next Steps Preview */}
        <Animated.View 
          style={[
            styles.previewContainer,
            {
              backgroundColor: theme.colors.surface,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.previewTitle, { color: theme.colors.text }]}>
            What's Next?
          </Text>
          
          <View style={styles.previewItems}>
            <Text style={[styles.previewItem, { color: theme.colors.textSecondary }]}>
              • Add your first expense
            </Text>
            <Text style={[styles.previewItem, { color: theme.colors.textSecondary }]}>
              • View your personalized dashboard
            </Text>
            <Text style={[styles.previewItem, { color: theme.colors.textSecondary }]}>
              • Track your spending patterns
            </Text>
            <Text style={[styles.previewItem, { color: theme.colors.textSecondary }]}>
              • Get insights and recommendations
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Footer Button */}
      <Animated.View 
        style={[
          styles.footer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.completeButton,
            { 
              backgroundColor: theme.colors.primary,
              opacity: loading ? 0.6 : 1
            }
          ]}
          onPress={handleComplete}
          disabled={loading}
        >
          <Text style={[styles.completeButtonText, { color: '#FFFFFF' }]}>
            {loading ? 'Setting up...' : 'Start Using ExpenseWise'}
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.welcomeText, { color: theme.colors.textSecondary }]}>
          Welcome to your financial journey! 🎉
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 50,
    color: '#27AE60',
    fontWeight: 'bold',
  },
  congratsText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  setupCompleteText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  achievementsContainer: {
    marginBottom: 32,
  },
  achievementsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementEmoji: {
    fontSize: 20,
  },
  achievementText: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  previewContainer: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  previewItems: {
    gap: 8,
  },
  previewItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  completeButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default OnboardingCompleteScreen;