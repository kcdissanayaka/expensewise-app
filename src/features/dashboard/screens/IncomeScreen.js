import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../../../app/providers/ThemeProvider';
import databaseService from '../../../services/database/databaseService';
import authService from '../../../services/auth/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IncomeScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [incomes, setIncomes] = useState([]); //all incomes store
  const [loading, setLoading] = useState(true); //loading state
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); //add income modal state
  const [editingIncome, setEditingIncome] = useState(null); //edit income modal state
  const [newIncome, setNewIncome] = useState({ //structure for new income data
    amount: '',
    source: '',
    type: 'primary',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
  });

  // Refs to keep track of open swipeables
  const swipeableRefs = useRef(new Map());

  useEffect(() => { //load incomes when screen opens
    loadIncomes();
  }, []);

  useEffect(() => {
    // Temporary fix - clear broken data
    const resetBrokenData = async () => {
      try {
        console.log('Cleaning up broken sync data...');
        
        // Delete the broken income record
        await databaseService.db.runAsync('DELETE FROM income WHERE id = ?', [45]);
        console.log('Broken income record (id: 45) deleted');
        
        // Clear sync queue
        await AsyncStorage.setItem('sync_queue', '[]');
        console.log('Sync queue cleared');
        
        // Reload incomes
        await loadIncomes();
        
        console.log('Cleanup completed. Now create new incomes to test.');
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };

    // Uncomment the line below to run the cleanup ONCE
    // resetBrokenData();
  }, []);

  const loadIncomes = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const incomeData = await databaseService.getIncomeByUser(currentUser.id);
        setIncomes(incomeData);
      }
    } catch (error) {
      console.error('Error loading incomes:', error);
      Alert.alert('Error', 'Failed to load income data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => { //pull-to-refresh function
    setRefreshing(true);
    await loadIncomes();
    setRefreshing(false);
  };

  const handleAddIncome = async () => { //validation for adding income
    if (!newIncome.amount || !newIncome.source) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      if (editingIncome) {
        // Update existing income using databaseService method
        await databaseService.updateIncome(editingIncome.id, {
          amount: parseFloat(newIncome.amount),
          source: newIncome.source,
          type: newIncome.type,
          frequency: newIncome.frequency,
          startDate: newIncome.startDate,
        });
        Alert.alert('Success', 'Income updated successfully!');
      } else {
        // Create new income using databaseService method
        await databaseService.createIncome(currentUser.id, {
          amount: parseFloat(newIncome.amount),
          source: newIncome.source,
          type: newIncome.type,
          frequency: newIncome.frequency,
          startDate: newIncome.startDate,
        });
        Alert.alert('Success', 'Income added successfully!');
      }

      setNewIncome({
        amount: '',
        source: '',
        type: 'primary',
        frequency: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
      });
      setEditingIncome(null);
      setModalVisible(false);
      await loadIncomes();
    } catch (error) {
      console.error('Error adding/updating income:', error);
      Alert.alert('Error', 'Failed to save income');
    }
  };

  const handleEditIncome = (income) => {
    setEditingIncome(income);
    setNewIncome({
      amount: income.amount.toString(),
      source: income.source,
      type: income.type,
      frequency: income.frequency,
      startDate: income.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    });
    setModalVisible(true);
  };

  const handleDeleteIncome = async (income) => {
    try {
      // Close the swipeable
      const swipeable = swipeableRefs.current.get(income.id);
      if (swipeable) {
        swipeable.close();
      }
      
      // Use databaseService method instead of direct SQL
      await databaseService.deleteIncome(income.id);
      await loadIncomes();
      Alert.alert('Success', 'Income deleted successfully!');
    } catch (error) {
      console.error('Error deleting income:', error);
      Alert.alert('Error', 'Failed to delete income');
    }
  };

  const formatCurrency = (amount) => `€${amount.toFixed(2)}`; //format money as Euros

  const getTotalMonthlyIncome = () => { //calculates total monthly income
    return incomes
      .filter(income => income.frequency === 'monthly')
      .reduce((total, income) => total + income.amount, 0);
  };

  // Render right actions for swipeable - now with immediate deletion
  const renderRightActions = (progress, dragX, income) => { //swipe delete functionality
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.deleteSwipeAction, { backgroundColor: '#FF3B30' }]}>
        <Animated.Text style={[styles.deleteSwipeText, { transform: [{ translateX: trans }] }]}>
          Deleting...
        </Animated.Text>
      </View>
    );
  };

  // Update the renderIncomeCard function to use Swipeable with immediate deletion
  const renderIncomeCard = (income, index) => {
    const getFrequencyColor = (frequency) => {
      switch (frequency) {
        case 'weekly': return '#4CAF50';
        case 'monthly': return '#2196F3';
        case 'yearly': return '#FF9800';
        default: return theme.colors.textSecondary;
      }
    };

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current.set(income.id, ref);
          } else {
            swipeableRefs.current.delete(income.id);
          }
        }}
        key={income.id || index}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, income)}
        onSwipeableRightOpen={() => {
          // Show confirmation and delete immediately
          Alert.alert(
            'Delete Income',
            `Are you sure you want to delete ${income.source}?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => {
                const swipeable = swipeableRefs.current.get(income.id);
                if (swipeable) {
                  swipeable.close();
                }
              }},
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => handleDeleteIncome(income)
              },
            ]
          );
        }}
        onSwipeableOpen={() => {
          // Close other open swipeables
          swipeableRefs.current.forEach((ref, id) => {
            if (id !== income.id && ref) {
              ref.close();
            }
          });
        }}
        rightThreshold={80}
        friction={2}
        overshootRight={false}
      >
        <TouchableOpacity
          style={[styles.incomeCard, { backgroundColor: theme.colors.card }]}
          onPress={() => handleEditIncome(income)}
        >
          <View style={styles.incomeHeader}>
            <View style={styles.incomeInfo}>
              <Text style={[styles.incomeSource, { color: theme.colors.text }]}>
                {income.source}
              </Text>
              <Text style={[styles.incomeType, { color: theme.colors.textSecondary }]}>
                {income.type === 'primary' ? 'Primary Income' : 'Secondary Income'}
              </Text>
            </View>
            <View style={styles.incomeRight}>
              <Text style={[styles.incomeAmount, { color: '#4CAF50' }]}>
                +{formatCurrency(income.amount)}
              </Text>
              <View style={[styles.frequencyBadge, { backgroundColor: getFrequencyColor(income.frequency) }]}>
                <Text style={styles.frequencyText}>{income.frequency}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.incomeFooter}>
            <Text style={[styles.incomeDate, { color: theme.colors.textSecondary }]}>
              Started: {income.start_date ? new Date(income.start_date).toLocaleDateString() : 'N/A'}
            </Text>
            {/* Remove the delete button from here since we have swipe to delete */}
            <View style={styles.deleteButtonPlaceholder} />
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  // Add the missing renderAddIncomeModal function
  const renderAddIncomeModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {
        setModalVisible(false);
        setEditingIncome(null);
        setNewIncome({
          amount: '',
          source: '',
          type: 'primary',
          frequency: 'monthly',
          startDate: new Date().toISOString().split('T')[0],
        });
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {editingIncome ? 'Edit Income' : 'Add New Income'}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Amount (EUR) *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }]}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textSecondary}
              value={newIncome.amount}
              onChangeText={(text) => setNewIncome(prev => ({ ...prev, amount: text.replace(/[^0-9.]/g, '') }))}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Source *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }]}
              placeholder="e.g., Salary, Freelance, Investment"
              placeholderTextColor={theme.colors.textSecondary}
              value={newIncome.source}
              onChangeText={(text) => setNewIncome(prev => ({ ...prev, source: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Type</Text>
            <View style={styles.radioGroup}>
              {['primary', 'secondary'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.radioOption,
                    {
                      backgroundColor: newIncome.type === type ? theme.colors.primary : theme.colors.card,
                      borderColor: theme.colors.border
                    }
                  ]}
                  onPress={() => setNewIncome(prev => ({ ...prev, type }))}
                >
                  <Text style={[
                    styles.radioText,
                    { color: newIncome.type === type ? '#FFFFFF' : theme.colors.text }
                  ]}>
                    {type === 'primary' ? 'Primary' : 'Secondary'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Frequency</Text>
            <View style={styles.radioGroup}>
              {['weekly', 'monthly', 'yearly'].map((frequency) => (
                <TouchableOpacity
                  key={frequency}
                  style={[
                    styles.radioOption,
                    {
                      backgroundColor: newIncome.frequency === frequency ? theme.colors.primary : theme.colors.card,
                      borderColor: theme.colors.border
                    }
                  ]}
                  onPress={() => setNewIncome(prev => ({ ...prev, frequency }))}
                >
                  <Text style={[
                    styles.radioText,
                    { color: newIncome.frequency === frequency ? '#FFFFFF' : theme.colors.text }
                  ]}>
                    {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Start Date</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textSecondary}
              value={newIncome.startDate}
              onChangeText={(text) => setNewIncome(prev => ({ ...prev, startDate: text }))}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={() => {
                setModalVisible(false);
                setEditingIncome(null);
                setNewIncome({
                  amount: '',
                  source: '',
                  type: 'primary',
                  frequency: 'monthly',
                  startDate: new Date().toISOString().split('T')[0],
                });
              }}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleAddIncome}
            >
              <Text style={styles.addButtonText}>
                {editingIncome ? 'Update' : 'Add'} Income
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Income Management</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Manage your income sources
          </Text>
        </View>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Monthly Income Summary</Text>
          <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>
            {formatCurrency(getTotalMonthlyIncome())}
          </Text>
          <Text style={[styles.summarySubtext, { color: theme.colors.textSecondary }]}>
            {incomes.length} income source{incomes.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Income List */}
        <View style={styles.incomeSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Income Sources</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setModalVisible(true)} //Add Income button
            >
              <Text style={styles.addButtonText}>+ Add Income</Text>
            </TouchableOpacity>
          </View>

          {incomes.length === 0 ? ( //empty state when no incomes exist
            <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
              <Text style={styles.emptyStateIcon}>💰</Text>
              <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
                No Income Sources Yet
              </Text>
              <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                Add your first income source to start tracking your earnings
              </Text>
              <TouchableOpacity
                style={[styles.emptyStateButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.emptyStateButtonText}>Add Your First Income</Text>
              </TouchableOpacity>
            </View>
          ) : (
            incomes.map((income, index) => renderIncomeCard(income, index))
          )}
        </View>
      </ScrollView>

      {renderAddIncomeModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  summaryCard: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 14,
  },
  incomeSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  incomeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  incomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  incomeInfo: {
    flex: 1,
  },
  incomeSource: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  incomeType: {
    fontSize: 14,
  },
  incomeRight: {
    alignItems: 'flex-end',
  },
  incomeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  frequencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  frequencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  incomeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incomeDate: {
    fontSize: 12,
  },
  deleteButtonPlaceholder: {
    width: 24, // Placeholder to maintain layout
  },
  // Swipe action styles
  deleteSwipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    borderRadius: 12,
    marginBottom: 12,
  },
  deleteSwipeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radioOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default IncomeScreen;