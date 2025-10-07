import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  Alert, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import onboardingService from '../services/onboardingService';

export default function ExpenseSetupScreen({ navigation }) {
  const [expenses, setExpenses] = useState([
    { category: 'House Rent',       amount: '', icon: '🏠', type: 'needs'   },
    { category: 'Food & Dining',    amount: '', icon: '🍽️', type: 'needs'   },
    { category: 'Transportation',   amount: '', icon: '🚗', type: 'needs'   },
    { category: 'Utilities',        amount: '', icon: '💡', type: 'needs'   },
    { category: 'Healthcare',       amount: '', icon: '🏥', type: 'needs'   },
    { category: 'Entertainment',    amount: '', icon: '🎬', type: 'wants'   },
    { category: 'Shopping',         amount: '', icon: '🛍️', type: 'wants'   },
    { category: 'Travel',           amount: '', icon: '✈️', type: 'wants'   },
    { category: 'Savings',          amount: '', icon: '💰', type: 'savings' },
    { category: 'Emergency Fund',   amount: '', icon: '🛡️', type: 'savings' },
  ]);
  const [loading, setLoading] = useState(false);

  const handleAmountChange = (index, value) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    setExpenses(prev => {
      const next = [...prev];
      next[index].amount = numericValue;
      return next;
    });
  };

  const validateExpenses = () => {
    const filled = expenses.filter(e => e.amount && parseFloat(e.amount) > 0);
    if (filled.length === 0) {
      Alert.alert('Input Required', 'Please enter at least one expense amount.');
      return false;
    }
    const bad = filled.some(e => {
      const n = parseFloat(e.amount);
      return isNaN(n) || n <= 0 || n > 999999;
    });
    if (bad) {
      Alert.alert('Invalid Amount', 'Enter valid amounts between 1 and 999,999 EUR.');
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateExpenses()) return;
    setLoading(true);
    try {
      const payload = expenses
        .filter(e => e.amount && parseFloat(e.amount) > 0)
        .map(e => ({
          category: e.category,
          amount: parseFloat(e.amount),
          type: e.type,
          icon: e.icon,
        }));

      const ok = await onboardingService.saveExpenseAmounts(payload);
      if (ok) {
        // remember we've completed this step in onboarding
        await onboardingService.saveCurrentStep(3);
        // move to next step (adjust if AllocationSetup isn't ready yet)
        navigation.navigate('AllocationSetup');
      } else {
        Alert.alert('Error', 'Failed to save expense data. Please try again.');
      }
    } catch (err) {
      console.error('Error saving expenses:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sumType = t =>
    expenses.filter(e => e.type === t && e.amount)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const total = () =>
    expenses.filter(e => e.amount)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const renderItem = (e, i) => {
    const v = parseFloat(e.amount);
    const isValid = !e.amount || (v > 0 && v <= 999999);

    return (
      <View key={i} style={styles.expenseItem}>
        <View style={styles.expenseHeader}>
          <Text style={styles.expenseIcon}>{e.icon}</Text>
          <Text style={styles.expenseCategory}>{e.category}</Text>
          <Text style={styles.expenseType}>({e.type})</Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>€</Text>
          <TextInput
            style={[
              styles.amountInput,
              { borderColor: isValid ? '#E0E0E0' : '#E53935' }
            ]}
            value={e.amount}
            onChangeText={val => handleAmountChange(i, val)}
            placeholder="0.00"
            placeholderTextColor="#666666"
            keyboardType="decimal-pad"
            maxLength={8}
          />
        </View>

        {!isValid && (
          <Text style={styles.errorText}>Enter amount between 1–999,999 EUR</Text>
        )}
      </View>
    );
  };

  const needs = sumType('needs');
  const wants = sumType('wants');
  const savings = sumType('savings');
  const grand = total();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Monthly Expenses 💰</Text>
            <Text style={styles.subtitle}>Enter your typical monthly expenses in Euro (€)</Text>
          </View>

          <View style={{ marginTop: 20 }}>
            {expenses.map(renderItem)}
          </View>

          {grand > 0 && (
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Monthly Expense Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>💰 Needs (Essential):</Text>
                <Text style={styles.summaryAmount}>€{needs.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>🎯 Wants (Lifestyle):</Text>
                <Text style={styles.summaryAmount}>€{wants.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>🏦 Savings & Emergency:</Text>
                <Text style={styles.summaryAmount}>€{savings.toFixed(2)}</Text>
              </View>

              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>Total Monthly Expenses:</Text>
                <Text style={[styles.summaryTotal, { color: '#1976D2' }]}>€{grand.toFixed(2)}</Text>
              </View>
            </View>
          )}

          <View style={styles.tip}>
            <Text style={styles.tipText}>
              💡 Tip: Enter your average monthly amounts. You can adjust later.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.nextBtn,
            { backgroundColor: grand > 0 ? '#1976D2' : '#E0E0E0', opacity: loading ? 0.7 : 1 }
          ]}
          onPress={handleNext}
          disabled={loading || grand === 0}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.nextText}>Next ({grand > 0 ? `€${grand.toFixed(0)}` : 'Enter expenses'})</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF' 
},
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100 },

  header: {
    alignItems: 'center',
    marginVertical: 20 },
  title: {
    color: '#222222',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8 },
  subtitle: {
    color: '#666666',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24 },

  expenseItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF'
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12 },
  expenseIcon: {
    fontSize: 20,
    marginRight: 12 },
  expenseCategory: {
    color: '#222222',
    fontSize: 16,
    fontWeight: '600',
    flex: 1 },
  expenseType: {
    color: '#666666',
    fontSize: 12,
    fontStyle: 'italic' },

  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center' },
  currencySymbol: {
    color: '#222222',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8 },
  amountInput: {
    flex: 1,
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'right',
    backgroundColor: '#F5F7FA',
    color: '#222222'
  },
  errorText: {
    color: '#E53935',
    fontSize: 12,
    marginTop: 4 },

  summary: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF' },
  summaryTitle: {
    color: '#222222',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8 },
  summaryLabel: {
    color: '#666666',
    fontSize: 14,
    flex: 1 },
  summaryAmount: {
    color: '#222222',
    fontSize: 14,
    fontWeight: '600' },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8 },
  summaryTotal: { 
    color: '#222222',
    fontSize: 16,
    fontWeight: 'bold' },

  tip: { marginTop: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F7FAFF' },
  tipText: { color: '#666666',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20 },

  navRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#FFFFFF'
  },
  backBtn: { flex: 1,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center' },
  backText: { color: '#222222',
    fontSize: 16,
    fontWeight: '600' },
  nextBtn: {
     flex: 2,
     padding: 16,
     borderRadius: 10,
     alignItems: 'center',
     justifyContent: 'center' },
  nextText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold' },
});
