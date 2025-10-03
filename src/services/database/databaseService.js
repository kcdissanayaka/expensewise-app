import * as SQLite from 'expo-sqlite';

class DatabaseService {
  constructor() {
    this.db = null;
  }

  async initialize() {
    try {
      this.db = await SQLite.openDatabaseAsync('expensewise.db');
      await this.createTables();
      console.log('Database initialized successfully');
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
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
        currency TEXT DEFAULT 'LKR',
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
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT 1,
        is_archived BOOLEAN DEFAULT 0,
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

    // Insert default categories
    await this.insertDefaultCategories();
  }

  async insertDefaultCategories() {
    const defaultCategories = [
      { name: 'Food & Dining', color: '#FF6384', icon: 'restaurant' },
      { name: 'Transportation', color: '#36A2EB', icon: 'directions-car' },
      { name: 'Shopping', color: '#FFCE56', icon: 'shopping-cart' },
      { name: 'Entertainment', color: '#4BC0C0', icon: 'movie' },
      { name: 'Bills & Utilities', color: '#9966FF', icon: 'receipt' },
      { name: 'Healthcare', color: '#FF9F40', icon: 'local-hospital' },
      { name: 'Education', color: '#FF6B6B', icon: 'school' },
      { name: 'Other', color: '#95A5A6', icon: 'category' }
    ];

    // Note: These will be inserted when a user is created
    this.defaultCategories = defaultCategories;
  }

  // User operations
  async createUser(email, passwordHash, name) {
    try {
      const result = await this.db.runAsync(
        'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
        [email, passwordHash, name]
      );

      // Create default categories for new user
      for (const category of this.defaultCategories) {
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
      const result = await this.db.getFirstAsync(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return result;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
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

  // ADD THIS METHOD FOR PASSWORD RESET
  async updateUserPassword(userId, newHashedPassword) {
    try {
      const result = await this.db.runAsync(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newHashedPassword, userId]
      );
      console.log('Password updated successfully for user:', userId);
      return result;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  // Income operations
  async createIncome(userId, incomeData) {
    try {
      const { amount, type, source, startDate, endDate } = incomeData;
      const result = await this.db.runAsync(
        'INSERT INTO income (user_id, amount, type, source, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, amount, type, source, startDate, endDate]
      );
      return { id: result.lastInsertRowId, ...incomeData };
    } catch (error) {
      console.error('Error creating income:', error);
      throw error;
    }
  }

  async getIncomeByUser(userId) {
    try {
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

  // Expense operations
  async createExpense(userId, expenseData) {
    try {
      const { categoryId, amount, title, description, dueDate, status, type } = expenseData;
      const result = await this.db.runAsync(
        'INSERT INTO expenses (user_id, category_id, amount, title, description, due_date, status, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, categoryId, amount, title, description, dueDate, status || 'Pending', type || 'Regular']
      );
      return { id: result.lastInsertRowId, ...expenseData };
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  async getExpensesByUser(userId, filters = {}) {
    try {
      let query = `
        SELECT e.*, c.name as category_name, c.color as category_color 
        FROM expenses e 
        JOIN categories c ON e.category_id = c.id 
        WHERE e.user_id = ? AND e.is_archived = 0
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

  // Categories operations
  async getCategoriesByUser(userId) {
    try {
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
      const currentDate = new Date();
      const targetMonth = month || currentDate.getMonth() + 1;
      const targetYear = year || currentDate.getFullYear();

      // Get total income for the month
      const incomeResult = await this.db.getFirstAsync(`
        SELECT COALESCE(SUM(amount), 0) as total_income 
        FROM income 
        WHERE user_id = ? AND is_archived = 0
        AND strftime('%m', created_at) = ? 
        AND strftime('%Y', created_at) = ?
      `, [userId, targetMonth.toString().padStart(2, '0'), targetYear.toString()]);

      // Get total expenses by status for the month
      const expenseResult = await this.db.getAllAsync(`
        SELECT status, COALESCE(SUM(amount), 0) as total 
        FROM expenses 
        WHERE user_id = ? AND is_archived = 0
        AND strftime('%m', due_date) = ? 
        AND strftime('%Y', due_date) = ?
        GROUP BY status
      `, [userId, targetMonth.toString().padStart(2, '0'), targetYear.toString()]);

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
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService;