import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { authService } from '../../../services';

const SignUpScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Handle input changes with validation
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation
    let error = null;
    
    switch (field) {
      case 'name':
        if (value.trim().length === 0) {
          error = null; // Don't show error until they start typing
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters';
        } else if (value.trim().length > 50) {
          error = 'Name must be less than 50 characters';
        }
        break;
        
      case 'email':
        const trimmedEmail = value.trim();
        if (trimmedEmail.length === 0) {
          error = null; // Don't show error until  start typing
        } else if (!validateEmail(trimmedEmail)) {
          error = 'Please enter a valid email address';
        } else if (trimmedEmail.length > 254) {
          error = 'Email address is too long';
        }
        break;
        
      case 'password':
        if (value.length === 0) {
          error = null; // Don't show error until they start typing
        } else if (value.length < 6) {
          error = 'Password must be at least 6 characters';
        } else if (value.length > 128) {
          error = 'Password must be less than 128 characters';
        }
        
        // Check confirm password if it exists
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
        } else if (formData.confirmPassword && value === formData.confirmPassword) {
          setErrors(prev => ({ ...prev, confirmPassword: null }));
        }
        break;
        
      case 'confirmPassword':
        if (value.length === 0) {
          error = null; // Don't show error until they start typing
        } else if (value !== formData.password) {
          error = 'Passwords do not match';
        }
        break;
    }
    
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  // Check if form is valid
  const isFormValid = () => {
    const { name, email, password, confirmPassword } = formData;
      return (
        name.trim().length > 0 &&
        email.trim().length > 0 &&
        password.length > 0 &&
        confirmPassword === password
      );
    };

  // Handle sign up
  const handleSignUp = async () => {
    // Clear any previous errors
    setErrors({});

    // Validate form before submission
    const { name, email, password, confirmPassword } = formData;
    let hasErrors = false;

    if (!name.trim()) {
      setErrors(prev => ({ ...prev, name: 'Name is required' }));
      hasErrors = true;
    } else if (name.trim().length < 2) {
      setErrors(prev => ({ ...prev, name: 'Name must be at least 2 characters' }));
      hasErrors = true;
    }

    if (!email.trim()) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
      hasErrors = true;
    } else if (!validateEmail(email.trim())) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      hasErrors = true;
    }

    if (!password) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }));
      hasErrors = true;
    } else if (password.length < 6) {
      setErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters long and contain letters and numbers' }));
      hasErrors = true;
    }

    if (!confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Please confirm your password' }));
      hasErrors = true;
    } else if (password !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      hasErrors = true;
    }

    if (hasErrors) {
      Alert.alert('Validation Error', 'Please correct the errors in the form');
      return;
    }

    setLoading(true);
    
    try {
      const result = await authService.register({
        email: email.trim().toLowerCase(),
        password: password,
        name: name.trim(),
        currency: 'EUR' // Default currency
      });
      
      if (result.success) {
        Alert.alert(
          'Account Created Successfully!',
          'Welcome to ExpenseWise! You can now log in with your credentials.',
          [
            {
              text: 'Continue to Login',
              onPress: () => {
                try {
                  navigation.navigate('Login', { email: formData.email.trim() });
                } catch (navError) {
                  console.error('Navigation error after signup:', navError);
                  // Fallback navigation
                  navigation.goBack();
                }
              }
            }
          ]
        );
      } else {
        // Handle specific registration failure reasons
        const errorMessage = result.message || 'Registration failed';
        
        if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('exist')) {
          setErrors(prev => ({ ...prev, email: 'An account with this email already exists' }));
          Alert.alert(
            'Email Already Registered',
            'An account with this email already exists. Would you like to log in instead?',
            [
              {
                text: 'Go to Login',
                onPress: () => {
                  try {
                    navigation.navigate('Login', { email: formData.email.trim() });
                  } catch (navError) {
                    console.error('Navigation error:', navError);
                    navigation.goBack();
                  }
                }
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        } else if (errorMessage.toLowerCase().includes('email')) {
          setErrors(prev => ({ ...prev, email: errorMessage }));
        } else if (errorMessage.toLowerCase().includes('password')) {
          setErrors(prev => ({ ...prev, password: errorMessage }));
        } else if (errorMessage.toLowerCase().includes('name')) {
          setErrors(prev => ({ ...prev, name: errorMessage }));
        } else {
          Alert.alert('Registration Failed', errorMessage);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle different types of errors
      if (error.message.includes('network') || error.message.includes('fetch')) {
        Alert.alert(
          'Connection Error',
          'Please check your internet connection and try again.',
          [
            { text: 'Retry', onPress: handleSignUp },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else if (error.message.includes('database') || error.message.includes('SQLite')) {
        Alert.alert(
          'Database Error',
          'There was an issue creating your account. Please try again or restart the app.',
          [
            { text: 'Retry', onPress: handleSignUp },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else if (error.message.includes('timeout')) {
        Alert.alert(
          'Request Timeout',
          'The registration request took too long. Please try again.',
          [
            { text: 'Retry', onPress: handleSignUp },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else if (error.message.includes('validation')) {
        Alert.alert(
          'Validation Error',
          'Please check your information and try again.',
          [{ text: 'OK' }]
        );
      } else {
        // Generic error handling
        const errorMessage = error.message || 'An unexpected error occurred during registration';
        Alert.alert(
          'Registration Error',
          errorMessage,
          [
            { text: 'Try Again', onPress: handleSignUp },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle back to login
  const handleBackToLogin = () => {
    try {
      navigation.navigate('Login');
    } catch (navError) {
      console.error('Navigation error to Login:', navError);
      Alert.alert(
        'Navigation Error',
        'Unable to navigate to login screen. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join ExpenseWise to start managing your finances</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          
          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                errors.name && styles.inputError
              ]}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter your full name"
              autoCapitalize="words"
              autoComplete="name"
              editable={!loading}
            />
            {errors.name && (
              <Text style={styles.errorText}>{errors.name}</Text>
            )}
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[
                styles.input,
                errors.email && styles.inputError
              ]}
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.passwordInput,
                  errors.password && styles.inputError
                ]}
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                placeholder="Create a password"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Text style={styles.eyeText}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.passwordInput,
                  errors.confirmPassword && styles.inputError
                ]}
                value={formData.confirmPassword}
                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                <Text style={styles.eyeText}>
                  {showConfirmPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[
              styles.signUpButton,
              (!isFormValid() || loading) && styles.signUpButtonDisabled
            ]}
            onPress={handleSignUp}
            disabled={!isFormValid() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signUpButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity 
              onPress={handleBackToLogin}
              disabled={loading}
            >
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  inputError: {
    borderColor: '#F44336',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
  },
  eyeText: {
    fontSize: 18,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginTop: 4,
  },
  signUpButton: {
    backgroundColor: '#2196F3',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  signUpButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#757575',
    fontSize: 14,
  },
  loginLink: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SignUpScreen;