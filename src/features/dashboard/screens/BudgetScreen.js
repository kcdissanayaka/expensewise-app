import React, { useState, useEffect } from 'react';
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
  TextInput
} from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import databaseService from '../../../services/database/databaseService';
import authService from '../../../services/auth/authService';

const BudgetScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [budgetData, setBudgetData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    allocations: [],
    categories: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [allocationForm, setAllocationForm] = useState({
    categoryId: '',
    percentage: '',
    budgetLimit: ''
  });

  useEffect(() => {
    loadBudgetData();
  }, []);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      // Load income
      const incomeData = await databaseService.getIncomeByUser(currentUser.id);
      const totalIncome = incomeData.reduce((sum, income) => sum + income.amount, 0);

      // Load expenses for current month
      const expenseData = await databaseService.getExpensesByUser(currentUser.id);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyExpenses = expenseData.filter(expense => {
        const expenseDate = new Date(expense.created_at);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      });
      
      const totalExpenses = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);

      // Load allocations
      const allocations = await databaseService.getAllocationsByUser(currentUser.id);
      
      // Load categories
      const categories = await databaseService.getCategoriesByUser(currentUser.id);

      setBudgetData({
        totalIncome,
        totalExpenses,
        allocations,
        categories: categories.filter(cat => cat.is_active)
      });
    } catch (error) {
      console.error('Error loading budget data:', error);
      Alert.alert('Error', 'Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBudgetData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => `€${amount.toFixed(2)}`;

  const calculateCategorySpending = (categoryId) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // This would need to be implemented in database service
    // For now, return 0
    return 0;
  };

  const getBudgetRecommendations = () => {
    const { totalIncome } = budgetData;
    return {
      needs: totalIncome * 0.5, // 50% for needs
      wants: totalIncome * 0.3, // 30% for wants
      savings: totalIncome * 0.2, // 20% for savings
    };
  };

  const handleSaveAllocation = async () => {
    if (!allocationForm.categoryId || !allocationForm.percentage) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      const allocationData = {
        userId: currentUser.id,
        categoryId: parseInt(allocationForm.categoryId),
        percentage: parseFloat(allocationForm.percentage),
        budgetLimit: allocationForm.budgetLimit ? parseFloat(allocationForm.budgetLimit) : null
      };

      if (editingAllocation) {
        // Update existing allocation
        await databaseService.updateAllocation(editingAllocation.id, allocationData);
      } else {
        // Create new allocation
        await databaseService.createAllocation(allocationData);
      }

      setAllocationForm({ categoryId: '', percentage: '', budgetLimit: '' });
      setEditingAllocation(null);
      setModalVisible(false);
      await loadBudgetData();
      Alert.alert('Success', `Budget allocation ${editingAllocation ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error('Error saving allocation:', error);
      Alert.alert('Error', 'Failed to save budget allocation');
    }
  };

  const openEditAllocation = (allocation) => {
    setEditingAllocation(allocation);
    setAllocationForm({
      categoryId: allocation.category_id ? allocation.category_id.toString() : '',
      percentage: allocation.percentage ? allocation.percentage.toString() : '',
      budgetLimit: allocation.budget_limit ? allocation.budget_limit.toString() : ''
    });
    setModalVisible(true);
  };

  const deleteAllocation = async (allocationId) => {
    Alert.alert(
      'Delete Allocation',
      'Are you sure you want to delete this budget allocation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteAllocation(allocationId);
              await loadBudgetData();
              Alert.alert('Success', 'Budget allocation deleted successfully!');
            } catch (error) {
              console.error('Error deleting allocation:', error);
              Alert.alert('Error', 'Failed to delete budget allocation');
            }
          }
        }
      ]
    );
  };

  const renderBudgetOverview = () => {
    const { totalIncome, totalExpenses } = budgetData;
    const remaining = totalIncome - totalExpenses;
    const recommendations = getBudgetRecommendations();

    return (
      <View style={[styles.overviewCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Budget Overview 📊
        </Text>
        
        <View style={styles.overviewRow}>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>
              Monthly Income
            </Text>
            <Text style={[styles.overviewAmount, { color: '#00B894' }]}>
              {formatCurrency(totalIncome)}
            </Text>
          </View>
          
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>
              Monthly Expenses
            </Text>
            <Text style={[styles.overviewAmount, { color: '#FF4444' }]}>
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
        </View>
        
        <View style={styles.remainingContainer}>
          <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>
            Remaining Budget
          </Text>
          <Text style={[
            styles.remainingAmount,
            { color: remaining >= 0 ? '#00B894' : '#FF4444' }
          ]}>
            {formatCurrency(remaining)}
          </Text>
        </View>

        {/* 50/30/20 Rule Recommendations */}
        <View style={styles.recommendationContainer}>
          <Text style={[styles.recommendationTitle, { color: theme.colors.text }]}>
            50/30/20 Rule Recommendations
          </Text>
          
          <View style={styles.recommendationItem}>
            <Text style={[styles.recommendationLabel, { color: theme.colors.textSecondary }]}>
              Needs (50%): {formatCurrency(recommendations.needs)}
            </Text>
          </View>
          
          <View style={styles.recommendationItem}>
            <Text style={[styles.recommendationLabel, { color: theme.colors.textSecondary }]}>
              Wants (30%): {formatCurrency(recommendations.wants)}
            </Text>
          </View>
          
          <View style={styles.recommendationItem}>
            <Text style={[styles.recommendationLabel, { color: theme.colors.textSecondary }]}>
              Savings (20%): {formatCurrency(recommendations.savings)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAllocationCard = (allocation, index) => {
    const category = budgetData.categories.find(cat => cat.id === allocation.category_id);
    const categorySpending = calculateCategorySpending(allocation.category_id);
    const budgetAmount = allocation.budget_limit || (budgetData.totalIncome * allocation.percentage / 100);
    const spentPercentage = budgetAmount > 0 ? (categorySpending / budgetAmount) * 100 : 0;

    return (
      <View key={index} style={[styles.allocationCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.allocationHeader}>
          <View style={styles.allocationInfo}>
            <Text style={[styles.allocationCategory, { color: theme.colors.text }]}>
              {category?.name || 'Unknown Category'}
            </Text>
            <Text style={[styles.allocationPercentage, { color: theme.colors.textSecondary }]}>
              {allocation.percentage}% of income
            </Text>
          </View>
          
          <View style={styles.allocationActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => openEditAllocation(allocation)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => deleteAllocation(allocation.id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.allocationAmounts}>
          <Text style={[styles.budgetAmount, { color: theme.colors.text }]}>
            Budget: {formatCurrency(budgetAmount)}
          </Text>
          <Text style={[styles.spentAmount, { color: '#FF4444' }]}>
            Spent: {formatCurrency(categorySpending)}
          </Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(spentPercentage, 100)}%`,
                  backgroundColor: spentPercentage > 100 ? '#FF4444' : 
                                   spentPercentage > 80 ? '#FFA500' : '#00B894'
                }
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            {spentPercentage.toFixed(1)}% used
          </Text>
        </View>
      </View>
    );
  };

  const renderAllocationModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {editingAllocation ? 'Edit' : 'Add'} Budget Allocation
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {budgetData.categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: allocationForm.categoryId === (category.id ? category.id.toString() : '') 
                        ? theme.colors.primary 
                        : theme.colors.card,
                      borderColor: theme.colors.border
                    }
                  ]}
                  onPress={() => setAllocationForm(prev => ({ ...prev, categoryId: category.id ? category.id.toString() : '' }))}
                >
                  <Text style={[
                    styles.categoryChipText,
                    {
                      color: allocationForm.categoryId === (category.id ? category.id.toString() : '') 
                        ? '#FFFFFF' 
                        : theme.colors.text
                    }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Percentage of Income *
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }]}
              placeholder="e.g., 30"
              placeholderTextColor={theme.colors.textSecondary}
              value={allocationForm.percentage}
              onChangeText={(text) => setAllocationForm(prev => ({ 
                ...prev, 
                percentage: text.replace(/[^0-9.]/g, '') 
              }))}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Budget Limit (EUR)
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }]}
              placeholder="Optional fixed amount"
              placeholderTextColor={theme.colors.textSecondary}
              value={allocationForm.budgetLimit}
              onChangeText={(text) => setAllocationForm(prev => ({ 
                ...prev, 
                budgetLimit: text.replace(/[^0-9.]/g, '') 
              }))}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={() => {
                setModalVisible(false);
                setEditingAllocation(null);
                setAllocationForm({ categoryId: '', percentage: '', budgetLimit: '' });
              }}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSaveAllocation}
            >
              <Text style={styles.saveButtonText}>
                {editingAllocation ? 'Update' : 'Save'}
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
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading budget data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Budget 💰
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Manage your budget allocations
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderBudgetOverview()}

        {/* Budget Allocations */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Budget Allocations
        </Text>

        {budgetData.allocations.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No budget allocations yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Set up budget allocations to track your spending by category
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Create First Allocation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          budgetData.allocations.map((allocation, index) => 
            renderAllocationCard(allocation, index)
          )
        )}
      </ScrollView>

      {renderAllocationModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  overviewCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  overviewItem: {
    flex: 1,
  },
  overviewLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  overviewAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  remainingContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  remainingAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  recommendationContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  recommendationItem: {
    marginBottom: 4,
  },
  recommendationLabel: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  allocationCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  allocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  allocationInfo: {
    flex: 1,
  },
  allocationCategory: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  allocationPercentage: {
    fontSize: 12,
  },
  allocationActions: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#0084FF',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FF4444',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  allocationAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  spentAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
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
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  saveButton: {
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default BudgetScreen;