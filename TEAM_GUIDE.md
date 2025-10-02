# 📱 ExpenseWise - Project Structure Guide

## 👥 Team Members
- **Kasun Chathuranga Dissanayaka**
- **Asitha Govinnage** 
- **Mujitha Manorathna**

---

## 📁 Project Folder Structure

```
expensewise-app/
├── 📁 assets/                    # App assets (icons, images, splash screens)
├── 📁 src/                       # Main source code directory
│   ├── 📁 app/
│   │   └── 📁 providers/         # App-level providers (Theme, Database context)
│   ├── 📁 components/            # Reusable UI components
│   │   ├── 📁 common/            # General reusable components (Button, Input, Card)
│   │   ├── 📁 charts/            # Chart components for data visualization
│   │   ├── 📁 forms/             # Form components (ExpenseForm, BudgetForm)
│   │   └── 📁 layout/            # Layout components (Header, TabBar, Screen)
│   ├── 📁 features/              # Feature-based modules
│   │   ├── 📁 expenses/          # Expense tracking feature
│   │   ├── 📁 budgets/           # Budget management feature
│   │   ├── 📁 categories/        # Category management feature
│   │   └── 📁 reports/           # Reports and analytics feature
│   ├── 📁 navigation/            # App navigation configuration
│   ├── 📁 services/              # Business logic and data services
│   │   ├── 📁 database/          # SQLite database operations
│   │   ├── 📁 storage/           # Local storage operations
│   │   └── 📁 api/               # API services (future backend integration)
│   ├── 📁 hooks/                 # Custom React hooks (global)
│   ├── 📁 utils/                 # Utility functions
│   ├── 📁 constants/             # App constants (categories, colors, etc.)
│   ├── 📁 config/                # App configuration files
│   ├── 📁 theme/                 # App theme and styling
│   └── 📁 data/                  # Static data and mock data
├── App.js                        # Main App component
├── index.js                      # App entry point
└── package.json                  # Dependencies and scripts
```

---

## 🎯 How Each Folder Works

### 🔧 **Core App Structure**

#### `/src/app/providers/`
- **Purpose**: App-level context providers
- **Contains**: ThemeProvider, DatabaseProvider
- **Example**: Theme management, database initialization
- **Who works here**: Anyone setting up global app state

#### `/src/config/`
- **Purpose**: App configuration and settings
- **Contains**: Database config, API config, default settings
- **Example**: Database name, API URLs, default currency
- **Who works here**: All team members (shared configurations)

#### `/src/constants/`
- **Purpose**: App-wide constants that don't change
- **Contains**: Categories, colors, currencies
- **Example**: Food, Transport, Bills categories
- **Who works here**: All team members (shared constants)

### 🎨 **UI Components**

#### `/src/components/common/`
- **Purpose**: Reusable UI components used across the app
- **Contains**: Button, Input, Card, Modal, LoadingSpinner
- **Example**: Custom styled button component
- **Who works here**: UI-focused team members

#### `/src/components/charts/`
- **Purpose**: Data visualization components
- **Contains**: ExpenseChart, BudgetChart, CategoryChart
- **Example**: Pie chart showing expense categories
- **Who works here**: Team members working on reports/analytics

#### `/src/components/forms/`
- **Purpose**: Form components for data input
- **Contains**: ExpenseForm, BudgetForm, CategoryForm
- **Example**: Form to add new expense
- **Who works here**: Team members working on data entry features

#### `/src/components/layout/`
- **Purpose**: Layout and navigation components
- **Contains**: Header, TabBar, Screen, Container
- **Example**: App header with title and navigation
- **Who works here**: Team members working on navigation/layout

### 🚀 **Features (Main App Functionality)**

#### `/src/features/expenses/`
- **Purpose**: Everything related to expense tracking
- **Structure**:
  ```
  expenses/
  ├── components/     # Expense-specific components (ExpenseCard, ExpenseList)
  ├── hooks/         # Expense-related hooks (useExpenses)
  ├── screens/       # Expense screens (ExpenseListScreen, AddExpenseScreen)
  └── services/      # Expense business logic (expenseService)
  ```
- **Who works here**: Team member focusing on expense tracking

#### `/src/features/budgets/`
- **Purpose**: Budget management functionality
- **Structure**: Same as expenses (components, hooks, screens, services)
- **Who works here**: Team member focusing on budget features

#### `/src/features/categories/`
- **Purpose**: Category management
- **Structure**: Same pattern (components, hooks, screens, services)
- **Who works here**: Team member focusing on categorization

#### `/src/features/reports/`
- **Purpose**: Reports and analytics
- **Structure**: Same pattern (components, hooks, screens, services)
- **Who works here**: Team member focusing on reports/charts

### 🔧 **Services & Logic**

#### `/src/services/database/`
- **Purpose**: SQLite database operations
- **Contains**: Database setup, CRUD operations
- **Example**: Create expense table, insert expense record
- **Who works here**: Backend-focused team member

#### `/src/services/storage/`
- **Purpose**: Local device storage operations
- **Contains**: AsyncStorage operations
- **Example**: Save user preferences, cache data
- **Who works here**: All team members (as needed)

#### `/src/hooks/`
- **Purpose**: Custom React hooks used globally
- **Contains**: useLocalStorage, useDatabase, useTheme
- **Example**: Hook to manage app theme
- **Who works here**: All team members (as needed)

#### `/src/utils/`
- **Purpose**: Helper functions used throughout the app
- **Contains**: Date formatting, currency formatting, validation
- **Example**: Format date from database to display format
- **Who works here**: All team members (as needed)

---

## 👥 Team Work Distribution

### **Option 1: Feature-Based Division**
- **Member 1**: Expenses feature (`/src/features/expenses/`)
- **Member 2**: Budgets + Categories features (`/src/features/budgets/`, `/src/features/categories/`)
- **Member 3**: Reports + Charts (`/src/features/reports/`, `/src/components/charts/`)

### **Option 2: Layer-Based Division**
- **Member 1**: UI/Components (`/src/components/`, `/src/theme/`)
- **Member 2**: Business Logic (`/src/services/`, `/src/hooks/`)
- **Member 3**: Screens/Navigation (`/src/navigation/`, feature screens)

### **Option 3: Mixed Approach (Recommended)**
- **Member 1**: Expenses + Database setup
- **Member 2**: Budgets + UI Components
- **Member 3**: Reports + Navigation

---

## 📋 Development Workflow

### **1. Before Starting Work**
```bash
# Pull latest changes
git pull origin main

# Install dependencies if needed
npm install
```

### **2. Creating New Components**
```javascript
// Example: Creating a new common component
// File: src/components/common/Button.js

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const Button = ({ title, onPress, style }) => {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

// Don't forget to export in index.js
export default Button;
```

### **3. Working with Features**
```javascript
// Example: Adding a new expense screen
// File: src/features/expenses/screens/AddExpenseScreen.js

import React from 'react';
import { View } from 'react-native';
import { ExpenseForm } from '../components';
import { useExpenses } from '../hooks';

const AddExpenseScreen = () => {
  const { addExpense } = useExpenses();
  
  return (
    <View>
      <ExpenseForm onSubmit={addExpense} />
    </View>
  );
};

export default AddExpenseScreen;
```

### **4. Import/Export Patterns**
```javascript
// ✅ Good - Clean imports using index files
import { Button, Card } from '../../components/common';
import { ExpenseCard } from '../components';
import { useExpenses } from '../hooks';

// ❌ Avoid - Direct file imports
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
```

---

## 🔄 Git Workflow

### **Branch Naming**
- `feature/expense-tracking` - For expense features
- `feature/budget-management` - For budget features
- `feature/ui-components` - For UI work
- `fix/database-bug` - For bug fixes

### **Commit Messages**
```bash
# Good commit messages
git commit -m "Add expense form component"
git commit -m "Implement budget calculation logic"
git commit -m "Fix database connection issue"

# Avoid
git commit -m "Update files"
git commit -m "Changes"
```

### **Pull Request Process**
1. Create feature branch
2. Make changes in your assigned folders
3. Test your changes
4. Create pull request
5. Get review from team members
6. Merge to main

---

## 🧪 Testing Your Changes

### **Run the App**
```bash
# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### **Check Your Changes**
1. Navigate to your feature in the app
2. Test all functionality
3. Check on both Android and iOS if possible
4. Verify no errors in console

---

## 📝 File Naming Conventions

### **Components**
- Use PascalCase: `ExpenseCard.js`, `BudgetForm.js`
- Be descriptive: `AddExpenseButton.js` not `Button.js`

### **Hooks**
- Start with 'use': `useExpenses.js`, `useBudget.js`

### **Services**
- End with 'Service': `expenseService.js`, `databaseService.js`

### **Screens**
- End with 'Screen': `ExpenseListScreen.js`, `AddExpenseScreen.js`

---

## 🚨 Important Rules

### **DO**
- ✅ Always use the index.js files for imports
- ✅ Follow the folder structure
- ✅ Test your changes before committing
- ✅ Use descriptive names for files and functions
- ✅ Comment complex logic
- ✅ Update this documentation if you add new patterns

### **DON'T**
- ❌ Create files outside the established structure
- ❌ Directly import from deep nested paths
- ❌ Commit untested code
- ❌ Use vague names for components/functions
- ❌ Work directly in main branch

---

## 🆘 Getting Help

### **Common Issues**
1. **Import errors**: Check if you're using the index.js exports
2. **Navigation errors**: Ensure screens are properly registered
3. **Database errors**: Check if database service is initialized
4. **Styling issues**: Verify theme imports

### **Team Communication**
- Use descriptive commit messages
- Comment your code
- Ask questions in team chat
- Share screenshots of UI changes
- Document any new patterns you create

---

## 📱 App Structure Overview

```
ExpenseWise App
├── 🏠 Home Tab (Dashboard)
├── 💰 Expenses Tab
│   ├── Expense List
│   ├── Add Expense
│   └── Expense Details
├── 📊 Budget Tab
│   ├── Budget Overview
│   └── Set Budget
├── 📈 Reports Tab
│   ├── Charts & Analytics
│   └── Detailed Reports
└── ⚙️ Settings Tab
    ├── Categories
    └── Preferences
```

---

**Remember**: This structure is designed to make teamwork easier. When in doubt, ask your teammates or refer back to this document! 🚀