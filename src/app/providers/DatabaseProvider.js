import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { databaseService } from '../../services';

const DatabaseContext = createContext({});

export const DatabaseProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Starting database initialization...');
      
      const success = await databaseService.initialize();
      
      if (success) {
        setIsInitialized(true);
        console.log('Database provider: Database initialized successfully');
      } else {
        throw new Error('Database initialization returned false');
      }
    } catch (error) {
      console.error('Database provider initialization error:', error);
      setError(error.message);
      setIsInitialized(false);
      
      // Don't show alert in development, just log
      if (__DEV__) {
        console.warn('Database initialization failed in development mode');
      } else {
        Alert.alert(
          'Database Error',
          'Failed to initialize the database. Please restart the app.',
          [
            {
              text: 'Retry',
              onPress: initializeDatabase
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = {
    isInitialized,
    isLoading,
    error,
    database: databaseService,
    reinitialize: initializeDatabase
  };

  return (
    <DatabaseContext.Provider value={contextValue}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  
  return context;
};

export default DatabaseProvider;