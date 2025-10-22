import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ErrorToast = ({ message, visible, onDismiss, type = 'error' }) => {
  const slideAnim = useRef(new Animated.Value(100)).current; // Start from bottom (positive value)
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in from bottom and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        dismissToast();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100, // Slide out to bottom
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  if (!visible) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'error':
        return {
          backgroundColor: '#FFEBEE',
          borderColor: '#F44336',
          iconName: 'close-circle',
          iconColor: '#F44336',
        };
      case 'warning':
        return {
          backgroundColor: '#FFF3E0',
          borderColor: '#FF9800',
          iconName: 'warning',
          iconColor: '#FF9800',
        };
      case 'info':
        return {
          backgroundColor: '#E3F2FD',
          borderColor: '#2196F3',
          iconName: 'information-circle',
          iconColor: '#2196F3',
        };
      default:
        return {
          backgroundColor: '#FFEBEE',
          borderColor: '#F44336',
          iconName: 'close-circle',
          iconColor: '#F44336',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          backgroundColor: config.backgroundColor,
          borderLeftColor: config.borderColor,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name={config.iconName} size={24} color={config.iconColor} />
        </View>
        <Text style={[styles.message, { color: config.borderColor }]} numberOfLines={2}>
          {message}
        </Text>
        <TouchableOpacity onPress={dismissToast} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#757575" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default ErrorToast;
