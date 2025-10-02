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
      
      const success = await databaseService.initialize();
      
      if (success) {
        setIsInitialized(true);
        console.log('Database initialized successfully');
      } else {
        throw new Error('Database initialization failed');
      }
    } catch (error) {
      console.error('Database initialization error:', error);
      setError(error.message);
      
      Alert.alert(
        'Database Error',
        'Failed to initialize the database. Please restart the app.',
        [
          {
            text: 'Retry',
            onPress: initializeDatabase
          }
        ]
      );
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