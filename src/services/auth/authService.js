import * as Crypto from 'expo-crypto';
import databaseService from '../database/databaseService';

class AuthService {
  constructor() {
    this.currentUser = null;
  }

  // Hash password using expo-crypto
  async hashPassword(password) {
    try {
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );
      return hashedPassword;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  // Validate email format
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Register new user
  async register(userData) {
    try {
      // Ensure database is initialized
      if (!databaseService.db) {
        throw new Error('Database not initialized. Please wait and try again.');
      }

      const { email, password, name, currency = 'LKR' } = userData;

      // Validate input
      if (!email || !password || !name) {
        throw new Error('Email, password, and name are required');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Check if user already exists
      const existingUser = await databaseService.getUserByEmail(email.toLowerCase());

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user
      const newUser = await databaseService.createUser(
        email.toLowerCase(),
        hashedPassword,
        name
      );

      this.currentUser = newUser;
      return {
        success: true,
        user: newUser,
        message: 'User registered successfully'
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      // Ensure database is initialized
      if (!databaseService.db) {
        throw new Error('Database not initialized. Please wait and try again.');
      }

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Get user from database
      const user = await databaseService.getUserByEmail(email.toLowerCase());

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Hash the provided password and compare
      const hashedPassword = await this.hashPassword(password);
      
      if (hashedPassword !== user.password_hash) {
        throw new Error('Invalid email or password');
      }

      // Remove password from user object
      const { password_hash, ...userWithoutPassword } = user;
      this.currentUser = userWithoutPassword;

      return {
        success: true,
        user: userWithoutPassword,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  async logout() {
    try {
      this.currentUser = null;
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is logged in
  isLoggedIn() {
    return this.currentUser !== null;
  }

  // Restore session (for app restart)
  async restoreSession() {
    try {
      // For now, just return null - later can implement AsyncStorage
      // This would restore the user session from local storage
      return null;
    } catch (error) {
      console.error('Session restore error:', error);
      return null;
    }
  }
}

export default new AuthService();