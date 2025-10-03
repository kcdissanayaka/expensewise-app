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

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // 1: email input, 2: code verification, 3: new password
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Real-time email validation
  const handleEmailChange = (text) => {
    const trimmedEmail = text.trim();
    setEmail(text);
    
    if (text.length > 0 && !validateEmail(trimmedEmail)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
    } else {
      setErrors(prev => ({ ...prev, email: null }));
    }
  };

  // Password validation
  const handleNewPasswordChange = (text) => {
    setNewPassword(text);
    
    if (text.length > 0 && text.length < 6) {
      setErrors(prev => ({ ...prev, newPassword: 'Password must be at least 6 characters' }));
    } else {
      setErrors(prev => ({ ...prev, newPassword: null }));
    }

    // Validate confirm password if it exists
    if (confirmPassword && text !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
    } else if (confirmPassword && text === confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: null }));
    }
  };

  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    
    if (text.length > 0 && text !== newPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
    } else {
      setErrors(prev => ({ ...prev, confirmPassword: null }));
    }
  };

  // Check if current step is valid
  const isStepValid = () => {
    switch (step) {
      case 1:
        return email.trim().length > 0 && validateEmail(email.trim()) && !errors.email;
      case 2:
        return verificationCode.length >= 4; // Assuming 4-6 digit code
      case 3:
        return (
          newPassword.length >= 6 &&
          confirmPassword === newPassword &&
          !errors.newPassword &&
          !errors.confirmPassword
        );
      default:
        return false;
    }
  };

  // Handle send reset code
  const handleSendResetCode = async () => {
    if (!isStepValid()) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      const result = await authService.forgotPassword(email);
      
      if (result.success) {
        setStep(2);
        Alert.alert('Success', result.message || 'Reset code sent to your email');
      } else {
        Alert.alert('Error', result.message || 'Failed to send reset code');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle verify code
  const handleVerifyCode = async () => {
    if (!isStepValid()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    
    try {
      const result = await authService.verifyResetCode(email, verificationCode);
      
      if (result.success) {
        setStep(3);
        Alert.alert('Success', result.message || 'Code verified successfully');
      } else {
        Alert.alert('Error', result.message || 'Invalid verification code');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle reset password
  const handleResetPassword = async () => {
    if (!isStepValid()) {
      Alert.alert('Error', 'Please fill in all fields correctly');
      return;
    }

    setLoading(true);
    
    try {
      const result = await authService.resetPassword(email, verificationCode, newPassword);
      
      if (result.success) {
        Alert.alert(
          'Success',
          result.message || 'Password reset successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login', { email })
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to reset password');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle back to login
  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  // Resend verification code
  const handleResendCode = async () => {
    setLoading(true);
    
    try {
      const result = await authService.forgotPassword(email);
      
      if (result.success) {
        Alert.alert('Success', result.message || 'New code sent to your email');
      } else {
        Alert.alert('Error', result.message || 'Failed to resend code');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
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
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 1 && 'Enter your email to receive a reset code'}
            {step === 2 && 'Enter the verification code sent to your email'}
            {step === 3 && 'Create your new password'}
          </Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((stepNumber) => (
            <View key={stepNumber} style={styles.stepContainer}>
              <View
                style={[
                  styles.stepCircle,
                  step >= stepNumber ? styles.stepCircleActive : styles.stepCircleInactive
                ]}
              >
                <Text
                  style={[
                    styles.stepText,
                    step >= stepNumber ? styles.stepTextActive : styles.stepTextInactive
                  ]}
                >
                  {stepNumber}
                </Text>
              </View>
              {stepNumber < 3 && (
                <View
                  style={[
                    styles.stepLine,
                    step > stepNumber ? styles.stepLineActive : styles.stepLineInactive
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          
          {/* Step 1: Email Input */}
          {step === 1 && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.email && styles.inputError
                ]}
                value={email}
                onChangeText={handleEmailChange}
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
          )}

          {/* Step 2: Verification Code */}
          {step === 2 && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.verificationCode && styles.inputError
                ]}
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="Enter 4-digit code"
                keyboardType="number-pad"
                maxLength={4}
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.resendContainer}
                onPress={handleResendCode}
                disabled={loading}
              >
                <Text style={styles.resendText}>Didn't receive code? Resend</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.passwordInput,
                      errors.newPassword && styles.inputError
                    ]}
                    value={newPassword}
                    onChangeText={handleNewPasswordChange}
                    placeholder="Enter new password"
                    secureTextEntry={!showNewPassword}
                    autoComplete="new-password"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    disabled={loading}
                  >
                    <Text style={styles.eyeText}>
                      {showNewPassword ? '🙈' : '👁️'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {errors.newPassword && (
                  <Text style={styles.errorText}>{errors.newPassword}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.passwordInput,
                      errors.confirmPassword && styles.inputError
                    ]}
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    placeholder="Confirm new password"
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
            </>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              (!isStepValid() || loading) && styles.actionButtonDisabled
            ]}
            onPress={
              step === 1 ? handleSendResetCode :
              step === 2 ? handleVerifyCode :
              handleResetPassword
            }
            disabled={!isStepValid() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionButtonText}>
                {step === 1 ? 'Send Reset Code' :
                 step === 2 ? 'Verify Code' :
                 'Reset Password'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Remember your password? </Text>
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
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#2196F3',
  },
  stepCircleInactive: {
    backgroundColor: '#E0E0E0',
  },
  stepText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepTextActive: {
    color: '#FFFFFF',
  },
  stepTextInactive: {
    color: '#757575',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#2196F3',
  },
  stepLineInactive: {
    backgroundColor: '#E0E0E0',
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
  resendContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  resendText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#2196F3',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  actionButtonText: {
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

export default ForgotPasswordScreen;