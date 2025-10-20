import * as SQLite from 'expo-sqlite';
import { DEFAULT_DB_CATEGORIES } from '../../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const clearSyncQueue = async () => {
  await AsyncStorage.setItem('sync_queue', '[]');
  console.log('Sync queue cleared');
};

// Call this function once
clearSyncQueue();

// Database service for ExpenseWise app
class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitializing = false;
  }

  async ensureInitialized() {
    if (this.db) {
      try {
        // Test the connection
        await this.db.getFirstAsync('SELECT 1');
        return true;
      } catch (error) {
        console.warn('Database connection test failed, reinitializing...', error);
        this.db = null;
      }
    }

    if (this.isInitializing) {
      // Wait for ongoing initialization
      let retries = 0;
      while (this.isInitializing && retries < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      return !!this.db;
    }

    return await this.initialize();
  }

  async initialize() {
    if (this.isInitializing) {
      return false;
    }

    try {
      this.isInitializing = true;
      
      // Close existing connection if any
      if (this.db) {
        try {
          await this.db.closeAsync();
        } catch (error) {
          console.warn('Error closing existing database connection:', error);
        }
        this.db = null;
      }
      
      // Open database connection
      this.db = await SQLite.openDatabaseAsync('expensewise.db');
      
      if (!this.db) {
        throw new Error('Failed to open database connection');
      }
      
      // Test the connection immediately
      await this.db.getFirstAsync('SELECT 1');
      
      // Create all tables
      await this.createTables();
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      this.db = null; // Reset on failure
      throw error; // Propagate error for proper handling
    } finally {
      this.isInitializing = false;
    }
  }

  // Reset database 
  async resetDatabase() {
    try {
      if (this.db) {
        await this.db.closeAsync();
      }
      await SQLite.deleteDatabaseAsync('expensewise.db');
      this.db = await SQLite.openDatabaseAsync('expensewise.db');
      await this.createTables();
      return true;
    } catch (error) {
      console.error('Database reset failed:', error);
      return false;
    }
  }

  async createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        currency TEXT DEFAULT 'EUR',
        financial_goals TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#2196F3',
        icon TEXT DEFAULT 'category',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Income table
      `CREATE TABLE IF NOT EXISTS income (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        source TEXT,
        frequency TEXT DEFAULT 'monthly',
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT 1,
        is_archived BOOLEAN DEFAULT 0,
        needs_sync BOOLEAN DEFAULT 1,
        api_id TEXT,
        synced_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Expenses table
      `CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date DATE,
        status TEXT DEFAULT 'Pending',
        type TEXT DEFAULT 'Regular',
        is_archived BOOLEAN DEFAULT 0,
        needs_sync BOOLEAN DEFAULT 1,
        api_id TEXT,
        synced_at DATETIME,
        is_recurring BOOLEAN DEFAULT 0,       -- NEW COLUMN
        recurrence_end DATE,                  -- NEW COLUMN
        is_active BOOLEAN DEFAULT 1,          -- NEW COLUMN
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )`,
      
      // Allocation templates table
      `CREATE TABLE IF NOT EXISTS allocation_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Allocation buckets table
      `CREATE TABLE IF NOT EXISTS allocation_buckets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        percentage REAL NOT NULL,
        target_amount REAL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES allocation_templates (id)
      )`,

      // Distribution records table
      `CREATE TABLE IF NOT EXISTS distributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        income_id INTEGER NOT NULL,
        bucket_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (income_id) REFERENCES income (id),
        FOREIGN KEY (bucket_id) REFERENCES allocation_buckets (id)
      )`,

      // User preferences table
      `CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        notification_due_reminder BOOLEAN DEFAULT 1,
        notification_allocation_reminder BOOLEAN DEFAULT 1,
        notification_summary BOOLEAN DEFAULT 1,
        notification_frequency TEXT DEFAULT 'weekly',
        theme TEXT DEFAULT 'light',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Onboarding progress table
      `CREATE TABLE IF NOT EXISTS onboarding_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        step INTEGER DEFAULT 0,
        is_completed BOOLEAN DEFAULT 0,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`
    ];

    for (const table of tables) {
      await this.db.execAsync(table);
    }

    // Add financial_goals column if it doesn't exist (for existing databases)
    try {
      await this.db.execAsync(`
        ALTER TABLE users ADD COLUMN financial_goals TEXT
      `);
    } catch (error) {
      // Column already exists - this is fine
    }

    // Add frequency column to income table if it doesn't exist
    try {
      await this.db.execAsync(`
        ALTER TABLE income ADD COLUMN frequency TEXT DEFAULT 'monthly'
      `);
    } catch (error) {
      // Column already exists - this is fine
    }

    // Add sync columns to expenses table if they don't exist
    try {
      await this.db.execAsync(`ALTER TABLE expenses ADD COLUMN needs_sync BOOLEAN DEFAULT 1`);
      await this.db.execAsync(`ALTER TABLE expenses ADD COLUMN api_id TEXT`);
      await this.db.execAsync(`ALTER TABLE expenses ADD COLUMN synced_at DATETIME`);
    } catch (error) {
      // Columns already exist - this is fine
    }

    // Add sync columns to income table if they don't exist
    try {
      await this.db.execAsync(`ALTER TABLE income ADD COLUMN needs_sync BOOLEAN DEFAULT 1`);
      await this.db.execAsync(`ALTER TABLE income ADD COLUMN api_id TEXT`);
      await this.db.execAsync(`ALTER TABLE income ADD COLUMN synced_at DATETIME`);
    } catch (error) {
      // Columns already exist - this is fine
    }

    try { await this.db.execAsync(`ALTER TABLE expenses ADD COLUMN is_recurring BOOLEAN DEFAULT 0`); } catch {}
    try { await this.db.execAsync(`ALTER TABLE expenses ADD COLUMN recurrence_end DATE`); } catch {}
    try { await this.db.execAsync(`ALTER TABLE expenses ADD COLUMN is_active BOOLEAN DEFAULT 1`); } catch {}

    // Insert default categories
  }

  // User operations
  async createUser(email, passwordHash, name) {
    try {
      // Ensure database is initialized
      const initialized = await this.ensureInitialized();
      if (!initialized) {
        throw new Error('Failed to initialize database');
      }

      const result = await this.db.runAsync(
        'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
        [email, passwordHash, name]
      );

      // Create default categories for new user
      const defaultCategories = DEFAULT_DB_CATEGORIES;
      for (const category of defaultCategories) {
        await this.db.runAsync(
          'INSERT INTO categories (user_id, name, color, icon) VALUES (?, ?, ?, ?)',
          [result.lastInsertRowId, category.name, category.color, category.icon]
        );
      }

      // Create default preferences
      await this.db.runAsync(
        'INSERT INTO user_preferences (user_id) VALUES (?)',
        [result.lastInsertRowId]
      );

      return { id: result.lastInsertRowId, email, name };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      // Ensure database is initialized
      const initialized = await this.ensureInitialized();
      if (!initialized) {
        throw new Error('Failed to initialize database');
      }

      if (!this.db) {
        throw new Error('Database connection is null');
      }

      const result = await this.db.getFirstAsync(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      return result;
    } catch (error) {
      
      // Try to reinitialize database on error
      if (error.message.includes('NullPointerException') || error.message.includes('database')) {
        this.db = null;
        const retryResult = await this.ensureInitialized();
        if (retryResult) {
          const result = await this.db.getFirstAsync(
            'SELECT * FROM users WHERE email = ?',
            [email]
          );
          return result;
        }
      }
      
      throw error;
    }
  }

  async getUserById(id) {
    try {
      // Ensure database is initialized
      const initialized = await this.ensureInitialized();
      if (!initialized) {
        throw new Error('Failed to initialize database');
      }

      const result = await this.db.getFirstAsync(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      return result;
    } catch (error) {
      console.error('Error getting user by id:', error);
      throw error;
    }
  }

  // Update user password
  async updateUserPassword(userId, newHashedPassword) {
    try {
      const result = await this.db.runAsync(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newHashedPassword, userId]
      );
      return result;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  // Income operations - LOCAL-FIRST with sync
  async createIncome(userId, incomeData) {
    try {
      // Ensure database is initialized
      const isInitialized = await this.ensureInitialized();
      if (!isInitialized || !this.db) {
        throw new Error('Database not initialized or connection failed');
      }
      
      // Validate required data
      if (!userId || !incomeData) {
        throw new Error('User ID and income data are required');
      }
      
      const { amount, type, source, startDate, endDate, frequency } = incomeData;
      
      // Validate required fields
      if (!amount || amount <= 0) {
        throw new Error('Valid income amount is required');
      }
      
      if (!type) {
        throw new Error('Income type is required');
      }
      
      if (!source) {
        throw new Error('Income source is required');
      }
      
      // Save to local SQLite immediately
      const result = await this.db.runAsync(
        'INSERT INTO income (user_id, amount, type, source, start_date, end_date, frequency, needs_sync, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [userId, amount, type, source, startDate || null, endDate || null, frequency || 'monthly', 1]
      );
      
      const newIncome = { 
        id: result.lastInsertRowId, 
        userId,
        ...incomeData,
        needs_sync: true
      };
      
      // Queue for background sync
      const { default: syncManager } = await import('../sync/syncManager');
      syncManager.queueForSync('income', 'create', newIncome);
      
      return newIncome;
    } catch (error) {
      console.error('Error creating income:', error);
      
      // Re-initialize database if connection was lost
      if (error.message.includes('database') || error.message.includes('connection')) {
        this.db = null;
        await this.ensureInitialized();
      }
      
      throw error;
    }
  }

  async getIncomeByUser(userId) {
    try {
      await this.ensureInitialized();
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      const result = await this.db.getAllAsync(
        'SELECT * FROM income WHERE user_id = ? AND is_archived = 0 ORDER BY created_at DESC',
        [userId]
      );
      return result;
    } catch (error) {
      console.error('Error getting income:', error);
      throw error;
    }
  }

  // Update income - LOCAL-FIRST with sync
async updateIncome(incomeId, updateData) {
  try {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const { amount, source, type, frequency, startDate } = updateData;
    
    // Validate required fields
    if (!amount || amount <= 0) {
      throw new Error('Valid income amount is required');
    }
    
    if (!type) {
      throw new Error('Income type is required');
    }
    
    if (!source) {
      throw new Error('Income source is required');
    }
    
    // Update locally immediately
    await this.db.runAsync(
      'UPDATE income SET amount = ?, source = ?, type = ?, frequency = ?, start_date = ?, needs_sync = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [amount, source, type, frequency, startDate, incomeId]
    );
    
    // CRITICAL FIX: Get the FULL updated record including api_id
    const updatedIncome = await this.db.getFirstAsync(
      'SELECT * FROM income WHERE id = ?',
      [incomeId]
    );
    
    // Queue for sync with the complete record (including api_id)
    const { default: syncManager } = await import('../sync/syncManager');
    syncManager.queueForSync('income', 'update', updatedIncome);
    
    return updatedIncome;
  } catch (error) {
    console.error('Error updating income:', error);
    throw error;
  }
}

// Fix records with missing api_id
async fixMissingApiIds(userId) {
  try {
    await this.ensureInitialized();
    
    // Find incomes that were created but never got an api_id
    const brokenIncomes = await this.db.getAllAsync(
      'SELECT * FROM income WHERE user_id = ? AND (api_id IS NULL OR api_id = "") AND needs_sync = 1',
      [userId]
    );
    
    console.log(`Found ${brokenIncomes.length} incomes with missing api_id`);
    
    // Re-queue them for creation (they'll get proper api_id)
    const { default: syncManager } = await import('../sync/syncManager');
    
    for (const income of brokenIncomes) {
      console.log('Re-queuing income for sync:', income.id, income.source);
      syncManager.queueForSync('income', 'create', income);
    }
    
    return brokenIncomes.length;
  } catch (error) {
    console.error('Error fixing missing api_ids:', error);
    return 0;
  }
}

// Delete income - LOCAL-FIRST with sync
async deleteIncome(incomeId) {
  try {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // Get income data before deletion (for API sync) - FIXED QUERY
    const income = await this.db.getFirstAsync(
      'SELECT * FROM income WHERE id = ?', 
      [incomeId]
    );
    
    if (!income) {
      console.log('Income not found for deletion:', incomeId);
      return false;
    }
    
    console.log('Deleting income with data:', {
      id: income.id,
      api_id: income.api_id,
      source: income.source
    });
    
    // Delete locally immediately
    await this.db.runAsync('DELETE FROM income WHERE id = ?', [incomeId]);
    
    // Queue for sync (if it was previously synced OR if it has api_id)
    if (income && income.api_id) {
      const { default: syncManager } = await import('../sync/syncManager');
      syncManager.queueForSync('income', 'delete', income);
      console.log('Queued income for deletion sync:', income.api_id);
    } else {
      console.log('Income not queued for sync - no api_id found:', incomeId);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting income:', error);
    throw error;
  }
}

  

  // Expense operations - LOCAL-FIRST with sync
  async createDefaultCategoriesForUser(userId) {
  try {
    await this.ensureInitialized();
    const defaults = DEFAULT_DB_CATEGORIES;

    for (const c of defaults) {
      await this.db.runAsync(
        'INSERT INTO categories (user_id, name, color, icon, is_active, created_at) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)',
        [userId, c.name, c.color, c.icon]
      );
    }
    console.log('[CAT] Created default categories for user:', userId);
  } catch (err) {
    console.error('[CAT] Create defaults error:', err);
  }
}

  async createExpense(userId, expenseData) {
    try {
      await this.ensureInitialized();
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      const {
  categoryId, amount, title, description,
  dueDate, status, type,
  isRecurring, recurrenceEnd, isActive
} = expenseData;

        const result = await this.db.runAsync(
          `INSERT INTO expenses (
            user_id, category_id, amount, title, description, due_date, status, type,
            is_recurring, recurrence_end, is_active,
            needs_sync, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
          [
            userId, categoryId, amount, title,
            description || null, dueDate || null, status || 'Pending', type || 'Regular',
            isRecurring ? 1 : 0, recurrenceEnd || null, isActive === 0 ? 0 : 1
          ]
        );

      console.log('[DB] Created expense (local)', {
          id: result.lastInsertRowId,
          userId,
          ...expenseData,
          needs_sync: true
        });
      
      const newExpense = { 
        id: result.lastInsertRowId, 
        userId,
        ...expenseData,
        needs_sync: true
      };
      
      // Queue for background sync
      const { default: syncManager } = await import('../sync/syncManager');
      syncManager.queueForSync('expense', 'create', newExpense);
      
      return newExpense;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  async getExpensesByUser(userId, filters = {}) {
    try {
      await this.ensureInitialized();
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      let query = `
        SELECT e.*, c.name as category_name, c.color as category_color 
        FROM expenses e 
        JOIN categories c ON e.category_id = c.id 
        WHERE e.user_id = ? AND e.is_archived = 0 AND e.is_active = 1
      `;
      
      const params = [userId];

      if (filters.status) {
        query += ' AND e.status = ?';
        params.push(filters.status);
      }

      if (filters.categoryId) {
        query += ' AND e.category_id = ?';
        params.push(filters.categoryId);
      }

      if (filters.startDate && filters.endDate) {
        query += ' AND e.due_date BETWEEN ? AND ?';
        params.push(filters.startDate, filters.endDate);
      }

      query += ' ORDER BY e.due_date ASC';

      const result = await this.db.getAllAsync(query, params);
      return result;
    } catch (error) {
      console.error('Error getting expenses:', error);
      throw error;
    }
  }
// hide Exepnces it is no more requierd expence
  async stopExpense(expenseId) {
  await this.ensureInitialized();
  await this.db.runAsync(
    `UPDATE expenses SET is_active = 0, needs_sync = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [expenseId]
  );
  const row = await this.db.getFirstAsync('SELECT * FROM expenses WHERE id = ?', [expenseId]);
  const { default: syncManager } = await import('../sync/syncManager');
  syncManager.queueForSync('expense', 'update', row);
  return true;
}

  // Categories operations
  async getCategoriesByUser(userId) {
    try {
      await this.ensureInitialized();
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      const result = await this.db.getAllAsync(
        'SELECT * FROM categories WHERE user_id = ? AND is_active = 1 ORDER BY name ASC',
        [userId]
      );
      return result;
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }

  // Dashboard totals
  async getDashboardTotals(userId, month = null, year = null) {
    try {
      await this.ensureInitialized();
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      const currentDate = new Date();
      const targetMonth = month || currentDate.getMonth() + 1;
      const targetYear = year || currentDate.getFullYear();

      // Validate that we have valid month and year values
      if (!targetMonth || !targetYear || isNaN(targetMonth) || isNaN(targetYear)) {
        throw new Error('Invalid month or year parameters');
      }

      // Get total income for the month
      const incomeResult = await this.db.getFirstAsync(`
        SELECT COALESCE(SUM(amount), 0) as total_income 
        FROM income 
        WHERE user_id = ? AND is_archived = 0
        AND strftime('%m', created_at) = ? 
        AND strftime('%Y', created_at) = ?
      `, [userId, String(targetMonth).padStart(2, '0'), String(targetYear)]);

      // Get total expenses by status for the month
      const expenseResult = await this.db.getAllAsync(`
        SELECT status, COALESCE(SUM(amount), 0) as total 
        FROM expenses 
        WHERE user_id = ? AND is_archived = 0 AND is_active = 1
        AND strftime('%m', due_date) = ? 
        AND strftime('%Y', due_date) = ?
        GROUP BY status
      `, [userId, String(targetMonth).padStart(2, '0'), String(targetYear)]);

      const expenses = {
        pending: 0,
        paid: 0,
        onHold: 0,
        ignored: 0
      };

      expenseResult.forEach(row => {
        const status = row.status.toLowerCase().replace(' ', '');
        if (expenses.hasOwnProperty(status)) {
          expenses[status] = row.total;
        }
      });

      const totalExpenses = Object.values(expenses).reduce((sum, amount) => sum + amount, 0);

      return {
        income: incomeResult.total_income,
        expenses: expenses,
        totalExpenses: totalExpenses,
        remaining: incomeResult.total_income - expenses.paid,
        month: targetMonth,
        year: targetYear
      };
    } catch (error) {
      console.error('Error getting dashboard totals:', error);
      throw error;
    }
  }

  // Get allocation data for user
  async getAllocationsByUser(userId) {
    try {
      const initialized = await this.ensureInitialized();
      if (!initialized) {
        throw new Error('Failed to initialize database');
      }

      const result = await this.db.getAllAsync(`
        SELECT 
          at.id as template_id,
          at.name as template_name,
          ab.id as bucket_id,
          ab.name as bucket_name,
          ab.percentage,
          ab.target_amount,
          ab.is_active
        FROM allocation_templates at
        LEFT JOIN allocation_buckets ab ON at.id = ab.template_id
        WHERE at.user_id = ? AND at.is_active = 1
        ORDER BY at.id, ab.percentage DESC
      `, [userId]);

      // Group by templates
      const templates = {};
      result.forEach(row => {
        if (!templates[row.template_id]) {
          templates[row.template_id] = {
            id: row.template_id,
            name: row.template_name,
            buckets: []
          };
        }
        
        if (row.bucket_id) {
          templates[row.template_id].buckets.push({
            id: row.bucket_id,
            name: row.bucket_name,
            percentage: row.percentage,
            target_amount: row.target_amount,
            is_active: row.is_active
          });
        }
      });

      return Object.values(templates);
    } catch (error) {
      console.error('Error getting allocations by user:', error);
      throw error;
    }
  }

  // Create allocation (budget allocation)
  async createAllocation(allocationData) {
    try {
      const initialized = await this.ensureInitialized();
      if (!initialized) {
        throw new Error('Failed to initialize database');
      }
  
      const { userId, categoryId, categoryName, percentage, budgetLimit } = allocationData;
      
      const result = await this.db.runAsync(`
        INSERT INTO allocation_templates (user_id, name, is_active) 
        VALUES (?, ?, 1)
      `, [userId, `Budget Allocation ${Date.now()}`]);
  
      const templateId = result.lastInsertRowId;
  
      // FIXED: Use category name for the bucket name instead of "Category null"
      const bucketName = categoryName || `Category ${categoryId}`;
      
      // Create allocation bucket
      await this.db.runAsync(`
        INSERT INTO allocation_buckets (template_id, name, percentage, target_amount, is_active)
        VALUES (?, ?, ?, ?, 1)
      `, [templateId, bucketName, percentage, budgetLimit]);
  
      return { id: templateId, ...allocationData };
    } catch (error) {
      console.error('Error creating allocation:', error);
      throw error;
    }
  }

  // Update allocation
  async updateAllocation(allocationId, allocationData) {
    try {
      const initialized = await this.ensureInitialized();
      if (!initialized) {
        throw new Error('Failed to initialize database');
      }
  
      const { categoryId, categoryName, percentage, budgetLimit } = allocationData;
  
      // FIXED: Use category name for the bucket name instead of "Category null"
      const bucketName = categoryName || `Category ${categoryId}`;
  
      // Update the allocation bucket
      await this.db.runAsync(`
        UPDATE allocation_buckets 
        SET name = ?, percentage = ?, target_amount = ?
        WHERE template_id = ?
      `, [bucketName, percentage, budgetLimit, allocationId]);
  
      return { id: allocationId, ...allocationData };
    } catch (error) {
      console.error('Error updating allocation:', error);
      throw error;
    }
  }

  // Delete allocation
  async deleteAllocation(allocationId) {
    try {
      const initialized = await this.ensureInitialized();
      if (!initialized) {
        throw new Error('Failed to initialize database');
      }

      // Delete allocation buckets first (foreign key constraint)
      await this.db.runAsync(`
        DELETE FROM allocation_buckets WHERE template_id = ?
      `, [allocationId]);

      // Delete allocation template
      await this.db.runAsync(`
        DELETE FROM allocation_templates WHERE id = ?
      `, [allocationId]);

      return true;
    } catch (error) {
      console.error('Error deleting allocation:', error);
      throw error;
    }
  }

  // Utility methods
  async closeDatabase() {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  // Test connection
  async testConnection() {
    try {
      const result = await this.db.getFirstAsync('SELECT 1 as test');
      return result.test === 1;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  // SYNC HELPER METHODS

  // Mark record as synced with API
  async markAsSynced(table, localId, apiId = null) {
    try {
      await this.ensureInitialized();
      
      const updateQuery = apiId 
        ? `UPDATE ${table} SET needs_sync = 0, synced_at = CURRENT_TIMESTAMP, api_id = ? WHERE id = ?`
        : `UPDATE ${table} SET needs_sync = 0, synced_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      const params = apiId ? [apiId, localId] : [localId];
      
      await this.db.runAsync(updateQuery, params);
    } catch (error) {
      console.error('Error marking as synced:', error);
      throw error;
    }
  }

  // Get unsynced records for a table
  async getUnsyncedRecords(table, userId) {
    try {
      await this.ensureInitialized();
      
      const result = await this.db.getAllAsync(
        `SELECT * FROM ${table} WHERE user_id = ? AND needs_sync = 1 ORDER BY created_at ASC`,
        [userId]
      );
      
      return result || [];
    } catch (error) {
      console.error(`Error getting unsynced ${table}:`, error);
      return [];
    }
  }

  // Update expense - LOCAL-FIRST with sync
  // async updateExpense(expenseId, updateData) {
  //   try {
  //     await this.ensureInitialized();
      
  //     const { amount, title, description, categoryId, status } = updateData;
      
  //     // Update locally immediately
  //     await this.db.runAsync(
  //       'UPDATE expenses SET amount = ?, title = ?, description = ?, category_id = ?, status = ?, needs_sync = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
  //       [amount, title, description, categoryId, status, expenseId]
  //     );
      
  //     // Queue for sync
  //     const { default: syncManager } = await import('../sync/syncManager');
  //     syncManager.queueForSync('expense', 'update', { id: expenseId, ...updateData });
      
  //     return true;
  //   } catch (error) {
  //     console.error('Error updating expense:', error);
  //     throw error;
  //   }
  // }
      async updateExpense(expenseId, updateData) {
      try {
        await this.ensureInitialized();

        const {
          amount, title, description, categoryId, status,
          dueDate, type,
          isRecurring, recurrenceEnd, isActive
        } = updateData;

        await this.db.runAsync(
          `UPDATE expenses SET
            amount = ?, title = ?, description = ?, category_id = ?, status = ?,
            due_date = ?, type = ?,
            is_recurring = ?, recurrence_end = ?, is_active = ?,
            needs_sync = 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            amount, title, description, categoryId, status,
            dueDate || null, (type || 'Regular'),
            isRecurring ? 1 : 0, recurrenceEnd || null, (isActive === 0 ? 0 : 1),
            expenseId
          ]
        );

    const updated = await this.db.getFirstAsync('SELECT * FROM expenses WHERE id = ?', [expenseId]);
    const { default: syncManager } = await import('../sync/syncManager');
    syncManager.queueForSync('expense', 'update', updated);
    return updated;
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
}

  // Delete expense - LOCAL-FIRST with sync
  async deleteExpense(expenseId) {
    try {
      await this.ensureInitialized();
      
      // Get expense data before deletion (for API sync)
      const expense = await this.db.getFirstAsync('SELECT * FROM expenses WHERE id = ?', [expenseId]);
      
      // Delete locally immediately
      await this.db.runAsync('DELETE FROM expenses WHERE id = ?', [expenseId]);
      
      // Queue for sync (if it was previously synced)
      if (expense && expense.api_id) {
        const { default: syncManager } = await import('../sync/syncManager');
        syncManager.queueForSync('expense', 'delete', expense);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService;