import { CONFIG } from "../../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

class ApiService {
  constructor() {
    this.baseURL = CONFIG.API_BASE_URL;
    this.timeout = CONFIG.API_TIMEOUT;
    this.authToken = null;
    this.initialized = false;
  }

  // Initialize apiService by loading token from AsyncStorage
  async initialize() {
    if (this.initialized) return;
    
    try {
      const token = await AsyncStorage.getItem('@ExpenseWise:authToken');
      if (token) {
        this.authToken = token;
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize apiService:', error);
    }
  }

  // Update user profile remotely
  async updateProfile(updatedData) {
    return await this.request(`/auth/profile`, {
      method: "PUT",
      body: JSON.stringify(updatedData),
    });
  }

  // Set authentication token
  setAuthToken(token) {
    this.authToken = token;
  }

  // Get auth headers - automatically loads JWT token from AsyncStorage if not cached
  async getAuthHeaders() {
    console.log('[getAuthHeaders] Starting...');
    
    // Always check AsyncStorage for the latest token
    const token = await AsyncStorage.getItem('@ExpenseWise:authToken');
    console.log('[getAuthHeaders] Token from AsyncStorage:', token ? `EXISTS (${token.substring(0, 40)}...)` : 'NULL/EMPTY');

    if (token) {
      this.authToken = token;
      console.log('[getAuthHeaders] Token cached in apiService');
    } else {
      console.error('[getAuthHeaders] NO TOKEN IN ASYNCSTORAGE!');
      this.authToken = null;
    }
    
    const headers = this.authToken
      ? {
          Authorization: `Bearer ${this.authToken}`,
        }
      : {};
    
    console.log('[getAuthHeaders] Returning headers:', JSON.stringify(headers).substring(0, 100));
    return headers;
  }

  // Helper method to make HTTP requests
  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;

      // Get auth headers (this will load token from AsyncStorage if needed)
      const authHeaders = await this.getAuthHeaders();
      
      console.log('Auth headers being sent:', authHeaders);
      console.log('Request to:', url);

      const config = {
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...options.headers,
        },
        ...options,
      };
      
      console.log('Full headers:', config.headers);
      console.log('ABOUT TO FETCH:', { url, hasAuth: !!config.headers.Authorization });
      
      if (config.headers.Authorization) {
        console.log('Authorization header present:', config.headers.Authorization.substring(0, 50) + '...');
      } else {
        console.error('NO AUTHORIZATION HEADER!');
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), this.timeout)
      );

      const response = await Promise.race([fetch(url, config), timeoutPromise]);

      if (!response.ok) {
        const errorText = await response.text();

        if (response.status === 401) {
          try {
            const refreshed = await this.tryRefreshToken();
            if (refreshed) {
              // Get fresh auth headers after token refresh
              const freshAuthHeaders = await this.getAuthHeaders();
              
              const retryConfig = {
                ...options,
                headers: {
                  "Content-Type": "application/json",
                  ...freshAuthHeaders,
                  ...options.headers,
                },
              };
              const retryResponse = await fetch(url, retryConfig);
              if (!retryResponse.ok) {
                const retryText = await retryResponse.text();
                throw new Error(
                  `HTTP error! status: ${retryResponse.status} - ${retryText}`
                );
              }
              return await retryResponse.json();
            }
          } catch (refreshErr) {
            console.warn("Token refresh attempt failed:", refreshErr);
          }

          throw new Error("Authentication failed - token expired");
        }

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
      console.error("API Error:", error.message);
      throw error;
    }
  }

  // Try to refresh access token using stored refresh token
  async tryRefreshToken() {
    try {
      const refreshToken = await AsyncStorage.getItem(
        "@ExpenseWise:refreshToken"
      );
      if (!refreshToken) {
        console.log("No refresh token available");
        return false;
      }

      console.log("Attempting token refresh");
      const url = `${this.baseURL}/auth/refresh`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.log("Refresh failed:", resp.status, txt);
        return false;
      }

      const data = await resp.json();
      if (data && data.token) {
        this.setAuthToken(data.token);
        // persist new refresh token if backend provided one
        if (data.refreshToken) {
          await AsyncStorage.setItem(
            "@ExpenseWise:refreshToken",
            data.refreshToken
          );
        }
        // Also persist auth token for other services that rely on AsyncStorage
        await AsyncStorage.setItem("@ExpenseWise:authToken", data.token);
        console.log("Token refresh successful");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error during token refresh:", error);
      return false;
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
    console.log('Attempting API login for:', email);
    const response = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    console.log('Full login response:', JSON.stringify(response, null, 2));
    
    // Extract data from nested structure
    const userData = response.data?.user || response.user;
    const tokens = response.data?.tokens || response.tokens || {};
    const accessToken = tokens.accessToken || response.token || response.accessToken;
    const refreshToken = tokens.refreshToken || response.refreshToken;

    console.log('Extracted login data:', {
      hasUser: !!userData,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 50)}...` : 'NULL'
    });
    
    if (accessToken) {
      console.log('Setting auth token in apiService');
      this.setAuthToken(accessToken);
    } else {
      console.error('No token in login response!');
    }

    // Normalize response to match expected structure
    return {
      success: response.success && !!userData && !!accessToken,
      user: userData,
      token: accessToken,
      refreshToken: refreshToken,
      message: response.message
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
