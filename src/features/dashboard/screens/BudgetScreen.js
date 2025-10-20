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
import syncManager from '../../../services/sync/syncManager';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../../constants';

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
  const [categorySpendingMap, setCategorySpendingMap] = useState({});
  const [allCategories, setAllCategories] = useState([]);

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
      const totalIncome = incomeData.reduce((sum, income) => sum + (income.amount || 0), 0);

      // Load expenses for current month
      const expenseData = await databaseService.getExpensesByUser(currentUser.id);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyExpenses = expenseData.filter(expense => {
        if (!expense.due_date) return false;
        const expenseDate = new Date(expense.due_date);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      });
      
      const totalExpenses = monthlyExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

      // Load user categories from database
      const userCategories = await databaseService.getCategoriesByUser(currentUser.id);

      // Combine user categories with default categories
      const combinedCategories = [
        // User categories from database
        ...userCategories.filter(cat => cat.is_active).map(cat => ({
          id: cat.id,
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          type: 'user',
          is_active: cat.is_active
        })),
        // Default categories from constants
        ...DEFAULT_EXPENSE_CATEGORIES.map((cat, index) => ({
          id: `default_${index}`,
          name: cat.category,
          color: getColorForDefaultCategory(cat.category),
          icon: cat.icon,
          type: 'default',
          is_active: true
        }))
      ];

      // Remove duplicates based on category name
      const uniqueCategories = combinedCategories.filter((category, index, self) =>
        index === self.findIndex((c) => c.name === category.name)
      );

      setAllCategories(uniqueCategories);

      // Load allocations
      const allocationTemplates = await databaseService.getAllocationsByUser(currentUser.id);
      
      // Transform allocation data to match what the component expects
      const allocations = [];
      allocationTemplates.forEach(template => {
        template.buckets.forEach(bucket => {
          // Better category identification
          let category_id = null;
          let category_name = null;
          
          // Check if bucket name is a category ID format
          const idMatch = bucket.name.match(/Category (\d+)/);
          if (idMatch) {
            category_id = parseInt(idMatch[1]);
          } else {
            // It's a category name (for default categories)
            category_name = bucket.name;
            // Try to find matching category in our combined list
            const matchingCategory = uniqueCategories.find(cat => cat.name === bucket.name);
            if (matchingCategory) {
              category_id = matchingCategory.type === 'user' ? matchingCategory.id : null;
            }
          }
          
          allocations.push({
            id: bucket.id,
            template_id: template.id,
            category_id: category_id,
            category_name: category_name,
            percentage: bucket.percentage,
            budget_limit: bucket.target_amount,
            bucket_name: bucket.name
          });
        });
      });

      // Calculate category spending for user categories only
      const spendingMap = {};
      for (const category of userCategories) {
        const spending = await calculateCategorySpending(category.id);
        spendingMap[category.id] = spending;
      }
      setCategorySpendingMap(spendingMap);

      setBudgetData({
        totalIncome,
        totalExpenses,
        allocations,
        categories: uniqueCategories
      });
    } catch (error) {
      console.error('Error loading budget data:', error);
      Alert.alert('Error', 'Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get colors for default categories
  const getColorForDefaultCategory = (categoryName) => {
    const colorMap = {
      'House Rent': '#FF6B6B',
      'Food & Dining': '#4ECDC4',
      'Transportation': '#45B7D1',
      'Utilities': '#FFA07A',
      'Healthcare': '#98D8C8',
      'Entertainment': '#F06292',
      'Shopping': '#AED581',
      'Dining Out': '#FFCC80',
      'Emergency Fund': '#9575CD',
      'Investment': '#4DB6AC'
    };
    return colorMap[categoryName] || '#2196F3';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBudgetData();
    setRefreshing(false);
  };

  // Safe currency formatting
  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return `€${numAmount.toFixed(2)}`;
  };

  // Implement category spending calculation (for user categories only)
  const calculateCategorySpending = async (categoryId) => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !categoryId) return 0;

      const expenses = await databaseService.getExpensesByUser(currentUser.id);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const categoryExpenses = expenses.filter(expense => {
        if (expense.category_id !== categoryId) return false;
        if (!expense.due_date) return false;
        
        const expenseDate = new Date(expense.due_date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear;
      });

      return categoryExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    } catch (error) {
      console.error('Error calculating category spending:', error);
      return 0;
    }
  };

  const getBudgetRecommendations = () => {
    const { totalIncome } = budgetData;
    const safeIncome = totalIncome || 0;
    return {
      needs: safeIncome * 0.5,
      wants: safeIncome * 0.3,
      savings: safeIncome * 0.2,
    };
  };

  const handleSaveAllocation = async () => {
    console.log('Saving allocation with form data:', allocationForm);
    
    if (!allocationForm.categoryId || !allocationForm.percentage) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Error', 'User not found');
        return;
      }

      const userId = currentUser.id;

      // Get the selected category
      const selectedCategory = allCategories.find(cat => 
        cat.id && cat.id.toString() === allocationForm.categoryId.toString()
      );

      if (!selectedCategory) {
        Alert.alert('Error', 'Selected category not found');
        return;
      }

      console.log('Selected category:', selectedCategory);

      // Prepare allocation data
      const allocationData = {
        userId: userId,
        categoryId: selectedCategory.type === 'user' ? parseInt(selectedCategory.id) : null,
        categoryName: selectedCategory.name,
        percentage: parseFloat(allocationForm.percentage),
        budgetLimit: allocationForm.budgetLimit ? parseFloat(allocationForm.budgetLimit) : null
      };

      console.log('Allocation data to save:', allocationData);

      let result;
      if (editingAllocation) {
        // Update existing allocation
        result = await databaseService.updateAllocation(editingAllocation.template_id, allocationData);
        
        // Queue for sync - include all necessary data
        syncManager.queueForSync('allocation', 'update', {
          ...allocationData,
          template_id: editingAllocation.template_id,
          id: editingAllocation.id,
          bucket_name: editingAllocation.bucket_name || selectedCategory.name
        });
        
        console.log('Queued allocation update for sync');
      } else {
        // Create new allocation
        result = await databaseService.createAllocation(allocationData);
        
        // Queue for sync - include all necessary data
        syncManager.queueForSync('allocation', 'create', {
          ...allocationData,
          template_id: result.id,
          id: result.id,
          bucket_name: selectedCategory.name
        });
        
        console.log('Queued allocation creation for sync');
      }

      setAllocationForm({ categoryId: '', percentage: '', budgetLimit: '' });
      setEditingAllocation(null);
      setModalVisible(false);
      await loadBudgetData();
      Alert.alert('Success', `Budget allocation ${editingAllocation ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error('Error saving allocation:', error);
      Alert.alert('Error', `Failed to save budget allocation: ${error.message}`);
    }
  };

  // Helper to get category by ID
  const getCategoryById = (categoryId) => {
    if (!categoryId) return null;
    return allCategories.find(cat => 
      cat.id && cat.id.toString() === categoryId.toString()
    );
  };

  const openEditAllocation = (allocation) => {
    console.log('Editing allocation:', allocation);
    
    // Determine the category ID for the form
    let categoryId = '';
    if (allocation.category_id) {
      categoryId = allocation.category_id.toString();
    } else if (allocation.category_name) {
      // Try to find the category by name
      const category = allCategories.find(cat => cat.name === allocation.category_name);
      if (category) {
        categoryId = category.id.toString();
      }
    } else if (allocation.bucket_name && !allocation.bucket_name.startsWith('Category ')) {
      // If bucket_name is a category name (not "Category X"), find the category
      const category = allCategories.find(cat => cat.name === allocation.bucket_name);
      if (category) {
        categoryId = category.id.toString();
      }
    }

    setEditingAllocation(allocation);
    setAllocationForm({
      categoryId: categoryId,
      percentage: allocation.percentage ? allocation.percentage.toString() : '',
      budgetLimit: allocation.budget_limit ? allocation.budget_limit.toString() : ''
    });
    setModalVisible(true);
  };

  const deleteAllocation = async (allocation) => {
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
              const currentUser = authService.getCurrentUser();
              if (!currentUser) {
                Alert.alert('Error', 'User not found');
                return;
              }

              await databaseService.deleteAllocation(allocation.template_id);
              
              // Queue for sync - include all necessary data
              syncManager.queueForSync('allocation', 'delete', {
                userId: currentUser.id,
                template_id: allocation.template_id,
                id: allocation.id
              });
              
              console.log('Queued allocation deletion for sync');
              
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
    const remaining = (totalIncome || 0) - (totalExpenses || 0);
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
    // Better category lookup
    let category;
    if (allocation.category_id) {
      category = getCategoryById(allocation.category_id);
    } else if (allocation.category_name) {
      category = allCategories.find(cat => cat.name === allocation.category_name);
    } else if (allocation.bucket_name && !allocation.bucket_name.startsWith('Category ')) {
      category = allCategories.find(cat => cat.name === allocation.bucket_name);
    }
    
    const categorySpending = categorySpendingMap[allocation.category_id] || 0;
    const budgetAmount = allocation.budget_limit || ((budgetData.totalIncome || 0) * (allocation.percentage || 0) / 100);
    const spentPercentage = budgetAmount > 0 ? (categorySpending / budgetAmount) * 100 : 0;

    return (
      <View key={allocation.id || index} style={[styles.allocationCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.allocationHeader}>
          <View style={styles.allocationInfo}>
            <Text style={[styles.allocationCategory, { color: theme.colors.text }]}>
              {category?.name || allocation.category_name || allocation.bucket_name || 'Unknown Category'}
            </Text>
            <Text style={[styles.allocationPercentage, { color: theme.colors.textSecondary }]}>
              {allocation.percentage}% of income
            </Text>
            {category?.type === 'default' && (
              <Text style={[styles.defaultCategoryBadge, { color: theme.colors.primary }]}>
                Default Category
              </Text>
            )}
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
              onPress={() => deleteAllocation(allocation)}
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
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {allCategories.map((category) => (
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
                  onPress={() => setAllocationForm(prev => ({ 
                    ...prev, 
                    categoryId: category.id ? category.id.toString() : '' 
                  }))}
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
                  {category.type === 'default' && (
                    <Text style={styles.defaultBadge}>•</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
              • indicates default categories
            </Text>
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderBudgetOverview()}

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
  defaultCategoryBadge: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
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
  categoryScrollContent: {
    paddingVertical: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  defaultBadge: {
    fontSize: 16,
    color: '#FF9800',
    marginLeft: 4,
  },
  helperText: {
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
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