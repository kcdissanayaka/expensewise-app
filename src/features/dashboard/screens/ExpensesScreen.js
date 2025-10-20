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
  TextInput,
  Switch,
} from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { databaseService } from '../../../services';
import authService from '../../../services/auth/authService';

const ExpensesScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    categoryId: '',
    description: '',
    dueDate: '',            // optional date string: YYYY-MM-DD
    isRecurring: false,     // repeat monthly?
    recurrenceEnd: '',      // YYYY-MM-DD (until)
    isActive: 1,            // 1=show, 0=stop showing
  });

  useEffect(() => {
    loadExpenses();
    loadCategories();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const expenseData = await databaseService.getExpensesByUser(currentUser.id);
        setExpenses(expenseData);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  // const loadCategories = async () => {
  //   try {
  //     const currentUser = authService.getCurrentUser();
  //     console.log('[CAT] currentUser = ', currentUser);
  //     if (currentUser) {
  //       const categoryData = await databaseService.getCategoriesByUser(currentUser.id);
  //           console.log('[CAT] fetched from DB = ', categoryData?.length, categoryData?.slice(0,3));
  //       setCategories(categoryData.filter(cat => cat.is_active));
  //     }
  //   } catch (error) {
  //     console.error('Error loading categories:', error);
  //   }
  // };

  const loadCategories = async () => {
  try {
    const currentUser = authService.getCurrentUser();
    console.log('[CAT] currentUser = ', currentUser);

    if (!currentUser) {
      // If not logged in, you can redirect, or just bail gracefully
      setCategories([]);
      return;
    }

    let categoryData = await databaseService.getCategoriesByUser(currentUser.id);
    console.log('[CAT] fetched from DB = ', categoryData?.length);

    // If no categories, seed defaults once for this user
    if (!categoryData || categoryData.length === 0) {
      await databaseService.createDefaultCategoriesForUser(currentUser.id);
      categoryData = await databaseService.getCategoriesByUser(currentUser.id);
      console.log('[CAT] after seeding = ', categoryData?.length);
    }

    // Be tolerant with SQLite boolean values (0/1 or true/false)
    setCategories((categoryData || []).filter(cat => Number(cat.is_active) === 1));
  } catch (error) {
    console.error('Error loading categories:', error);
    setCategories([]); // fail-safe
  }
};

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExpenses();
    setRefreshing(false);
  };

  const handleAddExpense = async () => {
    if (!newExpense.title || !newExpense.amount || !newExpense.categoryId) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      await databaseService.createExpense(currentUser.id, {
        categoryId: parseInt(newExpense.categoryId),
        amount: parseFloat(newExpense.amount),
        title: newExpense.title,
        description: newExpense.description,
        type: 'Manual',
        status: 'Pending',
        dueDate: newExpense.dueDate || null,
        isRecurring: !!newExpense.isRecurring,
        recurrenceEnd: newExpense.recurrenceEnd || null,
        isActive: newExpense.isActive ? 1 : 0,
      });

      setNewExpense({ title: '', amount: '', categoryId: '', description: '',dueDate: '',
         isRecurring: false, recurrenceEnd: '', isActive: 1 });
      setModalVisible(false);
      await loadExpenses();
      Alert.alert('Success', 'Expense added successfully!');
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', 'Failed to add expense');
    }
  };

  const handleConfirmExpense = async (expenseId) => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      // Update expense status to 'Confirmed'
      await databaseService.db.runAsync(
        'UPDATE expenses SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        ['Confirmed', expenseId, currentUser.id]
      );

      // Reload expenses to reflect the change
      await loadExpenses();
      Alert.alert('Success', 'Expense confirmed successfully!');
    } catch (error) {
      console.error('Error confirming expense:', error);
      Alert.alert('Error', 'Failed to confirm expense');
    }
  };

  const handleExpenseAction = (expense) => {
    if (expense.status === 'Pending') {
      Alert.alert(
        'Confirm Expense',
        `Do you want to confirm "${expense.title}" for ${formatCurrency(expense.amount)}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Confirm', 
            onPress: () => handleConfirmExpense(expense.id),
            style: 'default'
          }
        ]
      );
    }
  };

  const formatCurrency = (amount) => `€${amount.toFixed(2)}`;

  const getMonthlyTotal = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return expenses
      .filter(expense => {
        const expenseDate = new Date(expense.created_at);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      })
      .reduce((total, expense) => total + expense.amount, 0);
  };

  const handleStopExpense = async (id) => {
  try {
    await databaseService.stopExpense(id);
    await loadExpenses();
    Alert.alert('Stopped', 'This expense will no longer be shown.');
  } catch (error) {
    console.error('Stop expense error:', error);
    Alert.alert('Error', 'Failed to stop this expense.');
  }
};

  const renderExpenseCard = (expense, index) => {
    const expenseDate = new Date(expense.created_at);
    const isToday = expenseDate.toDateString() === new Date().toDateString();
    const isPending = expense.status === 'Pending';

    return (
      <TouchableOpacity 
        key={index} 
        style={[
          styles.expenseCard, 
          { 
            backgroundColor: theme.colors.card,
            opacity: isPending ? 0.9 : 1.0
          }
        ]}
        onPress={() => handleExpenseAction(expense)}
        disabled={!isPending}
      >
        <View style={styles.expenseHeader}>
          <View style={styles.expenseInfo}>
            <Text style={[styles.expenseTitle, { color: theme.colors.text }]}>
              {expense.title}
              {isPending && <Text style={{ color: '#FFA500' }}> (Tap to confirm)</Text>}
            </Text>
            <Text style={[styles.expenseCategory, { color: theme.colors.textSecondary }]}>
              {expense.category_name}
            </Text>
          </View>
          <View style={styles.expenseRight}>
            <Text style={[styles.expenseAmount, { color: '#FF4444' }]}>
              -{formatCurrency(expense.amount)}
            </Text>
            <Text style={[styles.expenseDate, { color: theme.colors.textSecondary }]}>
              {isToday ? 'Today' : expenseDate.toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        {expense.description && (
          <Text style={[styles.expenseDescription, { color: theme.colors.textSecondary }]}>
            {expense.description}
          </Text>
        )}
        
        <View style={styles.expenseFooter}>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: expense.status === 'Pending' ? '#FFA500' : '#00B894' }
          ]}>
            <Text style={styles.statusText}>{expense.status}</Text>
          </View>

          {/* 🟥 Add Stop button here */}
          <TouchableOpacity onPress={() => handleStopExpense(expense.id)}>
            <Text style={{ color: '#FF4444', textDecorationLine: 'underline', fontSize: 12 }}>
              Stop
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAddExpenseModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Add New Expense
              </Text>
                        <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Title *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }]}
              placeholder="e.g., Grocery shopping"
              placeholderTextColor={theme.colors.textSecondary}
              value={newExpense.title}
              onChangeText={(text) => setNewExpense(prev => ({ ...prev, title: text }))}
            />
          </View>

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
              value={newExpense.amount}
              onChangeText={(text) => setNewExpense(prev => ({ ...prev, amount: text.replace(/[^0-9.]/g, '') }))}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Category *</Text>
            {/* <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: newExpense.categoryId === (category.id ? category.id.toString() : '') 
                        ? theme.colors.primary 
                        : theme.colors.card,
                      borderColor: theme.colors.border
                    }
                  ]}
                  onPress={() => setNewExpense(prev => ({ ...prev, categoryId: category.id ? category.id.toString() : '' }))}
                >
                  <Text style={[
                    styles.categoryChipText,
                    {
                      color: newExpense.categoryId === (category.id ? category.id.toString() : '') 
                        ? '#FFFFFF' 
                        : theme.colors.text
                    }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView> */}
            <View style={styles.inputGroup}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor:
                            newExpense.categoryId === (category.id ? category.id.toString() : '')
                              ? theme.colors.primary
                              : theme.colors.card,
                          borderColor: theme.colors.border
                        }
                      ]}
                      onPress={() =>
                        setNewExpense(prev => ({
                          ...prev,
                          categoryId: category.id ? category.id.toString() : ''
                        }))
                      }>
                      <Text
                        style={[
                          styles.categoryChipText,
                          {
                            color:
                              newExpense.categoryId === (category.id ? category.id.toString() : '')
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
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }]}
              placeholder="Optional description..."
              placeholderTextColor={theme.colors.textSecondary}
              value={newExpense.description}
              onChangeText={(text) => setNewExpense(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
            />
            {/* Due Date (YYYY-MM-DD) */}
            <View style= {styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Due date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textSecondary}
                value={newExpense.dueDate}
                onChangeText={(text) => setNewExpense(prev => ({ ...prev, dueDate: text.trim() }))}
              />
            </View>

            {/* Recurs monthly */}
            <View style={[styles.inputGroup, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Repeats monthly</Text>
              <Switch
                value={!!newExpense.isRecurring}
                onValueChange={(v) => setNewExpense(prev => ({ ...prev, isRecurring: v }))}
              />
            </View>

            {/* Until (only if recurring) */}
            {newExpense.isRecurring && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Until (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newExpense.recurrenceEnd}
                  onChangeText={(text) => setNewExpense(prev => ({ ...prev, recurrenceEnd: text.trim() }))}
                />
              </View>
            )}

            {/* Active toggle */}
            <View style={[styles.inputGroup, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Show this expense</Text>
              <Switch
                value={!!newExpense.isActive}
                onValueChange={(v) => setNewExpense(prev => ({ ...prev, isActive: v ? 1 : 0 }))}
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalPrimaryButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleAddExpense}
            >
              <Text style={styles.addButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading expenses...
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
            Expenses 💳
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            This month: {formatCurrency(getMonthlyTotal())}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.headerAddButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Expenses List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {expenses.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No expenses yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Start tracking your expenses by adding your first one!
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Add First Expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          expenses.map((expense, index) => renderExpenseCard(expense, index))
        )}
      </ScrollView>

      {renderAddExpenseModal()}
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
  headerAddButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalPrimaryButton: {
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  expenseCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  expenseCategory: {
    fontSize: 12,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 12,
  },
  expenseDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  expenseType: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 50,
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
  textArea: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
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
  addButton: {
    marginLeft: 8,
  },
});

export default ExpensesScreen;