import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  TextInput
} from 'react-native';
import { useTheme } from '../../../app/providers/ThemeProvider';
import authService from '../../../services/auth/authService';
import { databaseService } from '../../../services';

const ProfileScreen = ({ navigation }) => {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editType, setEditType] = useState(''); // 'name', 'email', 'password'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalCategories: 0,
    averageMonthlySpending: 0,
    accountAge: 0
  });

  useEffect(() => {
    loadUserData();
    loadUserStats();
  }, []);

  const loadUserData = () => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setFormData(prev => ({
        ...prev,
        name: currentUser.name || '',
        email: currentUser.email || ''
      }));
    }
  };

  const loadUserStats = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      // Load expenses
      const expenses = await databaseService.getExpensesByUser(currentUser.id);
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

      // Load categories
      const categories = await databaseService.getCategoriesByUser(currentUser.id);
      const totalCategories = categories.filter(cat => cat.is_active).length;

      // Calculate average monthly spending (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      
      const recentExpenses = expenses.filter(expense => 
        new Date(expense.created_at) >= twelveMonthsAgo
      );
      
      const monthlyExpenses = recentExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const averageMonthlySpending = monthlyExpenses / 12;

      // Calculate account age
      const createdDate = new Date(currentUser.created_at);
      const now = new Date();
      const accountAge = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24)); // days

      setStats({
        totalExpenses,
        totalCategories,
        averageMonthlySpending,
        accountAge
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const openEditModal = (type) => {
    setEditType(type);
    setModalVisible(true);
  };

  const handleSaveProfile = async () => {
    try {
      let updatedData = {};

      if (editType === 'name') {
        if (!formData.name.trim()) {
          Alert.alert('Error', 'Name cannot be empty');
          return;
        }
        updatedData.name = formData.name.trim();
      } else if (editType === 'email') {
        if (!formData.email.trim()) {
          Alert.alert('Error', 'Email cannot be empty');
          return;
        }
        if (!isValidEmail(formData.email)) {
          Alert.alert('Error', 'Please enter a valid email address');
          return;
        }
        updatedData.email = formData.email.trim();
      } else if (editType === 'password') {
        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
          Alert.alert('Error', 'All password fields are required');
          return;
        }
        if (formData.newPassword !== formData.confirmPassword) {
          Alert.alert('Error', 'New passwords do not match');
          return;
        }
        if (formData.newPassword.length < 6) {
          Alert.alert('Error', 'New password must be at least 6 characters long');
          return;
        }

        // Verify current password
        const isCurrentPasswordValid = await authService.verifyPassword(
          user.email, 
          formData.currentPassword
        );
        
        if (!isCurrentPasswordValid) {
          Alert.alert('Error', 'Current password is incorrect');
          return;
        }

        updatedData.password = formData.newPassword;
      }

      // Update user data
      const updatedUser = await authService.updateUser(user.id, updatedData);
      setUser(updatedUser);
      
      // Reset form
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      setModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            authService.logout();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const formatCurrency = (amount) => `€${amount.toFixed(2)}`;

  const renderStatsCard = () => (
    <View style={[styles.statsCard, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
        Account Statistics 📊
      </Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {formatCurrency(stats.totalExpenses)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Total Expenses
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {stats.totalCategories}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Active Categories
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {formatCurrency(stats.averageMonthlySpending)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Avg Monthly Spending
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {stats.accountAge} days
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Account Age
          </Text>
        </View>
      </View>
    </View>
  );

  const renderProfileCard = () => (
    <View style={[styles.profileCard, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
        Profile Information 👤
      </Text>
      
      <View style={styles.profileRow}>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileLabel, { color: theme.colors.textSecondary }]}>
            Name
          </Text>
          <Text style={[styles.profileValue, { color: theme.colors.text }]}>
            {user?.name || 'Not set'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => openEditModal('name')}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.profileRow}>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileLabel, { color: theme.colors.textSecondary }]}>
            Email
          </Text>
          <Text style={[styles.profileValue, { color: theme.colors.text }]}>
            {user?.email || 'Not set'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => openEditModal('email')}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.profileRow}>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileLabel, { color: theme.colors.textSecondary }]}>
            Password
          </Text>
          <Text style={[styles.profileValue, { color: theme.colors.text }]}>
            ••••••••
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => openEditModal('password')}
        >
          <Text style={styles.editButtonText}>Change</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSettingsCard = () => (
    <View style={[styles.settingsCard, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
        App Settings ⚙️
      </Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
            Dark Mode
          </Text>
          <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
            Switch between light and dark themes
          </Text>
        </View>
        <Switch
          value={theme.isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: '#767577', true: theme.colors.primary }}
          thumbColor={'#f4f3f4'}
        />
      </View>
    </View>
  );

  const renderEditModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {editType === 'name' && 'Edit Name'}
            {editType === 'email' && 'Edit Email'}
            {editType === 'password' && 'Change Password'}
          </Text>

          {editType === 'name' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.inputBackground,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }]}
                placeholder="Enter your name"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              />
            </View>
          )}

          {editType === 'email' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.inputBackground,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }]}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          )}

          {editType === 'password' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Current Password
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }]}
                  placeholder="Enter current password"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={formData.currentPassword}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, currentPassword: text }))}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  New Password
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }]}
                  placeholder="Enter new password"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={formData.newPassword}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, newPassword: text }))}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Confirm New Password
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }]}
                  placeholder="Confirm new password"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
                  secureTextEntry
                />
              </View>
            </>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSaveProfile}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading profile...
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
          Profile 👤
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          Manage your account and preferences
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStatsCard()}
        {renderProfileCard()}
        {renderSettingsCard()}

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: '#FF4444' }]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {renderEditModal()}
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
  statsCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  profileCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingsCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
  },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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

export default ProfileScreen;