import { CONFIG } from "../../config";

class ApiService {
  constructor() {
    this.baseURL = CONFIG.API_BASE_URL;
    this.timeout = CONFIG.API_TIMEOUT;
    this.authToken = null;
    console.log(
      `API Service initialized with baseURL: ${this.baseURL} and timeout: ${this.timeout}ms`
    );
  }

  // Set authentication token
  setAuthToken(token) {
    this.authToken = token;
  }

  // Get auth headers
  getAuthHeaders() {
    return this.authToken
      ? {
          Authorization: `Bearer ${this.authToken}`,
        }
      : {};
  }

  // Helper method to make HTTP requests
  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log("API Request:", { method: options.method || "GET", url });

      const config = {
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
          ...options.headers,
        },
        ...options,
      };

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), this.timeout)
      );

      // Race between fetch and timeout
      const response = await Promise.race([fetch(url, config), timeoutPromise]);

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Response error:", errorText);

        if (response.status === 401) {
          throw new Error("Authentication failed - token expired");
        }

        // Try to parse error message from response
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
        } catch (parseError) {
          throw new Error(
            `HTTP error! status: ${response.status} - ${errorText}`
          );
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("API Error details:", {
        message: error.message,
        url: `${this.baseURL}${endpoint}`,
        method: options.method || "GET",
        networkState: "checking...", 
      });
      
      // Re-throw the error - no mock responses
      throw error;
    }
  }

  // Expense endpoints
  async getExpenses(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/expenses?${queryString}` : "/expenses";
    return await this.request(endpoint);
  }

  async createExpense(expenseData) {
    return await this.request("/expenses", {
      method: "POST",
      body: JSON.stringify(expenseData),
    });
  }

  async updateExpense(id, expenseData) {
    return await this.request(`/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(expenseData),
    });
  }

  async deleteExpense(id) {
    return await this.request(`/expenses/${id}`, {
      method: "DELETE",
    });
  }

  // Income endpoints for sync
  async getIncome(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/income?${queryString}` : "/income";
    return await this.request(endpoint);
  }

  async createIncome(incomeData) {
    return await this.request("/income", {
      method: "POST",
      body: JSON.stringify(incomeData),
    });
  }

  async updateIncome(id, incomeData) {
    return await this.request(`/income/${id}`, {
      method: "PUT",
      body: JSON.stringify(incomeData),
    });
  }

  async deleteIncome(id) {
    return await this.request(`/income/${id}`, {
      method: "DELETE",
    });
  }

  // Analytics and Reports
  async getAnalytics(params = {}) {
    return await this.request("/analytics");
  }

  async getReports(params = {}) {
    return await this.request("/reports");
  }

  // Authentication
  async loginWithAPI(email, password) {
    const response = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (response.token) {
      this.setAuthToken(response.token);
    }

    // Normalize response to include success field
    return {
      ...response,
      success: !!(response.user && response.token),
    };
  }

  async registerWithAPI(userData) {
    const response = await this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (response.token) {
      this.setAuthToken(response.token);
    }

    return response;
  }

  // Category endpoints
  async getCategories() {
    return await this.request("/categories");
  }

  async createCategory(categoryData) {
    return await this.request("/categories", {
      method: "POST",
      body: JSON.stringify(categoryData),
    });
  }

  // Dashboard/Reports endpoints
  async getDashboardData(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/dashboard?${queryString}` : "/dashboard";
    return await this.request(endpoint);
  }

  // Utility methods
  setBaseURL(url) {
    this.baseURL = url;
  }

  setTimeout(timeout) {
    this.timeout = timeout;
  }
}

export default new ApiService();