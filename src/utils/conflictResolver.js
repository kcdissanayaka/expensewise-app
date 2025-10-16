// Conflict Resolution Utility for ExpenseWise
// Handles conflicts between local and remote user data during authentication

export const ConflictStrategy = {
  LOCAL_WINS: 'local_wins',
  REMOTE_WINS: 'remote_wins', 
  NEWER_WINS: 'newer_wins',
  MERGE: 'merge'
};

export class ConflictResolver {
  
  /**
   * Resolve conflicts between local and remote data
   * @param {Object} localData - Local data object
   * @param {Object} remoteData - Remote data object  
   * @param {string} strategy - Conflict resolution strategy
   * @returns {Object} Resolved data object
   */
  static resolveConflict(localData, remoteData, strategy = ConflictStrategy.NEWER_WINS) {
    switch (strategy) {
      case ConflictStrategy.LOCAL_WINS:
        return this._resolveLocalWins(localData, remoteData);
        
      case ConflictStrategy.REMOTE_WINS:
        return this._resolveRemoteWins(localData, remoteData);
        
      case ConflictStrategy.NEWER_WINS:
        return this._resolveNewerWins(localData, remoteData);
        
      case ConflictStrategy.MERGE:
        return this._resolveMerge(localData, remoteData);
        
      default:
        return this._resolveNewerWins(localData, remoteData);
    }
  }

  // Local data takes precedence
  static _resolveLocalWins(localData, remoteData) {
    return {
      ...localData,
      syncStatus: 'local_wins',
      conflictResolvedAt: new Date().toISOString()
    };
  }

  // Remote data takes precedence
  static _resolveRemoteWins(localData, remoteData) {
    return {
      ...remoteData,
      syncStatus: 'remote_wins',
      conflictResolvedAt: new Date().toISOString()
    };
  }

  // Newer data wins based on updatedAt timestamp
  static _resolveNewerWins(localData, remoteData) {
    const localTime = new Date(localData.updatedAt || localData.createdAt);
    const remoteTime = new Date(remoteData.updatedAt || remoteData.createdAt);
    
    const isLocalNewer = localTime > remoteTime;
    
    return {
      ...(isLocalNewer ? localData : remoteData),
      syncStatus: isLocalNewer ? 'local_newer' : 'remote_newer',
      conflictResolvedAt: new Date().toISOString()
    };
  }

  // Intelligent merge of local and remote user profile data
  static _resolveMerge(localData, remoteData) {
    // Start with remote data as base
    const merged = { ...remoteData };
    
    // Keep local changes for user profile fields
    const localPriorityFields = ['name', 'currency', 'financial_goals'];
    
    localPriorityFields.forEach(field => {
      if (localData[field] !== undefined && localData[field] !== remoteData[field]) {
        // If local field is newer, use local value
        const localTime = new Date(localData.updatedAt || localData.createdAt);
        const remoteTime = new Date(remoteData.updatedAt || remoteData.createdAt);
        
        if (localTime > remoteTime) {
          merged[field] = localData[field];
        }
      }
    });
    
    merged.syncStatus = 'merged';
    merged.conflictResolvedAt = new Date().toISOString();
    
    return merged;
  }

  // Check if two data objects have conflicts
  static hasConflict(localData, remoteData) {
    if (!localData || !remoteData) return false;
    
    // Compare key user profile fields
    const compareFields = ['name', 'currency', 'financial_goals', 'updatedAt'];
    
    for (const field of compareFields) {
      if (localData[field] !== remoteData[field]) {
        return true;
      }
    }
    
    return false;
  }

  // Get conflict resolution strategy for user profile data
  static getRecommendedStrategy(localData, remoteData, dataType = 'profile') {
    // For user profile, merge changes to preserve user preferences
    if (dataType === 'profile') {
      return ConflictStrategy.MERGE;
    }
    
    // Default to newer wins for other data types
    return ConflictStrategy.NEWER_WINS;
  }
}

export default ConflictResolver;