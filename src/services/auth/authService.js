import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import databaseService from '../database/databaseService';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authToken = null;
  }

  // Hash password using Expo Crypto
  async hashPassword(password) {
    try {
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + 'expensewise_salt' // Simple salt
      );
      return hashedPassword;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Password hashing failed');
    }
  }

  // Generate simple JWT-like token
  generateToken(userId) {
    const payload = {
      userId: userId,
      timestamp: Date.now(),
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    // Simple base64 encoding (in production, use proper JWT)
    return btoa(JSON.stringify(payload));
  }

  // Verify token
  verifyToken(token) {
    try {
      const payload = JSON.parse(atob(token));
      
      // Check if token is expired
      if (Date.now() > payload.exp) {
        return null;
      }
      
      return payload;
    } catch (error) {
      console.error('Invalid token:', error);
      return null;
    }
  }

  // Email validation
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  // Password validation
  validatePassword(password) {
    return {
      isValid: password.length >= 6,
      minLength: password.length >= 6,
      message: password.length < 6 ? 'Password must be at least 6 characters' : ''
    };
  }

  // Register new user
  async register(email, password, name) {
    try {
      // Validate inputs
      const trimmedEmail = email.trim().toLowerCase();
      
      if (!this.validateEmail(trimmedEmail)) {
        throw new Error('Please enter a valid email address');
      }

      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.message);
      }

      if (!name.trim()) {
        throw new Error('Please enter your name');
      }

      // Check if user already exists
      const existingUser = await databaseService.getUserByEmail(trimmedEmail);
      if (existingUser) {
        throw new Error('An account with this email already exists');
      }

      // Hash password and create user
      const passwordHash = await this.hashPassword(password);
      const user = await databaseService.createUser(trimmedEmail, passwordHash, name.trim());

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        message: 'Account created successfully'
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.message || 'Registration failed'
      };
    }
  }

  // Login user
  async login(email, password) {
    try {
      // Validate inputs
      const trimmedEmail = email.trim().toLowerCase();
      
      if (!this.validateEmail(trimmedEmail)) {
        throw new Error('Please enter a valid email address');
      }

      if (!password) {
        throw new Error('Please enter your password');
      }

      // Get user from database
      const user = await databaseService.getUserByEmail(trimmedEmail);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const passwordHash = await this.hashPassword(password);
      if (passwordHash !== user.password_hash) {
        throw new Error('Invalid email or password');
      }

      // Generate token and store session
      const token = this.generateToken(user.id);
      await this.storeSession(token, user);

      this.currentUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        currency: user.currency
      };
      this.authToken = token;

      return {
        success: true,
        user: this.currentUser,
        token: token,
        message: 'Login successful'
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.message || 'Login failed'
      };
    }
  }

  // Forgot password (mock implementation)
  async forgotPassword(email) {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      if (!this.validateEmail(trimmedEmail)) {
        throw new Error('Please enter a valid email address');
      }

      // Check if user exists (don't reveal if email exists for security)
      const user = await databaseService.getUserByEmail(trimmedEmail);
      
      // Always return success to prevent email enumeration
      return {
        success: true,
        message: 'If an account with this email exists, you will receive a password reset link shortly.'
      };

    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        message: 'An error occurred. Please try again.'
      };
    }
  }

  // Store session in AsyncStorage
  async storeSession(token, user) {
    try {
      await AsyncStorage.multiSet([
        ['authToken', token],
        ['currentUser', JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
          currency: user.currency
        })]
      ]);
    } catch (error) {
      console.error('Error storing session:', error);
      throw new Error('Failed to save session');
    }
  }

  // Restore session from AsyncStorage
  async restoreSession() {
    try {
      const [token, userString] = await AsyncStorage.multiGet(['authToken', 'currentUser']);
      
      if (token[1] && userString[1]) {
        const tokenPayload = this.verifyToken(token[1]);
        
        if (tokenPayload) {
          this.authToken = token[1];
          this.currentUser = JSON.parse(userString[1]);
          
          return {
            success: true,
            user: this.currentUser,
            token: this.authToken
          };
        }
      }

      // If token is invalid or expired, clear session
      await this.clearSession();
      return { success: false };

    } catch (error) {
      console.error('Error restoring session:', error);
      await this.clearSession();
      return { success: false };
    }
  }

  // Logout
  async logout() {
    try {
      await this.clearSession();
      this.currentUser = null;
      this.authToken = null;
      
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Logout failed'
      };
    }
  }

  // Clear session
  async clearSession() {
    try {
      await AsyncStorage.multiRemove(['authToken', 'currentUser']);
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null && this.authToken !== null;
  }

  // Get auth headers for API calls
  getAuthHeaders() {
    return this.authToken ? {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;