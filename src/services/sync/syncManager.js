import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../api/apiService';
import databaseService from '../database/databaseService';

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
    NetInfo.addEventListener(state => {
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
      type, // 'expense', 'income', 'category'
      action, // 'create', 'update', 'delete'
      data,
      timestamp: Date.now(),
      retries: 0
    };
    
    // Store in persistent queue (survives app restart)
    try {
      const existingQueue = await AsyncStorage.getItem('sync_queue') || '[]';
      const queue = JSON.parse(existingQueue);
      queue.push(queueItem);
      await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
      
      console.log(`Queued for sync: ${type} ${action}`, data);
      
      // Try immediate sync if online
      if (this.isOnline && !this.isSyncing) {
        this.syncAll();
      }
    } catch (error) {
      console.error('Error queuing sync:', error);
    }
  }

  // Main sync function
  async syncAll() {
    if (this.isSyncing || !this.isOnline) return;

    try {
      this.isSyncing = true;
      console.log('Starting sync...');

      // Get pending items from persistent storage
      const queueStr = await AsyncStorage.getItem('sync_queue') || '[]';
      const queue = JSON.parse(queueStr);

      if (queue.length === 0) {
        console.log('Nothing to sync');
        return;
      }

      console.log(`Processing ${queue.length} sync items`);

      const processedItems = [];
      const failedItems = [];

      // Process each queued item
      for (const item of queue) {
        try {
          await this.syncItem(item);
          processedItems.push(item);
          console.log(`Successfully synced: ${item.type} ${item.action}`);
        } catch (error) {
          console.error('Sync failed:', item.type, item.action, error);
          
          // Retry logic
          item.retries = (item.retries || 0) + 1;
          if (item.retries < 3) {
            failedItems.push(item); // Keep for retry
            console.log(`Will retry ${item.type} ${item.action} (attempt ${item.retries})`);
          } else {
            console.log(`Giving up on ${item.type} ${item.action} after ${item.retries} attempts`);
          }
        }
      }

      // Update persistent queue (remove processed, keep failed)
      await AsyncStorage.setItem('sync_queue', JSON.stringify(failedItems));

      console.log(`Sync completed. Processed: ${processedItems.length}, Failed: ${failedItems.length}`);

    } catch (error) {
      console.error('Sync process error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Sync individual item
  async syncItem(item) {
    switch (item.type) {
      case 'expense':
        return await this.syncExpense(item);
      case 'income':
        return await this.syncIncome(item);
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  // Sync expense operations
  async syncExpense(item) {
    const { action, data } = item;
    console.log(`Syncing expense: ${action}`, data);

    switch (action) {
      case 'create':
        const createExpenseData = {
          title: data.title,
          amount: data.amount,
          description: data.description,
          dueDate: data.due_date || data.dueDate,
          status: data.status,
          category: data.category_name || 'other'
        };
        
        const expenseApiResponse = await apiService.createExpense(createExpenseData);
        console.log('Expense created in backend:', expenseApiResponse);
        
        // Update local record with API ID
        await databaseService.markAsSynced('expenses', data.id, expenseApiResponse.expense._id || expenseApiResponse.id);
        break;
        
      case 'update':
        const updateExpenseData = {
          title: data.title,
          amount: data.amount,
          description: data.description,
          dueDate: data.due_date || data.dueDate,
          status: data.status,
          category: data.category_name || 'other'
        };
        
        // Use api_id for updates, fallback to id if api_id doesn't exist
        const updateExpenseId = data.api_id;
        if (!updateExpenseId) {
          throw new Error('Cannot update expense: No API ID found. Expense may not be synced yet.');
        }
        
        console.log('Updating expense in backend with ID:', updateExpenseId);
        await apiService.updateExpense(updateExpenseId, updateExpenseData);
        await databaseService.markAsSynced('expenses', data.id);
        break;
        
      case 'delete':
        // Use api_id for deletes, fallback to id if api_id doesn't exist
        const deleteExpenseId = data.api_id;
        if (!deleteExpenseId) {
          console.log('Cannot delete expense from backend: No API ID found. Deleting locally only.');
          return; // Just delete locally if never synced
        }
        
        await apiService.deleteExpense(deleteExpenseId);
        break;
        
      default:
        throw new Error(`Unknown expense action: ${action}`);
    }
  }

 // Sync income operations - UPDATED WITH FALLBACK LOGIC
async syncIncome(item) {
  const { action, data } = item;
  console.log(`Syncing income: ${action}`, data);

  switch (action) {
    case 'create':
      // Prepare data for backend (map fields)
      const createData = {
        source: data.source,
        amount: data.amount,
        frequency: data.frequency,
        startDate: data.start_date || data.startDate,
        category: data.type === 'primary' ? 'salary' : 'freelance',
        isRecurring: true,
        description: data.source,
        api_id: data.id // Include SQLite ID for reference
      };
      
      console.log('Creating income in backend with data:', createData);
      const apiResponse = await apiService.createIncome(createData);
      console.log('Income created in backend:', apiResponse);
      
      // Update local record with MongoDB ObjectId
      const mongoDbId = apiResponse.income?._id || apiResponse._id || apiResponse.id;
      await databaseService.markAsSynced('income', data.id, mongoDbId);
      console.log('Local income marked as synced with API ID:', mongoDbId);
      break;
      
    case 'update':
      // Prepare data for backend (map fields)
      const updateData = {
        source: data.source,
        amount: data.amount,
        frequency: data.frequency,
        startDate: data.start_date || data.startDate,
        category: data.type === 'primary' ? 'salary' : 'freelance',
        isRecurring: true,
        description: data.source,
      };
      
      // FIX: Handle missing api_id by finding the MongoDB record
      let updateIncomeId = data.api_id;
      
      if (!updateIncomeId) {
        console.log('No API ID found, trying to find MongoDB record by source/amount...');
        
        // Try to find the MongoDB record by matching source, amount, and user
        // This is a fallback for records created before the sync fix
        const searchParams = {
          source: data.source,
          amount: data.amount,
          // We can't filter by userId here since we don't have it in the sync data
        };
        
        // For now, let's try a different approach - create as new if update fails
        console.log('Creating as new income since no API ID exists...');
        const newApiResponse = await apiService.createIncome(updateData);
        const newMongoDbId = newApiResponse.income?._id || newApiResponse._id || newApiResponse.id;
        
        // Update local record with the new API ID
        await databaseService.markAsSynced('income', data.id, newMongoDbId);
        console.log('Created new income in backend and updated local API ID:', newMongoDbId);
        return; // Exit early since we handled this as a create
      }
      
      console.log('Updating income in backend with ID:', updateIncomeId);
      console.log('Update data:', updateData);
      await apiService.updateIncome(updateIncomeId, updateData);
      await databaseService.markAsSynced('income', data.id);
      console.log('Income updated successfully in backend');
      break;
      
    case 'delete':
      // Use api_id for deletes
      const deleteIncomeId = data.api_id;
      if (!deleteIncomeId) {
        console.log('Cannot delete from backend: No API ID found. Deleting locally only.');
        return;
      }
      
      console.log('Deleting income from backend with ID:', deleteIncomeId);
      await apiService.deleteIncome(deleteIncomeId);
      console.log('Income deleted successfully from backend');
      break;
      
    default:
      throw new Error(`Unknown income action: ${action}`);
  }
}

  // Manual sync trigger
  async manualSync() {
    console.log('Manual sync triggered');
    await this.syncAll();
  }

  // Get sync status
  async getSyncStatus() {
    try {
      const queueStr = await AsyncStorage.getItem('sync_queue') || '[]';
      const queue = JSON.parse(queueStr);
      
      return {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        pendingItems: queue.length,
        queue: queue
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        isOnline: false,
        isSyncing: false,
        pendingItems: 0,
        queue: []
      };
    }
  }

  // Clear sync queue (for debugging)
  async clearSyncQueue() {
    try {
      await AsyncStorage.setItem('sync_queue', '[]');
      console.log('Sync queue cleared');
    } catch (error) {
      console.error('Error clearing sync queue:', error);
    }
  }

  // Force sync specific item types
  async forceSyncType(type) {
    console.log(`Force syncing ${type}...`);
    const queueStr = await AsyncStorage.getItem('sync_queue') || '[]';
    const queue = JSON.parse(queueStr);
    
    const filteredQueue = queue.filter(item => item.type === type);
    
    if (filteredQueue.length === 0) {
      console.log(`No ${type} items to sync`);
      return;
    }
    
    console.log(`Force syncing ${filteredQueue.length} ${type} items`);
    
    for (const item of filteredQueue) {
      try {
        await this.syncItem(item);
      } catch (error) {
        console.error(`Force sync failed for ${type}:`, error);
      }
    }
  }
}

// Create singleton instance
const syncManager = new SyncManager();

export default syncManager;