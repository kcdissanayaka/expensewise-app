// Data Validation Utility
// Ensures data integrity between local and remote storage

export const ValidationResult = {
  VALID: 'valid',
  INVALID: 'invalid',
  WARNING: 'warning'
};

export class DataValidator {
  
  // Validate expense data before sync
  // @param {Object} expenseData - Expense object to validate
  // @returns {Object} Validation result with status and errors
  static validateExpense(expenseData) {
    console.log('Validating expense data:', expenseData);
    
    const errors = [];
    const warnings = [];
    
    // Required fields validation
    if (!expenseData.amount || expenseData.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    // Description is optional - will be handled in transformation if empty
    if (expenseData.description && expenseData.description.length > 200) {
      errors.push('Description must be 200 characters or less');
    }
    
    // Category validation - more flexible
    if (!expenseData.categoryId && !expenseData.category && !expenseData.title) {
      errors.push('Either category, categoryId, or title is required');
    }
    
    // Date is optional - will be handled in transformation if missing
    if (expenseData.date && !this._isValidDate(expenseData.date)) {
      warnings.push('Invalid date format, will use current date');
    }
    
    // Data type validation
    if (isNaN(parseFloat(expenseData.amount))) {
      errors.push('Amount must be a valid number');
    }
    
    // Future date warning
    if (expenseData.date && new Date(expenseData.date) > new Date()) {
      warnings.push('Expense date is in the future');
    }
    
    // Large amount warning
    if (expenseData.amount > 10000) {
      warnings.push('Large expense amount detected');
    }
    
    // ID validation for sync
    if (expenseData.id && !this._isValidId(expenseData.id)) {
      errors.push('Invalid expense ID format');
    }
    
    const status = errors.length > 0 ? ValidationResult.INVALID : 
                   warnings.length > 0 ? ValidationResult.WARNING : 
                   ValidationResult.VALID;
    
    const result = {
      status,
      isValid: errors.length === 0,
      errors,
      warnings,
      data: expenseData
    };
    
    console.log('Validation result:', result);
    return result;
  }

  // Validate user data before sync
  static validateUser(userData) {
    console.log('Validating user data:', userData);
    
    const errors = [];
    const warnings = [];
    
    // Email validation
    if (!userData.email || !this._isValidEmail(userData.email)) {
      errors.push('Valid email address is required');
    }
    
    // Name validation
    if (!userData.name || userData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    // Password validation (for registration)
    if (userData.password && !this._isValidPassword(userData.password)) {
      errors.push('Password must contain at least 8 characters with uppercase, lowercase, and number');
    }
    
    // Budget validation
    if (userData.monthlyBudget && (isNaN(userData.monthlyBudget) || userData.monthlyBudget < 0)) {
      errors.push('Monthly budget must be a non-negative number');
    }
    
    // Income validation
    if (userData.monthlyIncome && (isNaN(userData.monthlyIncome) || userData.monthlyIncome < 0)) {
      errors.push('Monthly income must be a non-negative number');
    }
    
    const status = errors.length > 0 ? ValidationResult.INVALID : 
                   warnings.length > 0 ? ValidationResult.WARNING : 
                   ValidationResult.VALID;
    
    return {
      status,
      isValid: errors.length === 0,
      errors,
      warnings,
      data: userData
    };
  }

  // Validate category data before sync
  static validateCategory(categoryData) {
    console.log('Validating category data:', categoryData);
    
    const errors = [];
    const warnings = [];
    
    // Name validation
    if (!categoryData.name || categoryData.name.trim().length === 0) {
      errors.push('Category name is required');
    }
    
    if (categoryData.name && categoryData.name.length > 50) {
      errors.push('Category name cannot exceed 50 characters');
    }
    
    // Color validation
    if (categoryData.color && !this._isValidColor(categoryData.color)) {
      warnings.push('Invalid color format, using default');
    }
    
    // Icon validation
    if (categoryData.icon && categoryData.icon.length > 20) {
      warnings.push('Icon name too long');
    }
    
    const status = errors.length > 0 ? ValidationResult.INVALID : 
                   warnings.length > 0 ? ValidationResult.WARNING : 
                   ValidationResult.VALID;
    
    return {
      status,
      isValid: errors.length === 0,
      errors,
      warnings,
      data: categoryData
    };
  }

  // Validate sync metadata
  static validateSyncMetadata(data) {
    const errors = [];
    
    // Check for required sync fields
    if (!data.id) {
      errors.push('ID is required for sync');
    }
    
    if (!data.createdAt) {
      errors.push('createdAt timestamp is required');
    }
    
    if (!data.updatedAt) {
      errors.push('updatedAt timestamp is required');
    }
    
    // Validate timestamps
    if (data.createdAt && !this._isValidDate(data.createdAt)) {
      errors.push('Invalid createdAt timestamp');
    }
    
    if (data.updatedAt && !this._isValidDate(data.updatedAt)) {
      errors.push('Invalid updatedAt timestamp');
    }
    
    // Check timestamp logic
    if (data.createdAt && data.updatedAt && 
        new Date(data.createdAt) > new Date(data.updatedAt)) {
      errors.push('updatedAt cannot be before createdAt');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Sanitize data before storage/sync
  static sanitizeData(data, dataType = 'expense') {
    console.log('Sanitizing data:', dataType);
    
    const sanitized = { ...data };
    
    // Remove any null or undefined values
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === null || sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });
    
    // Sanitize strings
    if (sanitized.description) {
      sanitized.description = this._sanitizeString(sanitized.description);
    }
    
    if (sanitized.name) {
      sanitized.name = this._sanitizeString(sanitized.name);
    }
    
    if (sanitized.email) {
      sanitized.email = sanitized.email.toLowerCase().trim();
    }
    
    // Ensure numeric fields are numbers
    if (sanitized.amount) {
      sanitized.amount = parseFloat(sanitized.amount);
    }
    
    if (sanitized.monthlyBudget) {
      sanitized.monthlyBudget = parseFloat(sanitized.monthlyBudget);
    }
    
    if (sanitized.monthlyIncome) {
      sanitized.monthlyIncome = parseFloat(sanitized.monthlyIncome);
    }
    
    // Ensure dates are ISO strings
    if (sanitized.date && !(sanitized.date instanceof Date)) {
      sanitized.date = new Date(sanitized.date).toISOString();
    }
    
    if (sanitized.createdAt && !(sanitized.createdAt instanceof Date)) {
      sanitized.createdAt = new Date(sanitized.createdAt).toISOString();
    }
    
    if (sanitized.updatedAt && !(sanitized.updatedAt instanceof Date)) {
      sanitized.updatedAt = new Date(sanitized.updatedAt).toISOString();
    }
    
    console.log('Data sanitized');
    return sanitized;
  }

  // Private helper methods
  static _isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }
  
  static _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  static _isValidPassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }
  
  static _isValidColor(color) {
    // Check for hex color format
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  }
  
  static _isValidId(id) {
    // Check for MongoDB ObjectId format or UUID
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return objectIdRegex.test(id) || uuidRegex.test(id);
  }
  
  static _sanitizeString(str) {
    return str.trim().replace(/\s+/g, ' ');
  }
}

export default DataValidator;