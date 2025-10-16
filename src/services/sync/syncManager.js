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

      const processedItems = [];
      const failedItems = [];

      // Process each queued item
      for (const item of queue) {
        try {
          await this.syncItem(item);
          processedItems.push(item);
        } catch (error) {
          console.error('Sync failed:', item.type, item.action, error);
          
          // Retry logic
          item.retries = (item.retries || 0) + 1;
          if (item.retries < 3) {
            failedItems.push(item); // Keep for retry
          }
        }
      }

      // Update persistent queue (remove processed, keep failed)
      await AsyncStorage.setItem('sync_queue', JSON.stringify(failedItems));

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

    switch (action) {
      case 'create':
        const apiResponse = await apiService.createExpense(data);
        // Update local record with API ID
        await databaseService.markAsSynced('expenses', data.id, apiResponse.id);
        break;
        
      case 'update':
        await apiService.updateExpense(data.api_id || data.id, data);
        await databaseService.markAsSynced('expenses', data.id);
        break;
        
      case 'delete':
        await apiService.deleteExpense(data.api_id || data.id);
        // Local record already deleted
        break;
        
      default:
        throw new Error(`Unknown expense action: ${action}`);
    }
  }

  // Sync income operations
  async syncIncome(item) {
    const { action, data } = item;

    switch (action) {
      case 'create':
        const apiResponse = await apiService.createIncome(data);
        await databaseService.markAsSynced('income', data.id, apiResponse.id);
        break;
        
      case 'update':
        await apiService.updateIncome(data.api_id || data.id, data);
        await databaseService.markAsSynced('income', data.id);
        break;
        
      case 'delete':
        await apiService.deleteIncome(data.api_id || data.id);
        break;
        
      default:
        throw new Error(`Unknown income action: ${action}`);
    }
  }
}

// Create singleton instance
const syncManager = new SyncManager();

export default syncManager;