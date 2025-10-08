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

  // Store reset code in database
  async storeResetCode(email, code) {
    try {
      // Create password_resets table if not exists
      await databaseService.db.execAsync(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          code TEXT NOT NULL,
          expires_at DATETIME DEFAULT (datetime('now', '+1 hour')),
          used BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert or update reset code
      await databaseService.db.runAsync(`
        INSERT OR REPLACE INTO password_resets (email, code, expires_at, used) 
        VALUES (?, ?, datetime('now', '+1 hour'), 0)
      `, [email.toLowerCase(), code]);
    } catch (error) {
      console.error('Error storing reset code:', error);
      throw error;
    }
  }

  // Forgot password - display reset code directly to user
  async forgotPassword(email) {
    try {
      if (!email || !this.validateEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Check if user exists
      const user = await databaseService.getUserByEmail(email.toLowerCase());
      if (!user) {
        throw new Error('No account found with this email address');
      }

      // Generate reset code
      const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Store reset code in database
      await this.storeResetCode(email, resetCode);

      // Return the code directly to display to user
      return {
        success: true,
        message: `Your password reset code is: ${resetCode}\n\nThis code will expire in 1 hour.`,
        code: resetCode
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  // Verify reset code from database
  async verifyResetCode(email, code) {
    try {
      if (!email || !code) {
        throw new Error('Email and verification code are required');
      }

      if (code.length !== 4) {
        throw new Error('Verification code must be 4 digits');
      }

      // Check if user exists
      const user = await databaseService.getUserByEmail(email.toLowerCase());
      if (!user) {
        throw new Error('Invalid email address');
      }

      // Check if code exists and is valid
      const resetRecord = await databaseService.db.getFirstAsync(`
        SELECT * FROM password_resets 
        WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime('now')
        ORDER BY created_at DESC LIMIT 1
      `, [email.toLowerCase(), code]);

      if (!resetRecord) {
        throw new Error('Invalid or expired verification code');
      }

      return {
        success: true,
        message: 'Code verified successfully'
      };
    } catch (error) {
      console.error('Verify code error:', error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(email, code, newPassword) {
    try {
      if (!email || !code || !newPassword) {
        throw new Error('All fields are required');
      }

      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (code.length !== 4) {
        throw new Error('Invalid verification code');
      }

      // Verify code again
      await this.verifyResetCode(email, code);

      // Get user
      const user = await databaseService.getUserByEmail(email.toLowerCase());
      if (!user) {
        throw new Error('Invalid email address');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user password
      await databaseService.updateUserPassword(user.id, hashedPassword);

      // Mark reset code as used
      await databaseService.db.runAsync(`
        UPDATE password_resets SET used = 1 WHERE email = ? AND code = ?
      `, [email.toLowerCase(), code]);

      return {
        success: true,
        message: 'Password reset successfully. You can now login with your new password.'
      };
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  // Register new user
  async register(userData) {
    try {
      // Ensure database is initialized
      const initialized = await databaseService.ensureInitialized();
      if (!initialized) {
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
      const initialized = await databaseService.ensureInitialized();
      if (!initialized) {
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