import DataValidator from '../../utils/dataValidator';
import ConflictResolver, { ConflictStrategy } from '../../utils/conflictResolver';
import databaseService from '../database/databaseService';

export class SyncService {
  
  static async syncExpenses() {
    try {
      // Get API service
      const apiService = (await import('../api/apiService')).default;
      
      // Get local expenses
      const localExpenses = await databaseService.getAllExpenses();
      
      // Get remote expenses
      const remoteResponse = await apiService.getExpenses();
      if (!remoteResponse.success) {
        throw new Error('Failed to fetch remote expenses');
      }
      
      const remoteExpenses = remoteResponse.data || [];
      
      // Process each local expense
      const syncResults = {
        synced: 0,
        conflicts: 0,
        errors: 0,
        validationFailures: 0
      };
      
      for (const localExpense of localExpenses) {
        try {
          await this._syncSingleExpense(localExpense, remoteExpenses, syncResults);
        } catch (error) {
          syncResults.errors++;
        }
      }
      
      // Process remote expenses not in local
      for (const remoteExpense of remoteExpenses) {
        const localExists = localExpenses.find(local => local.id === remoteExpense.id);
        if (!localExists) {
          try {
            await this._processRemoteOnlyExpense(remoteExpense, syncResults);
          } catch (error) {
            syncResults.errors++;
          }
        }
      }
      
      console.log('Expense sync completed:', syncResults);
      return {
        success: true,
        results: syncResults
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  
  // Sync a single expense with validation and conflict resolution
   
  static async _syncSingleExpense(localExpense, remoteExpenses, syncResults) {
    // Step 1: Validate local expense
    const validation = DataValidator.validateExpense(localExpense);
    if (!validation.isValid) {
      console.warn('Local expense validation failed:', validation.errors);
      syncResults.validationFailures++;
      return;
    }
    
    // Step 2: Sanitize local data
    const sanitizedLocal = DataValidator.sanitizeData(localExpense, 'expense');
    
    // Step 3: Find matching remote expense
    const remoteExpense = remoteExpenses.find(remote => remote.id === localExpense.id);
    
    if (!remoteExpense) {
      // Local expense doesn't exist remotely - push to server
      console.log('Pushing local expense to server:', localExpense.id);
      await this._pushExpenseToServer(sanitizedLocal);
      syncResults.synced++;
      return;
    }
    
    // Step 4: Check for conflicts
    if (ConflictResolver.hasConflict(sanitizedLocal, remoteExpense)) {
      
      // Resolve conflict
      const strategy = ConflictResolver.getRecommendedStrategy(sanitizedLocal, remoteExpense, 'expense');
      const resolved = ConflictResolver.resolveConflict(sanitizedLocal, remoteExpense, strategy);
      
      // Update both local and remote with resolved data
      await this._updateExpenseEverywhere(resolved);
      syncResults.conflicts++;
    } else {
      // No conflicts, just ensure sync metadata is updated
      await this._updateSyncMetadata(localExpense.id);
      syncResults.synced++;
    }
  }
  
  // Process remote expense that doesn't exist locally
  static async _processRemoteOnlyExpense(remoteExpense, syncResults) {
    // Validate remote expense
    const validation = DataValidator.validateExpense(remoteExpense);
    if (!validation.isValid) {
      console.warn('Remote expense validation failed:', validation.errors);
      syncResults.validationFailures++;
      return;
    }
    
    // Sanitize and save to local database
    const sanitized = DataValidator.sanitizeData(remoteExpense, 'expense');
    await databaseService.saveExpense(sanitized);
    
    console.log('Saved remote expense locally:', remoteExpense.id);
    syncResults.synced++;
  }
  
  // Push local expense to server
  static async _pushExpenseToServer(expense) {
    try {
      const apiService = (await import('../api/apiService')).default;
      
      // Transform expense data for backend compatibility
      const backendExpense = await this._transformExpenseForBackend(expense);
      
      // Validate before sending
      const validation = DataValidator.validateExpense(backendExpense);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      const response = await apiService.createExpense(backendExpense, true); // isSync = true
      if (response.success) {
        console.log('Expense pushed to server successfully');
      } else {
        throw new Error(response.message || 'Failed to push expense');
      }
    } catch (error) {
      console.error('Failed to push expense to server:', error);
      throw error;
    }
  }
  
  // Transform local expense data for backend API compatibility
  static async _transformExpenseForBackend(localExpense) {
    console.log('Transforming expense for backend:', localExpense);
    
    try {
      // Ensure description is not empty (backend requires 1-200 chars)
      let description = localExpense.description || '';
      if (description.trim().length === 0) {
        description = localExpense.title || 'Manual expense entry';
      }
      
      // Ensure description is within limits
      if (description.length > 200) {
        description = description.substring(0, 200);
      }
      
      // Map local category to backend category
      let categoryId = localExpense.categoryId || localExpense.category_id;
      
      // If we have a local category ID, try to find matching backend category
      if (categoryId) {
        try {
          // Get the category name from local database
          const localCategory = await databaseService.db.getFirstAsync(
            'SELECT name FROM categories WHERE id = ?', 
            [categoryId]
          );
          
          if (localCategory) {
            // Map common category names to backend-compatible format
            const categoryMappings = {
              'House Rent': 'Housing',
              'Food & Dining': 'Food',
              'Transportation': 'Transportation',
              'Utilities': 'Utilities',
              'Healthcare': 'Healthcare',
              'Entertainment': 'Entertainment',
              'Shopping': 'Shopping',
              'Travel': 'Travel'
            };
            
            // Use mapped category name or original name
            const categoryName = categoryMappings[localCategory.name] || localCategory.name;
            
            categoryId = categoryName;
          }
        } catch (error) {
          console.warn('Could not map category, using default:', error);
          categoryId = 'Other'; // Default category
        }
      } else {
        categoryId = 'Other'; // Default category if no categoryId
      }
      
      // Transform the expense object for backend
      const backendExpense = {
        amount: parseFloat(localExpense.amount),
        description: description,
        categoryId: categoryId,
        title: localExpense.title,
        date: localExpense.created_at || new Date().toISOString(),
        type: localExpense.type || 'Manual',
        status: localExpense.status || 'Pending'
      };
      
      console.log('Transformed expense:', backendExpense);
      return backendExpense;
      
    } catch (error) {
      console.error('Error transforming expense:', error);
      // Return a basic transformed expense as fallback
      return {
        amount: parseFloat(localExpense.amount) || 0,
        description: localExpense.title || 'Manual expense entry',
        categoryId: 'Other',
        title: localExpense.title || 'Expense',
        date: new Date().toISOString(),
        type: 'Manual',
        status: 'Pending'
      };
    }
  }
  
  // Update expense both locally and remotely with resolved data
  static async _updateExpenseEverywhere(resolvedExpense) {
    try {
      // Validate resolved data
      const validation = DataValidator.validateExpense(resolvedExpense);
      if (!validation.isValid) {
        throw new Error(`Resolved expense validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Update locally
      await databaseService.updateExpense(resolvedExpense.id, resolvedExpense);
      
      // Update remotely
      const apiService = (await import('../api/apiService')).default;
      const response = await apiService.updateExpense(resolvedExpense.id, resolvedExpense);
      
      if (!response.success) {
        throw new Error('Failed to update remote expense');
      }
      
      console.log('Expense updated everywhere after conflict resolution');
    } catch (error) {
      console.error('Failed to update expense everywhere:', error);
      throw error;
    }
  }
  
  // Update sync metadata for an expense
  static async _updateSyncMetadata(expenseId) {
    try {
      const now = new Date().toISOString();
      await databaseService.db.runAsync(`
        UPDATE expenses 
        SET synced_at = ?, sync_status = 'synced'
        WHERE id = ?
      `, [now, expenseId]);
    } catch (error) {
      console.error('Failed to update sync metadata:', error);
    }
  }


  // Sync categories with validation
  static async syncCategories() {
    console.log('Starting category sync...');
    
    try {
      // Get local and remote categories
      const localCategories = await databaseService.getAllCategories();
      const apiService = (await import('../api/apiService')).default;
      const remoteResponse = await apiService.getCategories();
      
      if (!remoteResponse.success) {
        throw new Error('Failed to fetch remote categories');
      }
      
      const remoteCategories = remoteResponse.data || [];
      
      // Process categories with validation
      for (const localCategory of localCategories) {
        const validation = DataValidator.validateCategory(localCategory);
        if (!validation.isValid) {
          console.warn('Local category validation failed:', validation.errors);
          continue;
        }
        
        // Check for remote conflicts
        const remoteCategory = remoteCategories.find(remote => remote.id === localCategory.id);
        if (remoteCategory && ConflictResolver.hasConflict(localCategory, remoteCategory)) {
          const resolved = ConflictResolver.resolveConflict(
            localCategory, 
            remoteCategory, 
            ConflictStrategy.LOCAL_WINS // Categories prefer local changes
          );
          
          // Update with resolved data
          await this._updateCategoryEverywhere(resolved);
        }
      }
      
      console.log('Category sync completed');
      return { success: true };
      
    } catch (error) {
      console.error('Category sync failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  
  // Update category both locally and remotely
  
  static async _updateCategoryEverywhere(category) {
    try {
      await databaseService.updateCategory(category.id, category);
      
      const apiService = (await import('../api/apiService')).default;
      await apiService.updateCategory(category.id, category);
      
      console.log('Category updated everywhere');
    } catch (error) {
      console.error('Failed to update category:', error);
      throw error;
    }
  }
  
  
  // Validate all local data integrity
  static async validateLocalDataIntegrity() {
    console.log('Validating local data integrity...');
    
    const results = {
      expenses: { valid: 0, invalid: 0, warnings: 0 },
      categories: { valid: 0, invalid: 0, warnings: 0 },
      users: { valid: 0, invalid: 0, warnings: 0 }
    };
    
    try {
      // Validate expenses
      const expenses = await databaseService.getAllExpenses();
      for (const expense of expenses) {
        const validation = DataValidator.validateExpense(expense);
        if (validation.isValid) {
          results.expenses.valid++;
        } else {
          results.expenses.invalid++;
          console.warn('Invalid expense:', expense.id, validation.errors);
        }
        results.expenses.warnings += validation.warnings.length;
      }
      
      // Validate categories
      const categories = await databaseService.getAllCategories();
      for (const category of categories) {
        const validation = DataValidator.validateCategory(category);
        if (validation.isValid) {
          results.categories.valid++;
        } else {
          results.categories.invalid++;
          console.warn('Invalid category:', category.id, validation.errors);
        }
        results.categories.warnings += validation.warnings.length;
      }
      
      console.log('Data integrity check completed:', results);
      return results;
      
    } catch (error) {
      console.error('Data integrity check failed:', error);
      throw error;
    }
  }
}

export default SyncService;