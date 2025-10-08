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
  const [reportData, setReportData] = useState({
    monthlyExpenses: [],
    categoryBreakdown: [],
    totalIncome: 0,
    totalExpenses: 0,
    savingsRate: 0,
    topCategories: [],
    weeklyTrend: []
  });
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // month, quarter, year
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      // Load income and expenses
      const incomeData = await databaseService.getIncomeByUser(currentUser.id);
      const expenseData = await databaseService.getExpensesByUser(currentUser.id);
      const categories = await databaseService.getCategoriesByUser(currentUser.id);

      // Calculate period-specific data
      const periodData = calculatePeriodData(incomeData, expenseData, categories);
      
      setReportData(periodData);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePeriodData = (incomeData, expenseData, categories) => {
    const now = new Date();
    let startDate, endDate;

    switch (selectedPeriod) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Filter data by period
    const periodIncome = incomeData.filter(income => {
      const incomeDate = new Date(income.created_at);
      return incomeDate >= startDate && incomeDate <= endDate;
    });

    const periodExpenses = expenseData.filter(expense => {
      const expenseDate = new Date(expense.created_at);
      return expenseDate >= startDate && expenseDate <= endDate;
    });

    const totalIncome = periodIncome.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Category breakdown
    const categoryBreakdown = categories.map(category => {
      const categoryExpenses = periodExpenses.filter(expense => 
        expense.category_id === category.id
      );
      const total = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const percentage = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;

      return {
        id: category.id,
        name: category.name,
        amount: total,
        percentage,
        color: getCategoryColor(category.id)
      };
    }).filter(cat => cat.amount > 0).sort((a, b) => b.amount - a.amount);

    // Top 5 categories
    const topCategories = categoryBreakdown.slice(0, 5);

    // Weekly trend (last 4 weeks)
    const weeklyTrend = calculateWeeklyTrend(periodExpenses);

    // Monthly expenses for the year
    const monthlyExpenses = calculateMonthlyExpenses(expenseData, now.getFullYear());

    return {
      totalIncome,
      totalExpenses,
      savingsRate,
      categoryBreakdown,
      topCategories,
      weeklyTrend,
      monthlyExpenses
    };
  };

  const calculateWeeklyTrend = (expenses) => {
    const weeks = [];
    const now = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);

      const weekExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.created_at);
        return expenseDate >= weekStart && expenseDate <= weekEnd;
      });

      const total = weekExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      weeks.push({
        label: `Week ${4 - i}`,
        amount: total,
        startDate: weekStart,
        endDate: weekEnd
      });
    }

    return weeks;
  };

  const calculateMonthlyExpenses = (expenses, year) => {
    const months = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let month = 0; month < 12; month++) {
      const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.created_at);
        return expenseDate.getFullYear() === year && expenseDate.getMonth() === month;
      });

      const total = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      months.push({
        month: monthNames[month],
        amount: total
      });
    }

    return months;
  };

  const getCategoryColor = (categoryId) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
    return colors[categoryId % colors.length];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => `€${amount.toFixed(2)}`;

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      case 'year': return 'This Year';
      default: return 'This Month';
    }
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['month', 'quarter', 'year'].map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            {
              backgroundColor: selectedPeriod === period 
                ? theme.colors.primary 
                : theme.colors.card,
              borderColor: theme.colors.border
            }
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            {
              color: selectedPeriod === period 
                ? '#FFFFFF' 
                : theme.colors.text
            }
          ]}>
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSummaryCard = () => (
    <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
        {getPeriodLabel()} Summary 📈
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
              <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
              <Text style={[styles.categoryName, { color: theme.colors.text }]}>
                {category.name}
              </Text>
            </View>
            <View style={styles.categoryAmounts}>
              <Text style={[styles.categoryAmount, { color: theme.colors.text }]}>
                {formatCurrency(category.amount)}
              </Text>
              <Text style={[styles.categoryPercentage, { color: theme.colors.textSecondary }]}>
                {category.percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderWeeklyTrend = () => (
    <View style={[styles.trendCard, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
        Weekly Spending Trend 📊
      </Text>
      
      <View style={styles.chartContainer}>
        {reportData.weeklyTrend.map((week, index) => {
          const maxAmount = Math.max(...reportData.weeklyTrend.map(w => w.amount));
          const height = maxAmount > 0 ? (week.amount / maxAmount) * 100 : 0;
          
          return (
            <View key={index} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${height}%`,
                      backgroundColor: theme.colors.primary
                    }
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]}>
                {week.label}
              </Text>
              <Text style={[styles.barAmount, { color: theme.colors.text }]}>
                {formatCurrency(week.amount)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderMonthlyChart = () => {
    const maxAmount = Math.max(...reportData.monthlyExpenses.map(m => m.amount));
    
    return (
      <View style={[styles.monthlyCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Monthly Expenses (This Year) 📅
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.monthlyChart}>
            {reportData.monthlyExpenses.map((month, index) => {
              const height = maxAmount > 0 ? (month.amount / maxAmount) * 80 : 0;
              
              return (
                <View key={index} style={styles.monthContainer}>
                  <View style={styles.monthBarWrapper}>
                    <View
                      style={[
                        styles.monthBar,
                        {
                          height: height,
                          backgroundColor: theme.colors.primary
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.monthLabel, { color: theme.colors.textSecondary }]}>
                    {month.month}
                  </Text>
                  <Text style={[styles.monthAmount, { color: theme.colors.text }]}>
                    {formatCurrency(month.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
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
        {renderPeriodSelector()}
        {renderSummaryCard()}
        {renderCategoryBreakdown()}
        {renderWeeklyTrend()}
        {renderMonthlyChart()}
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
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
});

export default ReportsScreen;