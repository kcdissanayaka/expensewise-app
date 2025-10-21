import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import databaseService from '../database/databaseService';
import DataValidator from '../../utils/dataValidator';
import ConflictResolver from '../../utils/conflictResolver';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authToken = null;
  }

  // JWT Token Management
  async saveToken(token) {
    try {
      await AsyncStorage.setItem('@ExpenseWise:authToken', token);
      this.authToken = token;
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  async getToken() {
    try {
      if (this.authToken) return this.authToken;
      const token = await AsyncStorage.getItem('@ExpenseWise:authToken');
      this.authToken = token;
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async removeToken() {
    try {
      await AsyncStorage.removeItem('@ExpenseWise:authToken');
      this.authToken = null;
    } catch (error) {
      console.error('Error removing token:', error);
    }
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
      // Ensure database is initialized
      const initialized = await databaseService.ensureInitialized();
      if (!initialized) {
        throw new Error('Database not initialized');
      }

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

      // Ensure database is initialized
      const initialized = await databaseService.ensureInitialized();
      if (!initialized) {
        throw new Error('Database not initialized');
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

      // Ensure database is initialized
      const initialized = await databaseService.ensureInitialized();
      if (!initialized) {
        throw new Error('Database not initialized');
      }

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

  // Register new user - HYBRID: Try API-first, fallback to local
  async register(userData) {
    try {
      
      // Step 1: Validate input data
      const validationResult = DataValidator.validateUser(userData);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }
      
      // Step 2: Sanitize data
      const sanitizedData = DataValidator.sanitizeData(userData, 'user');
      
      const { email, password, firstName, lastName, name, currency = 'EUR', monthlyBudget = 0, monthlyIncome = 0 } = sanitizedData;

      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Support both name formats (legacy single name or firstName/lastName)
      const finalFirstName = firstName || name?.split(' ')[0] || '';
      const finalLastName = lastName || name?.split(' ').slice(1).join(' ') || '';

      if (!finalFirstName) {
        throw new Error('First name is required');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Check password complexity for API compatibility
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }

      // TRY API-FIRST (for security and server sync)
      try {
        const apiService = (await import('../api/apiService')).default;

        // Prepare API registration data (backend expects 'name' field, not firstName/lastName)
        const apiRegistrationData = {
          email: email.toLowerCase(),
          password,
          name: `${finalFirstName} ${finalLastName}`.trim(), // Backend expects combined name
          monthlyBudget: monthlyBudget || 0,
          monthlyIncome: monthlyIncome || 0,
          confirmPassword: password // API expects password confirmation
        };

        const apiResponse = await apiService.registerWithAPI(apiRegistrationData);
        
        if (apiResponse.success && apiResponse.data?.user && apiResponse.token) {
          
          // Save JWT token
          await this.saveToken(apiResponse.token);
          
          // Save user data
          await this.saveUserData(apiResponse.data.user);
          
          // Sync to local database for offline access
          await this.syncUserDataLocally(apiResponse.data.user);
          
          this.currentUser = apiResponse.data.user;
          return {
            success: true,
            user: apiResponse.data.user,
            message: 'Registration successful (synced with server)',
            source: 'api',
            token: apiResponse.token
          };
        }
      } catch (apiError) {
        // If it's a user already exists error, don't fallback
        if (apiError.message?.includes('already exists')) {
          throw apiError;
        }
      }

      // FALLBACK TO LOCAL (offline mode)
      
      // Ensure database is initialized
      const initialized = await databaseService.ensureInitialized();
      if (!initialized) {
        throw new Error('Database not initialized and API unavailable');
      }

      // Check if user already exists locally
      const existingUser = await databaseService.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user locally
      const localUserData = {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: `${finalFirstName} ${finalLastName}`.trim(),
        currency,
        monthlyBudget: monthlyBudget || 0,
        monthlyIncome: monthlyIncome || 0
      };

      const newUser = await databaseService.createUser(
        localUserData.email,
        localUserData.password,
        localUserData.name,
        localUserData.currency
      );

      this.currentUser = newUser;

      return {
        success: true,
        user: newUser,
        message: 'Registration successful (offline mode - will sync when online)',
        source: 'local'
      };
    } catch (error) {
      throw error;
    }
  }

  // Authenticate user with email/password - tries backend API first, falls back to local database if offline
  async login(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Try API-first authentication
      try {
        const apiService = (await import('../api/apiService')).default;
        const apiResponse = await apiService.loginWithAPI(email, password);
        
        // Check for successful login
        if (apiResponse.user && apiResponse.token) {
          // Save the API token
          if (apiResponse.token) {
            await this.saveToken(apiResponse.token);
          }
          
          // Get local user data for conflict resolution
          const localUser = await databaseService.getUserByEmail(email.toLowerCase());
          
          if (localUser) {
            // Check for conflicts between local and remote data
            const hasConflicts = ConflictResolver.hasConflict(localUser, apiResponse.user);
            
            if (hasConflicts) {
              // Resolve conflicts using recommended strategy for user profile
              const strategy = ConflictResolver.getRecommendedStrategy(localUser, apiResponse.user, 'profile');
              const resolvedUser = ConflictResolver.resolveConflict(localUser, apiResponse.user, strategy);
              
              await this.syncUserDataLocally(resolvedUser);
              this.currentUser = resolvedUser;
              await this.saveUserData(resolvedUser);
            } else {
              // No conflicts, just sync the API data
              await this.syncUserDataLocally(apiResponse.user);
              this.currentUser = apiResponse.user;
              await this.saveUserData(apiResponse.user);
            }
          } else {
            // No local user, create from API data and save
            await this.createUserFromApiData(apiResponse.user);
            this.currentUser = apiResponse.user;
            await this.saveUserData(apiResponse.user);
          }
          
          return {
            success: true,
            user: this.currentUser,
            message: 'Login successful (synced with server)',
            source: 'api',
            conflictsResolved: localUser ? ConflictResolver.hasConflict(localUser, apiResponse.user) : false
          };
        }
      } catch (apiError) {
        // Fallback to local authentication
      }
      
      // Ensure database is initialized
      const initialized = await databaseService.ensureInitialized();
      if (!initialized) {
        throw new Error('Database not initialized and API unavailable');
      }

      // Get user from local database
      const user = await databaseService.getUserByEmail(email.toLowerCase());

      if (!user) {
        throw new Error('User not found. Please register first.');
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
        message: 'Login successful (offline mode)',
        source: 'local'
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Sync user data from API to local database
  async syncUserDataLocally(apiUser) {
    try {
      const initialized = await databaseService.ensureInitialized();
      if (!initialized) return;

      // Update or create local user record
      const existingUser = await databaseService.getUserByEmail(apiUser.email);
      
      if (existingUser) {
        // Update existing user
        await databaseService.db.runAsync(
          'UPDATE users SET name = ?, currency = ?, financial_goals = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [apiUser.name, apiUser.currency, apiUser.financial_goals, existingUser.id]
        );
      } else {
        // Create new user (this shouldn't happen in normal flow, but handle gracefully)
        await this.createUserFromApiData(apiUser);
      }
    } catch (error) {
      console.error('Error syncing user data locally:', error);
      // Don't throw - authentication can still succeed
    }
  }

  // Create local user from API data
  async createUserFromApiData(apiUser) {
    try {
      const initialized = await databaseService.ensureInitialized();
      if (!initialized) return;

      // Create local user record from API data
      await databaseService.db.runAsync(`
        INSERT INTO users (name, email, password_hash, currency, financial_goals, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        apiUser.name, 
        apiUser.email, 
        'api_user', // Placeholder since we don't have the hash
        apiUser.currency || 'EUR', 
        apiUser.financial_goals || null
      ]);
    } catch (error) {
      console.error('Error creating user from API data:', error);
      // Don't throw - authentication can still succeed
    }
  }

  // Logout user
  async logout() {
    try {
      await this.clearAuthData();
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Update user - updates local DB, optionally hashes password
  async updateUser(userId, updateData) {
    try {
      // If password is provided, hash it and update password separately
      if (updateData.password) {
        const hashed = await this.hashPassword(updateData.password);
        // Update password in DB
        await databaseService.updateUserPassword(userId, hashed);
        // Remove password from updateData to avoid attempting to write into email/name query
        delete updateData.password;
      }

      // Delegate to database service for name/email updates and queue sync
      const updatedUser = await databaseService.updateUser(userId, updateData);

      // Persist updated user in authService storage
      await this.saveUserData(updatedUser);

      // Update in-memory currentUser
      this.currentUser = updatedUser;

      return updatedUser;
    } catch (error) {
      console.error('Error in authService.updateUser:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is logged in
  async isLoggedIn() {
    const token = await this.getToken();
    return this.currentUser !== null && token !== null;
  }

  // Restore session (for app restart)
  async restoreSession() {
    try {
      const token = await this.getToken();
      const userDataString = await AsyncStorage.getItem('@ExpenseWise:userData');
          
      if (token && userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          // Validate that user data has required fields
          if (userData && userData.id && userData.email) {
            this.currentUser = userData;
            this.authToken = token;
            return this.currentUser;
          } else {
            await this.clearAuthData();
            return null;
          }
        } catch (parseError) {
          await this.clearAuthData();
          return null;
        }
      }
      
      // Clear any incomplete auth data
      if (token && !userDataString) {
        await this.removeToken();
      } else if (!token && userDataString) {
        await AsyncStorage.removeItem('@ExpenseWise:userData');
      }
      
      this.currentUser = null;
      this.authToken = null;
      return null;
    } catch (error) {
      console.error('Session restore error:', error);
      await this.clearAuthData();
      return null;
    }
  }

  // Save user data
  async saveUserData(userData) {
    try {
      await AsyncStorage.setItem('@ExpenseWise:userData', JSON.stringify(userData));
      this.currentUser = userData;
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }

  // Clear all auth data
  async clearAuthData() {
    try {
      await AsyncStorage.multiRemove(['@ExpenseWise:authToken', '@ExpenseWise:userData']);
      this.authToken = null;
      this.currentUser = null;
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }
}

export default new AuthService();