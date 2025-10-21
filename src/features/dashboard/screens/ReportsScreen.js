import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { databaseService } from '../../../services';
import authService from '../../../services/auth/authService';

const { width } = Dimensions.get('window');

const ReportsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  
  // State to hold financial report data for the current month
  const [reportData, setReportData] = useState({
    categoryBreakdown: [],
    totalIncome: 0,
    totalExpenses: 0,
    savingsRate: 0,
    topCategories: [],
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load report data when component mounts
  useEffect(() => {
    loadReportData();
  }, []);

  // Fetch and calculate financial report data from database
  const loadReportData = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      // Load all financial data for current user
      const incomeData = await databaseService.getIncomeByUser(currentUser.id);
      const expenseData = await databaseService.getExpensesByUser(currentUser.id);
      const categories = await databaseService.getCategoriesByUser(currentUser.id);

      // Calculate metrics for current month
      const periodData = calculatePeriodData(incomeData, expenseData, categories);
      
      setReportData(periodData);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate financial metrics for the current month
  const calculatePeriodData = (incomeData, expenseData, categories) => {
    const now = new Date();
    // Set date range to current month (first day to last day)
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Filter income and expenses for current month only
    const periodIncome = incomeData.filter(income => {
      const incomeDate = new Date(income.created_at);
      return incomeDate >= startDate && incomeDate <= endDate;
    });

    const periodExpenses = expenseData.filter(expense => {
      const expenseDate = new Date(expense.created_at);
      return expenseDate >= startDate && expenseDate <= endDate;
    });

    // Calculate total income, expenses, and savings rate
    const totalIncome = periodIncome.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Build category breakdown with expenses grouped by category
    const categoryBreakdown = categories.map(category => {
      const categoryExpenses = periodExpenses.filter(expense => 
        expense.category_id === category.id
      );
      const total = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const percentage = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;

      return {
        id: category.id,
        name: category.name || 'Unknown',
        amount: total,
        percentage,
        color: getCategoryColor(category.id) || '#CCCCCC'
      };
    }).filter(cat => cat.amount > 0).sort((a, b) => b.amount - a.amount); // Only categories with expenses, sorted by amount

    // Extract top 5 spending categories for charts
    const topCategories = categoryBreakdown.slice(0, 5);

    return {
      totalIncome,
      totalExpenses,
      savingsRate,
      categoryBreakdown,
      topCategories,
    };
  };

  // Assign a consistent color to each category based on its ID
  const getCategoryColor = (categoryId) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
    
    // For numeric category IDs: use modulo to pick color
    if (typeof categoryId === 'number' && Number.isFinite(categoryId)) {
      return colors[categoryId % colors.length];
    }

    // For string category IDs: compute hash to pick color consistently
    // This ensures same category always gets same color across renders
    if (typeof categoryId === 'string') {
      let h = 0;
      for (let i = 0; i < categoryId.length; i++) {
        h = (h << 5) - h + categoryId.charCodeAt(i);
        h |= 0; // convert to 32bit integer
      }
      const idx = Math.abs(h) % colors.length;
      return colors[idx];
    }

    // Fallback for null/undefined IDs
    return colors[0];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => `€${amount.toFixed(2)}`;

  const renderSummaryCard = () => (
    <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
        This Month Summary 📈
      </Text>
      
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Total Income
          </Text>
          <Text style={[styles.summaryAmount, { color: '#00B894' }]}>
            {formatCurrency(reportData.totalIncome)}
          </Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
            Total Expenses
          </Text>
          <Text style={[styles.summaryAmount, { color: '#FF4444' }]}>
            {formatCurrency(reportData.totalExpenses)}
          </Text>
        </View>
      </View>
      
      <View style={styles.savingsContainer}>
        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
          Savings Rate
        </Text>
        <Text style={[
          styles.savingsRate,
          { color: reportData.savingsRate >= 0 ? '#00B894' : '#FF4444' }
        ]}>
          {reportData.savingsRate.toFixed(1)}%
        </Text>
      </View>
    </View>
  );

  // Render detailed list of top spending categories with amounts and percentages
  const renderCategoryBreakdown = () => (
    <View style={[styles.breakdownCard, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
        Top Spending Categories 🎯
      </Text>
      
      {reportData.topCategories.length === 0 ? (
        <Text style={[styles.noDataText, { color: theme.colors.textSecondary }]}>
          No expense data for this period
        </Text>
      ) : (
        reportData.topCategories.map((category, index) => (
          <View key={category.id} style={styles.categoryItem}>
            <View style={styles.categoryInfo}>
              {/* Colored dot matching bar chart color */}
              <View style={[styles.categoryDot, { backgroundColor: category.color || '#CCCCCC' }]} />
              <Text style={[styles.categoryName, { color: theme.colors.text }]}>
                {category.name}
              </Text>
            </View>
            <View style={styles.categoryAmounts}>
              {/* Total spending amount */}
              <Text style={[styles.categoryAmount, { color: theme.colors.text }]}>
                {formatCurrency(category.amount)}
              </Text>
              {/* Percentage of total expenses */}
              <Text style={[styles.categoryPercentage, { color: theme.colors.textSecondary }]}>
                {category.percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  // Render bar chart showing top 5 spending categories
  const renderBarChart = () => {
    console.log('topCategories:', reportData.topCategories);
    
    // Show empty state if no expense data available
    if (!reportData.topCategories || reportData.topCategories.length === 0) {
      return (
        <View style={[styles.chartCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Top Spending by Category 📊
          </Text>
          <Text style={[styles.noDataText, { color: theme.colors.textSecondary }]}>
            No expense data for this period
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.chartCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Top Spending by Category 📊
        </Text>
        <View style={styles.barChartContainer}>
          {reportData.topCategories.slice(0, 5).map((category, index) => {
            // Calculate bar height relative to highest spending category
            const maxAmount = reportData.topCategories[0]?.amount || 1;
            const barHeight = (category.amount / maxAmount) * 100;
            
            return (
              <View key={category.id || index} style={styles.barItem}>
                {/* Display amount above bar */}
                <Text style={[styles.barAmount, { color: theme.colors.textSecondary }]}>
                  €{category.amount.toFixed(0)}
                </Text>
                {/* Vertical bar with dynamic height */}
                <View style={styles.barWrapper}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: Math.max(barHeight, 15), // Minimum 15px for visibility
                        backgroundColor: category.color || '#4ECDC4'
                      }
                    ]} 
                  />
                </View>
                {/* Category name below bar */}
                <Text style={[styles.barLabel, { color: theme.colors.text }]} numberOfLines={1}>
                  {category.name}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };


  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading reports...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Reports 📊
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          Financial insights and analytics
        </Text>
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
        {renderSummaryCard()}
        {renderBarChart()}
        {renderCategoryBreakdown()}
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
  header: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  savingsContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  savingsRate: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  breakdownCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryAmounts: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryPercentage: {
    fontSize: 12,
  },
  trendCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 80,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: 20,
    borderRadius: 2,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  barAmount: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  monthlyCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  monthlyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 10,
  },
  monthContainer: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  monthBarWrapper: {
    height: 80,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  monthBar: {
    width: 16,
    borderRadius: 2,
    minHeight: 2,
  },
  monthLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  monthAmount: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  chartCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 160,
    marginTop: 16,
    paddingHorizontal: 10,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  barWrapper: {
    height: 100,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  bar: {
    width: 30,
    borderRadius: 4,
    minHeight: 15,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  barAmount: {
    fontSize: 10,
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default ReportsScreen;