import React, { useState } from "react";
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
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { authService } from "../../../services";
import onboardingService from "../../onboarding/services/onboardingService";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
      setErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address",
      }));
    } else {
      setErrors((prev) => ({ ...prev, email: null }));
    }
  };

  // Real-time password validation
  const handlePasswordChange = (text) => {
    setPassword(text);

    if (text.length > 0 && text.length < 6) {
      setErrors((prev) => ({
        ...prev,
        password: "Password must be at least 6 characters",
      }));
    } else {
      setErrors((prev) => ({ ...prev, password: null }));
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      email.trim().length > 0 &&
      password.length > 0 &&
      validateEmail(email.trim()) &&
      password.length >= 6 &&
      !errors.email &&
      !errors.password
    );
  };

  // Handle login
  const handleLogin = async () => {
    // Clear any previous errors
    setErrors({});

    // Validate form before submission
    if (!email.trim()) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      return;
    }

    if (!password) {
      setErrors((prev) => ({ ...prev, password: "Password is required" }));
      return;
    }

    if (!validateEmail(email.trim())) {
      setErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address",
      }));
      return;
    }

    if (password.length < 6) {
      setErrors((prev) => ({
        ...prev,
        password: "Password must be at least 6 characters",
      }));
      return;
    }

    setLoading(true);

    try {
      // Attempt login
      const result = await authService.login(
        email.trim().toLowerCase(),
        password
      );

      if (result.success) {
        // Process any temporary onboarding data that was saved before login
        try {
          await onboardingService.processTemporaryData();
        } catch (tempDataError) {
          console.warn("Error processing temporary data:", tempDataError);
          // Don't block login for temporary data processing errors
        }

        // Check if user needs onboarding
        try {
          const isOnboardingComplete =
            await onboardingService.isOnboardingComplete();

          if (!isOnboardingComplete) {
            // User needs onboarding - navigate to onboarding flow
            navigation.reset({
              index: 0,
              routes: [{ name: "Onboarding" }],
            });
          } else {
            // User has completed onboarding - go to dashboard
            navigation.reset({
              index: 0,
              routes: [{ name: "Dashboard" }],
            });
          }
        } catch (onboardingError) {
          console.warn("Error checking onboarding status:", onboardingError);
          // Default to dashboard if onboarding check fails
          navigation.reset({
            index: 0,
            routes: [{ name: "Dashboard" }],
          });
        }
      } else {
        // Handle specific login failure reasons
        const errorMessage = result.message || "Login failed";

        if (errorMessage.toLowerCase().includes("email")) {
          setErrors((prev) => ({ ...prev, email: errorMessage }));
        } else if (errorMessage.toLowerCase().includes("password")) {
          setErrors((prev) => ({ ...prev, password: errorMessage }));
        } else {
          Alert.alert("Login Failed", errorMessage);
        }
      }
    } catch (error) {
      console.error("Login error:", error);

      // Handle different types of errors
      if (
        error.message.includes("network") ||
        error.message.includes("fetch")
      ) {
        Alert.alert(
          "Connection Error",
          "Please check your internet connection and try again.",
          [
            { text: "Retry", onPress: handleLogin },
            { text: "Cancel", style: "cancel" },
          ]
        );
      } else if (
        error.message.includes("database") ||
        error.message.includes("SQLite")
      ) {
        Alert.alert(
          "Database Error",
          "There was an issue accessing your account data. Please try restarting the app.",
          [{ text: "OK" }]
        );
      } else if (error.message.includes("timeout")) {
        Alert.alert(
          "Request Timeout",
          "The login request took too long. Please try again.",
          [
            { text: "Retry", onPress: handleLogin },
            { text: "Cancel", style: "cancel" },
          ]
        );
      } else {
        // Generic error handling
        const errorMessage =
          error.message || "An unexpected error occurred during login";
        Alert.alert("Login Error", errorMessage, [
          { text: "Try Again", onPress: handleLogin },
          { text: "Cancel", style: "cancel" },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    try {
      navigation.navigate("ForgotPassword");
    } catch (navError) {
      console.error("Navigation error to ForgotPassword:", navError);
      Alert.alert(
        "Navigation Error",
        "Unable to open forgot password screen. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  // Handle sign up
  const handleSignUp = () => {
    try {
      navigation.navigate("SignUp");
    } catch (navError) {
      console.error("Navigation error to SignUp:", navError);
      Alert.alert(
        "Navigation Error",
        "Unable to open sign up screen. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.appTitle}>ExpenseWise</Text>
            <Text style={styles.tagline}>Track Plan Save</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* User Name Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>USERNAME</Text>
              <TextInput
                style={[styles.textInput, errors.email && styles.inputError]}
                value={email}
                onChangeText={handleEmailChange}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.password && styles.inputError,
                  ]}
                  value={password}
                  onChangeText={handlePasswordChange}
                  placeholder="........."
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#9E9E9E"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Remember Me and Forgot Password Row */}
            <View style={styles.rememberForgotContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
                disabled={loading}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}
                >
                  {rememberMe && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>REMEMBER ME</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (!isFormValid() || loading) && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={!isFormValid() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign In Button */}
            <TouchableOpacity style={styles.googleButton} disabled={loading}>
              <View style={styles.googleIcon}>
                <Ionicons name="logo-google" size={20} color="#4285F4" />
              </View>
              <Text style={styles.googleButtonText}>Continue With Google</Text>
            </TouchableOpacity>

            {/* Sign Up Section */}
            <View style={styles.signUpSection}>
              <Text style={styles.signUpTitle}>Don't have an account?</Text>
              <TouchableOpacity onPress={handleSignUp} disabled={loading}>
                <Text style={styles.signUpLink}>Sign Up here</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9ff",
  },
  keyboardView: {
    flex: 1,
  },
  // scrollContainer: {
  //   flexGrow: 1,
  //   justifyContent: 'center',
  //   paddingHorizontal: 24,
  //   paddingVertical: 40,
  // },
  header: {
    alignItems: "center",
    marginBottom: 60,
    paddingTop: 40,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#1976D2",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    fontWeight: "600",
    color: "#424242",
    letterSpacing: 1,
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#757575",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  textInput: {
    height: 56,
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#E8F4FD",
    color: "#424242",
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#F44336",
  },
  passwordContainer: {
    position: "relative",
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 0,
    height: 56,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#F44336",
    fontSize: 12,
    marginTop: 4,
  },
  rememberForgotContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#BDBDBD",
    borderRadius: 4,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: "#1976D2",
    borderColor: "#1976D2",
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#757575",
    letterSpacing: 0.5,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1976D2",
    textDecorationLine: "underline",
  },
  loginButton: {
    backgroundColor: "#1976D2",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#1976D2",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: "#BDBDBD",
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    fontSize: 14,
    color: "#757575",
    marginHorizontal: 16,
    fontWeight: "500",
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    height: 56,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    width: 28,
    height: 28,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
  },
  googleIconText: {
    fontSize: 12,
  },
  googleButtonText: {
    color: "#424242",
    fontSize: 16,
    fontWeight: "600",
  },
  signUpSection: {
    alignItems: "center",
  },
  signUpTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#424242",
    marginBottom: 8,
  },
  signUpLink: {
    fontSize: 16,
    color: "#1976D2",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});

export default LoginScreen;
