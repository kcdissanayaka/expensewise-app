import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  Dimensions
} from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import authService from '../../../services/auth/authService';
import { databaseService } from '../../../services';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    user: null,
    totalIncome: 0,
    totalExpenses: 0,
    remainingBudget: 0,
    recentExpenses: [],
    budgetBreakdown: {
      needs: { allocated: 0, spent: 0, remaining: 0 },
      wants: { allocated: 0, spent: 0, remaining: 0 },
      savings: { allocated: 0, spent: 0, remaining: 0 }
    },
    monthlyStats: {
      currentMonth: new Date().toLocaleString('default', { month: 'long' }),
      expensesByCategory: []
    }
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      
      if (!currentUser) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      // Get user's income data
      const incomeRecords = await databaseService.getIncomeByUser(currentUser.id);
      const totalIncome = incomeRecords.reduce((sum, income) => sum + income.amount, 0);

      // Get user's expenses
      const expenseRecords = await databaseService.getExpensesByUser(currentUser.id);
      const totalExpenses = expenseRecords.reduce((sum, expense) => sum + expense.amount, 0);

      // Get recent expenses (last 5)
      const recentExpenses = expenseRecords
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      // Calculate budget breakdown (50/30/20 rule)
      const budgetBreakdown = {
        needs: {
          allocated: totalIncome * 0.5,
          spent: expenseRecords
            .filter(exp => exp.category_name && ['House Rent', 'Food & Dining', 'Transportation', 'Utilities', 'Healthcare'].includes(exp.category_name))
            .reduce((sum, exp) => sum + exp.amount, 0),
          remaining: 0
        },
        wants: {
          allocated: totalIncome * 0.3,
          spent: expenseRecords
            .filter(exp => exp.category_name && ['Entertainment', 'Shopping', 'Travel'].includes(exp.category_name))
            .reduce((sum, exp) => sum + exp.amount, 0),
          remaining: 0
        },
        savings: {
          allocated: totalIncome * 0.2,
          spent: expenseRecords
            .filter(exp => exp.category_name && ['Savings', 'Emergency Fund'].includes(exp.category_name))
            .reduce((sum, exp) => sum + exp.amount, 0),
          remaining: 0
        }
      };

      // Calculate remaining amounts
      budgetBreakdown.needs.remaining = budgetBreakdown.needs.allocated - budgetBreakdown.needs.spent;
      budgetBreakdown.wants.remaining = budgetBreakdown.wants.allocated - budgetBreakdown.wants.spent;
      budgetBreakdown.savings.remaining = budgetBreakdown.savings.allocated - budgetBreakdown.savings.spent;

      // Group expenses by category
      const expensesByCategory = {};
      expenseRecords.forEach(expense => {
        const category = expense.category_name || 'Other';
        if (!expensesByCategory[category]) {
          expensesByCategory[category] = { total: 0, count: 0 };
        }
        expensesByCategory[category].total += expense.amount;
        expensesByCategory[category].count += 1;
      });

      const expensesByCategoryArray = Object.entries(expensesByCategory)
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.total - a.total);

      setDashboardData({
        user: currentUser,
        totalIncome,
        totalExpenses,
        remainingBudget: totalIncome - totalExpenses,
        recentExpenses,
        budgetBreakdown,
        monthlyStats: {
          currentMonth: new Date().toLocaleString('default', { month: 'long' }),
          expensesByCategory: expensesByCategoryArray
        }
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const handleResetDatabase = async () => {
    Alert.alert(
      'Reset Database',
      'This will delete ALL data including users, expenses, and settings. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.resetDatabase();
              Alert.alert('Success', 'Database reset successfully! App will restart.', [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Login' }],
                    });
                  }
                }
              ]);
            } catch (error) {
              console.error('Database reset error:', error);
              Alert.alert('Error', 'Failed to reset database');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const formatCurrency = (amount) => {
    return `€${amount.toFixed(2)}`;
  };

  const getBudgetColor = (spent, allocated) => {
    const percentage = (spent / allocated) * 100;
    if (percentage > 90) return '#FF4444';
    if (percentage > 70) return '#FF8800';
    return '#00B894';
  };

  const renderWelcomeCard = () => (
    <View style={[styles.welcomeCard, { backgroundColor: theme.colors.primary }]}>
      <Text style={styles.welcomeTitle}>
        Welcome back, {dashboardData.user?.name}! 👋
      </Text>
      <Text style={styles.welcomeSubtitle}>
        Here's your financial overview for {dashboardData.monthlyStats.currentMonth}
      </Text>
    </View>
  );

  const renderFinancialOverview = () => (
    <View style={styles.overviewContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Financial Overview
      </Text>
      
      <View style={styles.overviewGrid}>
        <View style={[styles.overviewCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>
            Total Income
          </Text>
          <Text style={[styles.overviewAmount, { color: '#00B894' }]}>
            {formatCurrency(dashboardData.totalIncome)}
          </Text>
        </View>

        <View style={[styles.overviewCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>
            Total Expenses
          </Text>
          <Text style={[styles.overviewAmount, { color: '#FF4444' }]}>
            {formatCurrency(dashboardData.totalExpenses)}
          </Text>
        </View>

        <View style={[styles.overviewCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }]}>
            Remaining Budget
          </Text>
          <Text style={[
            styles.overviewAmount, 
            { color: dashboardData.remainingBudget >= 0 ? '#00B894' : '#FF4444' }
          ]}>
            {formatCurrency(dashboardData.remainingBudget)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderBudgetBreakdown = () => (
    <View style={styles.budgetContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Budget Breakdown (50/30/20 Rule)
      </Text>

      {Object.entries(dashboardData.budgetBreakdown).map(([type, data]) => {
        const percentage = data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0;
        const color = getBudgetColor(data.spent, data.allocated);
        
        return (
          <View key={type} style={[styles.budgetCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.budgetHeader}>
              <Text style={[styles.budgetType, { color: theme.colors.text }]}>
                {type.charAt(0).toUpperCase() + type.slice(1)} 
                {type === 'needs' ? ' 💰' : type === 'wants' ? ' 🎯' : ' 🏦'}
              </Text>
              <Text style={[styles.budgetPercentage, { color }]}>
                {percentage.toFixed(1)}%
              </Text>
            </View>
            
            <View style={styles.budgetProgress}>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { backgroundColor: color, width: `${Math.min(percentage, 100)}%` }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.budgetDetails}>
              <Text style={[styles.budgetText, { color: theme.colors.textSecondary }]}>
                Spent: {formatCurrency(data.spent)} / {formatCurrency(data.allocated)}
              </Text>
              <Text style={[styles.budgetText, { color: data.remaining >= 0 ? '#00B894' : '#FF4444' }]}>
                Remaining: {formatCurrency(data.remaining)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderRecentExpenses = () => (
    <View style={styles.expensesContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Recent Expenses
      </Text>

      {dashboardData.recentExpenses.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No expenses recorded yet
          </Text>
        </View>
      ) : (
        dashboardData.recentExpenses.map((expense, index) => (
          <View key={index} style={[styles.expenseCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.expenseInfo}>
              <Text style={[styles.expenseTitle, { color: theme.colors.text }]}>
                {expense.title}
              </Text>
              <Text style={[styles.expenseCategory, { color: theme.colors.textSecondary }]}>
                {expense.category_name || 'Other'}
              </Text>
            </View>
            <Text style={[styles.expenseAmount, { color: '#FF4444' }]}>
              -{formatCurrency(expense.amount)}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  const renderTopCategories = () => (
    <View style={styles.categoriesContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Top Spending Categories
      </Text>

      {dashboardData.monthlyStats.expensesByCategory.slice(0, 5).map((item, index) => (
        <View key={index} style={[styles.categoryCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryName, { color: theme.colors.text }]}>
              {item.category}
            </Text>
            <Text style={[styles.categoryCount, { color: theme.colors.textSecondary }]}>
              {item.count} transaction{item.count !== 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={[styles.categoryAmount, { color: theme.colors.text }]}>
            {formatCurrency(item.total)}
          </Text>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading your dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderWelcomeCard()}
        {renderFinancialOverview()}
        {renderBudgetBreakdown()}
        {renderRecentExpenses()}
        {renderTopCategories()}

        {/* Development Controls */}
        <View style={styles.devControls}>
          <TouchableOpacity 
            style={[styles.devButton, { backgroundColor: theme.colors.error }]}
            onPress={handleLogout}
          >
            <Text style={styles.devButtonText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.devButton, { backgroundColor: '#FF4444' }]}
            onPress={handleResetDatabase}
          >
            <Text style={styles.devButtonText}>🗑️ Reset Database</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  welcomeCard: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  overviewContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  overviewCard: {
    width: (width - 60) / 3,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  overviewLabel: {
    fontSize: 12,
    marginBottom: 5,
    textAlign: 'center',
  },
  overviewAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  budgetContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  budgetCard: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetType: {
    fontSize: 16,
    fontWeight: '600',
  },
  budgetPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  budgetProgress: {
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetText: {
    fontSize: 12,
  },
  expensesContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  emptyCard: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  expenseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  expenseCategory: {
    fontSize: 12,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  devControls: {
    marginHorizontal: 20,
    marginTop: 10,
  },
  devButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  devButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DashboardScreen;