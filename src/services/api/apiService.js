// API configuration
const API_BASE_URL = 'http://localhost:3000/api/v1'; // backend URL
const API_TIMEOUT = 10000; // 10 seconds

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = API_TIMEOUT;
  }

  // Helper method to make HTTP requests
  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config = {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      };

      
      console.log(`API Request: ${config.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      return this.getMockResponse(endpoint, options);
    }
  }

  // Mock responses for offline mode or errors
  getMockResponse(endpoint, options) {
    console.log('Using mock response for:', endpoint);
    
    // Return appropriate mock data based on endpoint
    if (endpoint.includes('/auth/login')) {
      return {
        success: true,
        message: 'Mock login successful',
        data: {
          user: {
            id: 1,
            email: 'mock@example.com',
            name: 'Mock User'
          },
          token: 'mock-jwt-token'
        }
      };
    }
    
    if (endpoint.includes('/auth/register')) {
      return {
        success: true,
        message: 'Mock registration successful',
        data: {
          user: {
            id: 1,
            email: 'mock@example.com',
            name: 'Mock User'
          },
          token: 'mock-jwt-token'
        }
      };
    }
    
    // Default mock response
    return {
      success: false,
      message: 'API not available - using local database',
      data: null
    };
  }

  // Authentication endpoints
  async login(email, password) {
    return await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData) {
    return await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    return await this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // User endpoints
  async getProfile() {
    return await this.request('/auth/profile');
  }

  async updateProfile(userData) {
    return await this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Expense endpoints 
  async getExpenses(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/expenses?${queryString}` : '/expenses';
    return await this.request(endpoint);
  }

  async createExpense(expenseData) {
    return await this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  }

  async updateExpense(id, expenseData) {
    return await this.request(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData),
    });
  }

  async deleteExpense(id) {
    return await this.request(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // Category endpoints 
  async getCategories() {
    return await this.request('/categories');
  }

  async createCategory(categoryData) {
    return await this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  // Budget endpoints (for future use)
  async getBudgets() {
    return await this.request('/budgets');
  }

  async createBudget(budgetData) {
    return await this.request('/budgets', {
      method: 'POST',
      body: JSON.stringify(budgetData),
    });
  }

  // Dashboard/Reports endpoints 
  async getDashboardData(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/dashboard?${queryString}` : '/dashboard';
    return await this.request(endpoint);
  }

  async getReports(type, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/reports/${type}?${queryString}` : `/reports/${type}`;
    return await this.request(endpoint);
  }

  // Utility methods
  setBaseURL(url) {
    this.baseURL = url;
  }

  setTimeout(timeout) {
    this.timeout = timeout;
  }

  // Add authorization header for authenticated requests
  setAuthToken(token) {
    this.authToken = token;
  }

  getAuthHeaders() {
    return this.authToken ? {
      'Authorization': `Bearer ${this.authToken}`
    } : {};
  }
}

export default new ApiService();