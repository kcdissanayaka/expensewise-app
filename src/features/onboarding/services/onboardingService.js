import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService, authService } from '../../../services';
import { DEFAULT_EXPENSE_CATEGORIES, BUDGET_ALLOCATION } from '../../../constants';

class OnboardingService {

  // Check if user has completed onboarding
  async isOnboardingComplete() {
    try {
      const completed = await AsyncStorage.getItem('onboarding_completed');
      return completed === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  // Get current onboarding step
  async getCurrentStep() {
    try {
      const step = await AsyncStorage.getItem('onboarding_current_step');
      return step ? parseInt(step) : 1;
    } catch (error) {
      return 1;
    }
  }

  // Save onboarding step
  async saveCurrentStep(step) {
    try {
      await AsyncStorage.setItem('onboarding_current_step', step.toString());
    } catch (error) {
      console.error('Error saving onboarding step:', error);
    }
  }

  // Save financial goals
  async saveFinancialGoals(goals) {
    try {
      await AsyncStorage.setItem('user_financial_goals', JSON.stringify(goals));
      
      // Update database with user's financial goals
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        await databaseService.db.runAsync(`
          UPDATE users 
          SET financial_goals = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [JSON.stringify(goals), currentUser.id]);
      }
      
      return true;
    } catch (error) {
      console.error('Error saving financial goals:', error);
      return false;
    }
  }

  // Save income data
  async saveIncomeData(incomeData) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        // If no user is logged in, save to AsyncStorage for later
        await AsyncStorage.setItem('temp_income_data', JSON.stringify(incomeData));
        console.log('User not logged in, saved income data temporarily');
        return true;
      }

      // Save primary income
      if (incomeData.primary && incomeData.primary.amount) {
        await databaseService.createIncome(currentUser.id, {
          amount: parseFloat(incomeData.primary.amount),
          type: 'primary',
          source: incomeData.primary.source || 'Primary Job',
          startDate: new Date().toISOString().split('T')[0],
          frequency: incomeData.primary.frequency
        });
      }

      // Save secondary income if exists
      if (incomeData.secondary && incomeData.secondary.amount && parseFloat(incomeData.secondary.amount) > 0) {
        await databaseService.createIncome(currentUser.id, {
          amount: parseFloat(incomeData.secondary.amount),
          type: 'secondary',
          source: incomeData.secondary.source || 'Secondary Income',
          startDate: new Date().toISOString().split('T')[0],
          frequency: incomeData.secondary.frequency
        });
      }

      // Store in AsyncStorage for quick access
      await AsyncStorage.setItem('user_income_data', JSON.stringify(incomeData));
      
      return true;
    } catch (error) {
      console.error('Error saving income data:', error);
      return false;
    }
  }

  // Save selected expense categories
  async saveExpenseCategories(selectedCategories) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        // If no user is logged in, save to AsyncStorage for later
        await AsyncStorage.setItem('temp_expense_categories', JSON.stringify(selectedCategories));
        console.log('User not logged in, saved expense categories temporarily');
        return true;
      }

      // Enable selected categories for this user
      for (const categoryName of selectedCategories) {
        await databaseService.db.runAsync(`
          UPDATE categories 
          SET is_active = 1 
          WHERE user_id = ? AND name = ?
        `, [currentUser.id, categoryName]);
      }

      // Disable unselected categories
      const allCategories = await databaseService.getCategoriesByUser(currentUser.id);
      const unselectedCategories = allCategories
        .filter(cat => !selectedCategories.includes(cat.name))
        .map(cat => cat.name);

      for (const categoryName of unselectedCategories) {
        await databaseService.db.runAsync(`
          UPDATE categories 
          SET is_active = 0 
          WHERE user_id = ? AND name = ?
        `, [currentUser.id, categoryName]);
      }

      return true;
    } catch (error) {
      console.error('Error saving expense categories:', error);
      return false;
    }
  }

  // Save expense amounts (new method for detailed expense input)
  async saveExpenseAmounts(expenseData) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        // If no user is logged in, save to AsyncStorage for later
        await AsyncStorage.setItem('temp_expense_amounts', JSON.stringify(expenseData));
        console.log('User not logged in, saved expense amounts temporarily');
        return true;
      }

      // Create actual expense records for each category with amounts
      for (const expense of expenseData) {
        // Find or create category
        let category = await databaseService.db.getFirstAsync(`
          SELECT * FROM categories WHERE user_id = ? AND name = ?
        `, [currentUser.id, expense.category]);

        if (!category) {
          // Create new category if it doesn't exist
          const categoryResult = await databaseService.db.runAsync(`
            INSERT INTO categories (user_id, name, color, icon, is_active) 
            VALUES (?, ?, ?, ?, ?)
          `, [currentUser.id, expense.category, '#2196F3', expense.icon || 'category', 1]);
          
          category = { id: categoryResult.lastInsertRowId };
        } else {
          // Activate existing category
          await databaseService.db.runAsync(`
            UPDATE categories SET is_active = 1 WHERE id = ?
          `, [category.id]);
        }

        // Create monthly recurring expense entry
        await databaseService.db.runAsync(`
          INSERT INTO expenses (user_id, category_id, amount, title, description, type, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          currentUser.id,
          category.id,
          expense.amount,
          `Monthly ${expense.category}`,
          `Typical monthly ${expense.category.toLowerCase()} expense`,
          'Recurring',
          'Pending'
        ]);
      }

      // Store in AsyncStorage for quick access
      await AsyncStorage.setItem('user_expense_amounts', JSON.stringify(expenseData));
      
      return true;
    } catch (error) {
      console.error('Error saving expense amounts:', error);
      return false;
    }
  }

  // Save budget allocation
  async saveBudgetAllocation(allocation) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        // If no user is logged in, save to AsyncStorage for later
        await AsyncStorage.setItem('temp_budget_allocation', JSON.stringify(allocation));
        console.log('User not logged in, saved budget allocation temporarily');
        return true;
      }

      // Create allocation template
      await databaseService.db.runAsync(`
        INSERT INTO allocation_templates (user_id, name, is_active) 
        VALUES (?, ?, ?)
      `, [currentUser.id, 'Default Budget', 1]);

      const templateResult = await databaseService.db.getFirstAsync(`
        SELECT id FROM allocation_templates 
        WHERE user_id = ? AND name = 'Default Budget'
        ORDER BY created_at DESC LIMIT 1
      `, [currentUser.id]);

      if (templateResult) {
        // Create allocation buckets
        const buckets = [
          { name: 'Needs', percentage: allocation.needs },
          { name: 'Wants', percentage: allocation.wants },
          { name: 'Savings', percentage: allocation.savings }
        ];

        for (const bucket of buckets) {
          await databaseService.db.runAsync(`
            INSERT INTO allocation_buckets (template_id, name, percentage, is_active) 
            VALUES (?, ?, ?, ?)
          `, [templateResult.id, bucket.name, bucket.percentage, 1]);
        }
      }

      // Store in AsyncStorage
      await AsyncStorage.setItem('user_budget_allocation', JSON.stringify(allocation));
      
      return true;
    } catch (error) {
      console.error('Error saving budget allocation:', error);
      return false;
    }
  }

  // Save user preferences
  async saveUserPreferences(preferences) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        // If no user is logged in, save to AsyncStorage for later
        await AsyncStorage.setItem('temp_user_preferences', JSON.stringify(preferences));
        console.log('User not logged in, saved preferences temporarily');
        return true;
      }

      await databaseService.db.runAsync(`
        UPDATE user_preferences 
        SET 
          notification_due_reminder = ?,
          notification_allocation_reminder = ?,
          notification_summary = ?,
          notification_frequency = ?,
          theme = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [
        preferences.notifications.dueReminder ? 1 : 0,
        preferences.notifications.allocationReminder ? 1 : 0,
        preferences.notifications.summary ? 1 : 0,
        preferences.notifications.frequency,
        preferences.theme,
        currentUser.id
      ]);

      // Store in AsyncStorage
      await AsyncStorage.setItem('user_preferences', JSON.stringify(preferences));
      
      return true;
    } catch (error) {
      console.error('Error saving user preferences:', error);
      return false;
    }
  }

  // Complete onboarding
  async completeOnboarding() {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      await AsyncStorage.removeItem('onboarding_current_step');
      
      // Update user record
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        await databaseService.db.runAsync(`
          UPDATE onboarding_progress 
          SET is_completed = 1, updated_at = CURRENT_TIMESTAMP 
          WHERE user_id = ?
        `, [currentUser.id]);
      }

      return true;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      return false;
    }
  }

  // Get onboarding progress (for progress bar)
  getProgressPercentage(currentStep) {
    const totalSteps = 8; // Total onboarding steps
    return Math.round((currentStep / totalSteps) * 100);
  }

  // Default financial goals options
  getFinancialGoalsOptions() {
    return [
      {
        id: 'save_money',
        title: 'Save More Money',
        description: 'Build an emergency fund and save for future goals',
        icon: '💰',
        color: '#00B894'
      },
      {
        id: 'track_spending',
        title: 'Track My Spending',
        description: 'Understand where my money goes each month',
        icon: '📊',
        color: '#0984E3'
      },
      {
        id: 'budget_planning',
        title: 'Create a Budget',
        description: 'Plan and stick to a monthly budget',
        icon: '📋',
        color: '#6C5CE7'
      },
      {
        id: 'debt_reduction',
        title: 'Pay Off Debt',
        description: 'Create a plan to become debt-free',
        icon: '💳',
        color: '#E84393'
      }
    ];
  }

  // Get default expense categories
  getDefaultExpenseCategories() {
    return DEFAULT_EXPENSE_CATEGORIES;
  }

  // Get suggested budget allocation (50/30/20 rule)
  getSuggestedAllocation() {
    return {
      needs: BUDGET_ALLOCATION.NEEDS,
      wants: BUDGET_ALLOCATION.WANTS,
      savings: BUDGET_ALLOCATION.SAVINGS
    };
  }

  // Process temporary data after user authentication
  async processTemporaryData() {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        console.log('No user logged in, cannot process temporary data');
        return false;
      }

      // Process temporary income data
      const tempIncomeData = await AsyncStorage.getItem('temp_income_data');
      if (tempIncomeData) {
        const incomeData = JSON.parse(tempIncomeData);
        await this.saveIncomeData(incomeData);
        await AsyncStorage.removeItem('temp_income_data');
        console.log('Processed temporary income data');
      }

      // Process temporary expense categories
      const tempCategories = await AsyncStorage.getItem('temp_expense_categories');
      if (tempCategories) {
        const categories = JSON.parse(tempCategories);
        await this.saveExpenseCategories(categories);
        await AsyncStorage.removeItem('temp_expense_categories');
        console.log('Processed temporary expense categories');
      }

      // Process temporary expense amounts
      const tempExpenseAmounts = await AsyncStorage.getItem('temp_expense_amounts');
      if (tempExpenseAmounts) {
        const expenseAmounts = JSON.parse(tempExpenseAmounts);
        await this.saveExpenseAmounts(expenseAmounts);
        await AsyncStorage.removeItem('temp_expense_amounts');
        console.log('Processed temporary expense amounts');
      }

      // Process temporary budget allocation
      const tempAllocation = await AsyncStorage.getItem('temp_budget_allocation');
      if (tempAllocation) {
        const allocation = JSON.parse(tempAllocation);
        await this.saveBudgetAllocation(allocation);
        await AsyncStorage.removeItem('temp_budget_allocation');
        console.log('Processed temporary budget allocation');
      }

      // Process temporary preferences
      const tempPreferences = await AsyncStorage.getItem('temp_user_preferences');
      if (tempPreferences) {
        const preferences = JSON.parse(tempPreferences);
        await this.saveUserPreferences(preferences);
        await AsyncStorage.removeItem('temp_user_preferences');
        console.log('Processed temporary user preferences');
      }

      return true;
    } catch (error) {
      console.error('Error processing temporary data:', error);
      return false;
    }
  }

  // Check if onboarding is complete
  async isOnboardingComplete() {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        return false;
      }

      // Check if user has income data
      const income = await databaseService.getIncomeByUser(currentUser.id);
      if (!income || income.length === 0) {
        return false;
      }

      // Check if user has categories set up
      const activeCategories = await databaseService.db.getAllAsync(`
        SELECT * FROM categories WHERE user_id = ? AND is_active = 1
      `, [currentUser.id]);
      
      if (!activeCategories || activeCategories.length === 0) {
        return false;
      }

      // Check if user has allocation template
      const allocation = await databaseService.db.getFirstAsync(`
        SELECT * FROM allocation_templates WHERE user_id = ? AND is_active = 1
      `, [currentUser.id]);
      
      if (!allocation) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking onboarding completion:', error);
      return false;
    }
  }

  // Reset onboarding (for testing)
  async resetOnboarding() {
    try {
      await AsyncStorage.removeItem('onboarding_completed');
      await AsyncStorage.removeItem('onboarding_current_step');
      await AsyncStorage.removeItem('user_financial_goals');
      await AsyncStorage.removeItem('user_income_data');
      await AsyncStorage.removeItem('user_budget_allocation');
      await AsyncStorage.removeItem('user_preferences');
      
      console.log('Onboarding reset successfully');
      return true;
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      return false;
    }
  }
}

export default new OnboardingService();