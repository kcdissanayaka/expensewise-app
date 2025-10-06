import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';

const OnboardingCard = ({ 
  title, 
  description, 
  icon, 
  color, 
  isSelected = false, 
  onPress,
  style
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isSelected ? color || theme.primary : theme.surface,
          borderColor: isSelected ? color || theme.primary : theme.border,
          shadowColor: isSelected ? color || theme.primary : '#000',
        },
        style
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={[
          styles.iconContainer,
          {
            backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : color || theme.primary + '20'
          }
        ]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[
            styles.title,
            {
              color: isSelected ? theme.white : theme.text
            }
          ]}>
            {title}
          </Text>
          
          {description && (
            <Text style={[
              styles.description,
              {
                color: isSelected ? theme.white + 'CC' : theme.textSecondary
              }
            ]}>
              {description}
            </Text>
          )}
        </View>
        
        {isSelected && (
          <View style={styles.checkContainer}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OnboardingCard;