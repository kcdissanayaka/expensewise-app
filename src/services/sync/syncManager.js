import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiService from "../api/apiService";
import databaseService from "../database/databaseService";
import authService from "../auth/authService";

class SyncManager {
  constructor() {
    this.syncQueue = [];
    this.isOnline = false;
    this.isSyncing = false;
    this.syncInterval = null;
    this.setupNetworkListener();
  }

  // Setup network connectivity listener
  setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected;

      // If we just came back online, start syncing
      if (wasOffline && this.isOnline) {
        this.startPeriodicSync();
        this.syncAll();
      } else if (!this.isOnline) {
        this.stopPeriodicSync();
      }
    });
  }

  // Start periodic sync when online
  startPeriodicSync() {
    if (this.syncInterval) return;

    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, 30000);
  }

  // Stop periodic sync
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Queue data for sync (LOCAL-FIRST operations call this)
  async queueForSync(type, action, data) {
    const queueItem = {
      id: Date.now() + Math.random(),
      type, // 'expense', 'income', 'category', 'allocation', 'user'
      action, // 'create', 'update', 'delete'
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    // Store in persistent queue (survives app restart)
    try {
      const existingQueue = (await AsyncStorage.getItem("sync_queue")) || "[]";
      const queue = JSON.parse(existingQueue);
      queue.push(queueItem);
      await AsyncStorage.setItem("sync_queue", JSON.stringify(queue));

      // Try immediate sync if online
      if (this.isOnline && !this.isSyncing) {
        this.syncAll();
      }
    } catch (error) {
      console.error("Error queuing sync:", error);
    }
  }

  // Main sync function
  async syncAll() {
    if (this.isSyncing || !this.isOnline) return;

    try {
      this.isSyncing = true;

      const queueStr = (await AsyncStorage.getItem("sync_queue")) || "[]";
      const queue = JSON.parse(queueStr);

      if (queue.length === 0) {
        return;
      }

      const processedItems = [];
      const failedItems = [];

      for (const item of queue) {
        try {
          await this.syncItem(item);
          processedItems.push(item);
        } catch (error) {
          console.error("Sync failed:", item.type, item.action, error);

          item.retries = (item.retries || 0) + 1;
          if (item.retries < 3) {
            failedItems.push(item);
          }
        }
      }

      await AsyncStorage.setItem("sync_queue", JSON.stringify(failedItems));
    } catch (error) {
      console.error("Sync process error:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Sync individual item
  async syncItem(item) {
    switch (item.type) {
      case "expense":
        return await this.syncExpense(item);
      case "income":
        return await this.syncIncome(item);
      case "user":
        return await this.syncUser(item);
      case "allocation":
        return await this.syncAllocation(item);
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  // Sync user profile updates to backend
  async syncUser(item) {
    const { action, data } = item;

    if (action !== "update") {
      return;
    }

    try {
      const SyncService = (await import("./syncService")).default;
      const payload = await SyncService._transformUserForBackend(data);

      const resp = await apiService.request("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const apiId = resp?.user?._id || resp?.user?.id || resp?.id || null;

      if (data.id) {
        await databaseService.markAsSynced("users", data.id, apiId);
      }

      return;
    } catch (error) {
      console.error("Failed to sync user:", error);

      // Detect if user account was deleted from backend (404 or "not found" errors)
      if (
        error.message.includes("404") ||
        error.message.toLowerCase().includes("user not found") ||
        error.message.toLowerCase().includes("user does not exist") ||
        error.message.toLowerCase().includes("account not found")
      ) {
        // User deleted from backend - logout locally and redirect to login screen
        console.warn("User account deleted from backend, logging out...");
        await authService.logout();

        // Trigger global event for app-level navigation handling
        if (global.onUserDeletedFromBackend) {
          global.onUserDeletedFromBackend();
        }
      }

      throw error;
    }
  }

  // Sync expense operations
  async syncExpense(item) {
    const { action, data } = item;

    switch (action) {
      case "create":
        const createExpenseData = {
          title: data.title,
          amount: data.amount,
          description: data.description,
          dueDate: data.due_date || data.dueDate,
          status: data.status,
          category: data.category_name || "other",
        };

        const expenseApiResponse = await apiService.createExpense(
          createExpenseData
        );
        await databaseService.markAsSynced(
          "expenses",
          data.id,
          expenseApiResponse.expense._id || expenseApiResponse.id
        );
        break;

      case "update":
        const updateExpenseData = {
          title: data.title,
          amount: data.amount,
          description: data.description,
          dueDate: data.due_date || data.dueDate,
          status: data.status,
          category: data.category_name || "other",
        };

        const updateExpenseId = data.api_id;
        if (!updateExpenseId) {
          throw new Error("Cannot update expense: No API ID found.");
        }

        await apiService.updateExpense(updateExpenseId, updateExpenseData);
        await databaseService.markAsSynced("expenses", data.id);
        break;

      case "delete":
        const deleteExpenseId = data.api_id;
        if (!deleteExpenseId) {
          return;
        }

        await apiService.deleteExpense(deleteExpenseId);
        break;

      default:
        throw new Error(`Unknown expense action: ${action}`);
    }
  }

  // Sync income operations
  async syncIncome(item) {
    const { action, data } = item;

    switch (action) {
      case "create":
        const createData = {
          source: data.source,
          amount: data.amount,
          frequency: data.frequency,
          startDate: data.start_date || data.startDate,
          category: data.type === "primary" ? "salary" : "freelance",
          isRecurring: true,
          description: data.source,
          api_id: data.id,
        };

        const apiResponse = await apiService.createIncome(createData);
        const mongoDbId =
          apiResponse.income?._id || apiResponse._id || apiResponse.id;
        await databaseService.markAsSynced("income", data.id, mongoDbId);
        break;

      case "update":
        const updateData = {
          source: data.source,
          amount: data.amount,
          frequency: data.frequency,
          startDate: data.start_date || data.startDate,
          category: data.type === "primary" ? "salary" : "freelance",
          isRecurring: true,
          description: data.source,
        };

        let updateIncomeId = data.api_id;

        if (!updateIncomeId) {
          const newApiResponse = await apiService.createIncome(updateData);
          const newMongoDbId =
            newApiResponse.income?._id ||
            newApiResponse._id ||
            newApiResponse.id;
          await databaseService.markAsSynced("income", data.id, newMongoDbId);
          return;
        }

        await apiService.updateIncome(updateIncomeId, updateData);
        await databaseService.markAsSynced("income", data.id);
        break;

      case "delete":
        const deleteIncomeId = data.api_id;
        if (!deleteIncomeId) {
          return;
        }

        await apiService.deleteIncome(deleteIncomeId);
        break;

      default:
        throw new Error(`Unknown income action: ${action}`);
    }
  }

  // Sync allocation operations
  async syncAllocation(item) {
    const { action, data } = item;
    console.log(`Syncing allocation: ${action}`, data);

    try {
      // Get current user for userId
      const currentUser = authService.getCurrentUser();

      if (!currentUser || !currentUser.id) {
        throw new Error("User not authenticated or user ID not found");
      }

      const userId = currentUser.id;

      switch (action) {
        case "create":
          const createAllocationData = {
            userId: userId,
            categoryId: data.categoryId,
            categoryName: data.categoryName,
            percentage: data.percentage,
            budgetLimit: data.budgetLimit,
            templateId: data.template_id || data.templateId,
            bucketName:
              data.bucket_name || data.bucketName || data.categoryName,
          };

          console.log(
            "Creating allocation in backend with data:",
            createAllocationData
          );
          const allocationApiResponse = await apiService.createAllocation(
            createAllocationData
          );
          console.log("Allocation created in backend:", allocationApiResponse);
          break;

        case "update":
          const updateAllocationData = {
            userId: userId,
            categoryId: data.categoryId,
            categoryName: data.categoryName,
            percentage: data.percentage,
            budgetLimit: data.budgetLimit,
          };

          // For allocations, we use templateId to find the existing record
          const templateId = data.template_id || data.templateId;
          if (!templateId) {
            throw new Error("Cannot update allocation: No templateId found");
          }

          console.log("Searching for allocation with templateId:", templateId);

          // Get all allocations for the user
          const existingAllocations = await apiService.getAllocations({
            userId: userId,
          });

          if (
            existingAllocations.success &&
            existingAllocations.allocations &&
            existingAllocations.allocations.length > 0
          ) {
            // Find allocation with matching templateId
            const matchingAllocation = existingAllocations.allocations.find(
              (alloc) => alloc.templateId === templateId.toString()
            );

            if (matchingAllocation) {
              console.log(
                "Updating allocation in backend with ID:",
                matchingAllocation._id
              );
              await apiService.updateAllocation(
                matchingAllocation._id,
                updateAllocationData
              );
              console.log("Allocation updated successfully in backend");
            } else {
              console.log("No matching allocation found, creating as new...");
              await apiService.createAllocation({
                ...updateAllocationData,
                templateId: templateId,
                bucketName: data.bucket_name || data.categoryName,
              });
              console.log(
                "Created new allocation in backend (update fallback)"
              );
            }
          } else {
            console.log("No allocations found for user, creating as new...");
            await apiService.createAllocation({
              ...updateAllocationData,
              templateId: templateId,
              bucketName: data.bucket_name || data.categoryName,
            });
            console.log("Created new allocation in backend (update fallback)");
          }
          break;

        case "delete":
          // For deletes, we need to find the allocation by templateId
          const deleteTemplateId = data.template_id || data.templateId;
          if (!deleteTemplateId) {
            console.log("Cannot delete allocation: No templateId found");
            return;
          }

          console.log(
            "Searching for allocation to delete with templateId:",
            deleteTemplateId
          );

          // Get all allocations for the user
          const allocationsToDelete = await apiService.getAllocations({
            userId: userId,
          });

          if (
            allocationsToDelete.success &&
            allocationsToDelete.allocations &&
            allocationsToDelete.allocations.length > 0
          ) {
            // Find allocation with matching templateId
            const allocationToDelete = allocationsToDelete.allocations.find(
              (alloc) => alloc.templateId === deleteTemplateId.toString()
            );

            if (allocationToDelete) {
              console.log(
                "Deleting allocation from backend with ID:",
                allocationToDelete._id
              );
              await apiService.deleteAllocation(allocationToDelete._id);
              console.log("Allocation deleted successfully from backend");
            } else {
              console.log(
                "Cannot delete allocation: No matching allocation found in backend"
              );
            }
          } else {
            console.log(
              "Cannot delete allocation: No allocations found for user"
            );
          }
          break;

        default:
          throw new Error(`Unknown allocation action: ${action}`);
      }
    } catch (error) {
      console.error("Error in allocation sync:", error);
      throw error;
    }
  }

  // Manual sync trigger
  async manualSync() {
    await this.syncAll();
  }

  // Get sync status
  async getSyncStatus() {
    try {
      const queueStr = (await AsyncStorage.getItem("sync_queue")) || "[]";
      const queue = JSON.parse(queueStr);

      return {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        pendingItems: queue.length,
        queue: queue,
      };
    } catch (error) {
      console.error("Error getting sync status:", error);
      return {
        isOnline: false,
        isSyncing: false,
        pendingItems: 0,
        queue: [],
      };
    }
  }
}

// Create singleton instance
const syncManager = new SyncManager();

export default syncManager;
