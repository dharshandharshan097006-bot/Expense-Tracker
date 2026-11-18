/**
 * Expense Tracker System - Data Model & Storage Management
 */

// Available Currencies
const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar (AU$)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc (CHF)' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan (¥)' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real (R$)' }
];

// Available Payment Methods
const PAYMENT_METHODS = [
  'Credit Card',
  'Debit Card',
  'Cash',
  'Bank Transfer',
  'UPI / Mobile Pay',
  'Other'
];

// Curated Icon Selection for Categories
const CATEGORY_ICONS = [
  'home', 'shopping-cart', 'utensils', 'car', 'zap', 'film', 
  'heart-pulse', 'shopping-bag', 'book-open', 'smile', 'plane', 
  'refresh-cw', 'coffee', 'smartphone', 'gift', 'tag', 'briefcase', 
  'laptop', 'trending-up', 'building', 'key', 'dollar-sign', 'award', 'shield'
];

// Default Category Definitions
const DEFAULT_CATEGORIES = [
  // Expenses
  { id: 'cat_housing', name: 'Housing & Rent', type: 'expense', icon: 'home', color: '#3b82f6', isDefault: true },
  { id: 'cat_groceries', name: 'Groceries', type: 'expense', icon: 'shopping-cart', color: '#10b981', isDefault: true },
  { id: 'cat_dining', name: 'Dining & Cafes', type: 'expense', icon: 'utensils', color: '#f59e0b', isDefault: true },
  { id: 'cat_transport', name: 'Transportation', type: 'expense', icon: 'car', color: '#8b5cf6', isDefault: true },
  { id: 'cat_utilities', name: 'Utilities & Bills', type: 'expense', icon: 'zap', color: '#06b6d4', isDefault: true },
  { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', icon: 'film', color: '#ec4899', isDefault: true },
  { id: 'cat_health', name: 'Healthcare & Fitness', type: 'expense', icon: 'heart-pulse', color: '#ef4444', isDefault: true },
  { id: 'cat_shopping', name: 'Shopping & Gear', type: 'expense', icon: 'shopping-bag', color: '#6366f1', isDefault: true },
  { id: 'cat_travel', name: 'Travel & Vacation', type: 'expense', icon: 'plane', color: '#14b8a6', isDefault: true },
  { id: 'cat_subscriptions', name: 'Subscriptions', type: 'expense', icon: 'refresh-cw', color: '#a855f7', isDefault: true },
  { id: 'cat_other_exp', name: 'Other Expenses', type: 'expense', icon: 'tag', color: '#64748b', isDefault: true },
  
  // Income
  { id: 'cat_salary', name: 'Primary Salary', type: 'income', icon: 'briefcase', color: '#10b981', isDefault: true },
  { id: 'cat_freelance', name: 'Freelance & Side Gig', type: 'income', icon: 'laptop', color: '#3b82f6', isDefault: true },
  { id: 'cat_investments', name: 'Investments & Dividends', type: 'income', icon: 'trending-up', color: '#8b5cf6', isDefault: true },
  { id: 'cat_rental', name: 'Rental Income', type: 'income', icon: 'building', color: '#f59e0b', isDefault: true },
  { id: 'cat_gifts', name: 'Gifts & Bonuses', type: 'income', icon: 'gift', color: '#ec4899', isDefault: true },
  { id: 'cat_other_inc', name: 'Other Income', type: 'income', icon: 'dollar-sign', color: '#64748b', isDefault: true }
];

// Helper to generate UUID
function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Storage Manager Class
class StorageManager {
  static KEYS = {
    TRANSACTIONS: 'expensio_transactions',
    CATEGORIES: 'expensio_categories',
    BUDGETS: 'expensio_budgets',
    SETTINGS: 'expensio_settings',
    INITIALIZED: 'expensio_initialized_v2'
  };

  /**
   * Initialize storage with defaults or demo data if first run
   */
  static init() {
    const isInit = localStorage.getItem(this.KEYS.INITIALIZED);
    if (!isInit) {
      this.resetToDemoData();
      localStorage.setItem(this.KEYS.INITIALIZED, 'true');
    }
  }

  // --- SETTINGS ---
  static getSettings() {
    try {
      const data = localStorage.getItem(this.KEYS.SETTINGS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading settings:', e);
    }
    return {
      currency: 'USD',
      currencySymbol: '$',
      theme: 'light',
      monthlyBudget: 3500
    };
  }

  static saveSettings(settings) {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  }

  // --- CATEGORIES ---
  static getCategories() {
    try {
      const data = localStorage.getItem(this.KEYS.CATEGORIES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading categories:', e);
    }
    return [...DEFAULT_CATEGORIES];
  }

  static saveCategories(categories) {
    localStorage.setItem(this.KEYS.CATEGORIES, JSON.stringify(categories));
  }

  static addCategory(category) {
    const categories = this.getCategories();
    const newCat = {
      id: generateId('cat'),
      isDefault: false,
      ...category
    };
    categories.push(newCat);
    this.saveCategories(categories);
    return newCat;
  }

  static updateCategory(id, updatedFields) {
    const categories = this.getCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...updatedFields };
      this.saveCategories(categories);
      return categories[index];
    }
    return null;
  }

  static deleteCategory(id) {
    let categories = this.getCategories();
    categories = categories.filter(c => c.id !== id);
    this.saveCategories(categories);
  }

  static getCategoryById(id) {
    const categories = this.getCategories();
    return categories.find(c => c.id === id) || {
      id: 'cat_unknown',
      name: 'Uncategorized',
      type: 'expense',
      icon: 'tag',
      color: '#94a3b8'
    };
  }

  // --- TRANSACTIONS ---
  static getTransactions() {
    try {
      const data = localStorage.getItem(this.KEYS.TRANSACTIONS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading transactions:', e);
    }
    return [];
  }

  static saveTransactions(transactions) {
    localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  static addTransaction(transaction) {
    const transactions = this.getTransactions();
    const newTx = {
      id: generateId('tx'),
      createdAt: new Date().toISOString(),
      ...transaction,
      amount: parseFloat(transaction.amount) || 0
    };
    transactions.unshift(newTx);
    this.saveTransactions(transactions);
    return newTx;
  }

  static updateTransaction(id, updatedFields) {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      if (updatedFields.amount !== undefined) {
        updatedFields.amount = parseFloat(updatedFields.amount) || 0;
      }
      transactions[index] = { ...transactions[index], ...updatedFields };
      this.saveTransactions(transactions);
      return transactions[index];
    }
    return null;
  }

  static deleteTransaction(id) {
    let transactions = this.getTransactions();
    transactions = transactions.filter(t => t.id !== id);
    this.saveTransactions(transactions);
  }

  static deleteMultipleTransactions(ids) {
    const idSet = new Set(ids);
    let transactions = this.getTransactions();
    transactions = transactions.filter(t => !idSet.has(t.id));
    this.saveTransactions(transactions);
  }

  // --- BUDGETS ---
  // Budgets are stored per category and per month ('YYYY-MM')
  static getBudgets() {
    try {
      const data = localStorage.getItem(this.KEYS.BUDGETS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading budgets:', e);
    }
    return [];
  }

  static saveBudgets(budgets) {
    localStorage.setItem(this.KEYS.BUDGETS, JSON.stringify(budgets));
  }

  static setBudget(month, categoryId, limit) {
    const budgets = this.getBudgets();
    const existingIndex = budgets.findIndex(b => b.month === month && b.categoryId === categoryId);
    const numLimit = parseFloat(limit) || 0;

    if (existingIndex !== -1) {
      budgets[existingIndex].limit = numLimit;
    } else {
      budgets.push({
        id: generateId('bgt'),
        month,
        categoryId,
        limit: numLimit
      });
    }
    this.saveBudgets(budgets);
  }

  static deleteBudget(id) {
    let budgets = this.getBudgets();
    budgets = budgets.filter(b => b.id !== id);
    this.saveBudgets(budgets);
  }

  static getBudgetsForMonth(month) {
    const budgets = this.getBudgets();
    return budgets.filter(b => b.month === month);
  }

  // --- RESET & DEMO SEED ---
  static resetToDemoData() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth(); // 0-11
    
    // Helper to format date string YYYY-MM-DD
    const makeDate = (year, monthIndex, day) => {
      const m = String(monthIndex + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      return `${year}-${m}-${d}`;
    };

    const currentMonthStr = `${currentYear}-${String(currentMonthNum + 1).padStart(2, '0')}`;
    
    // Calculate last month string
    const lastMonthDate = new Date(currentYear, currentMonthNum - 1, 1);
    const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Sample Transactions
    const sampleTransactions = [
      // Current Month Income
      {
        id: generateId('tx'),
        type: 'income',
        title: 'Monthly Tech Salary',
        amount: 4850.00,
        categoryId: 'cat_salary',
        date: makeDate(currentYear, currentMonthNum, 1),
        paymentMethod: 'Bank Transfer',
        notes: 'Direct deposit from employer',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'income',
        title: 'Freelance UI/UX Web Project',
        amount: 850.00,
        categoryId: 'cat_freelance',
        date: makeDate(currentYear, currentMonthNum, 8),
        paymentMethod: 'Bank Transfer',
        notes: 'Landing page design milestone completed',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'income',
        title: 'Stock Dividend Payout',
        amount: 145.50,
        categoryId: 'cat_investments',
        date: makeDate(currentYear, currentMonthNum, 12),
        paymentMethod: 'Bank Transfer',
        notes: 'Index fund quarterly dividend',
        createdAt: new Date().toISOString()
      },

      // Current Month Expenses
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Apartment Monthly Rent',
        amount: 1350.00,
        categoryId: 'cat_housing',
        date: makeDate(currentYear, currentMonthNum, 2),
        paymentMethod: 'Bank Transfer',
        notes: 'Rent for downtown 1-bed apartment',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Whole Foods Market Groceries',
        amount: 142.80,
        categoryId: 'cat_groceries',
        date: makeDate(currentYear, currentMonthNum, 4),
        paymentMethod: 'Credit Card',
        notes: 'Fresh vegetables, fruits, eggs, salmon',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Electric & Gas Utility Bill',
        amount: 98.40,
        categoryId: 'cat_utilities',
        date: makeDate(currentYear, currentMonthNum, 5),
        paymentMethod: 'Debit Card',
        notes: 'Monthly power and heating',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Dinner at Italian Trattoria',
        amount: 68.50,
        categoryId: 'cat_dining',
        date: makeDate(currentYear, currentMonthNum, 7),
        paymentMethod: 'Credit Card',
        notes: 'Pasta and wine with friends',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Car Fuel / Petrol refill',
        amount: 54.00,
        categoryId: 'cat_transport',
        date: makeDate(currentYear, currentMonthNum, 9),
        paymentMethod: 'Credit Card',
        notes: 'Full tank unleaded',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Trader Joe\'s Grocery Haul',
        amount: 88.25,
        categoryId: 'cat_groceries',
        date: makeDate(currentYear, currentMonthNum, 11),
        paymentMethod: 'Credit Card',
        notes: 'Weekly staples and snacks',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Netflix & Spotify Subscriptions',
        amount: 27.98,
        categoryId: 'cat_subscriptions',
        date: makeDate(currentYear, currentMonthNum, 12),
        paymentMethod: 'Credit Card',
        notes: 'Standard UHD plan & Spotify Premium',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Cinema & IMAX Movie Tickets',
        amount: 36.00,
        categoryId: 'cat_entertainment',
        date: makeDate(currentYear, currentMonthNum, 13),
        paymentMethod: 'Debit Card',
        notes: 'Sci-fi movie night with popcorn',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'High-speed Fiber Internet',
        amount: 65.00,
        categoryId: 'cat_utilities',
        date: makeDate(currentYear, currentMonthNum, 14),
        paymentMethod: 'Bank Transfer',
        notes: '1 Gbps symmetrical connection',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Monthly Gym & Fitness Club',
        amount: 60.00,
        categoryId: 'cat_health',
        date: makeDate(currentYear, currentMonthNum, 15),
        paymentMethod: 'Credit Card',
        notes: 'Fitness center membership fee',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Casual Cafe Breakfast & Matcha',
        amount: 24.50,
        categoryId: 'cat_dining',
        date: makeDate(currentYear, currentMonthNum, 16),
        paymentMethod: 'UPI / Mobile Pay',
        notes: 'Croissants and iced drinks',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'New Running Shoes & Activewear',
        amount: 119.00,
        categoryId: 'cat_shopping',
        date: makeDate(currentYear, currentMonthNum, 17),
        paymentMethod: 'Credit Card',
        notes: 'Spring marathon training gear',
        createdAt: new Date().toISOString()
      },

      // Previous Month Sample Data for Trends and Comparison
      {
        id: generateId('tx'),
        type: 'income',
        title: 'Monthly Tech Salary',
        amount: 4850.00,
        categoryId: 'cat_salary',
        date: makeDate(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1),
        paymentMethod: 'Bank Transfer',
        notes: 'Previous month salary',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'income',
        title: 'Design Consultation Side Gig',
        amount: 650.00,
        categoryId: 'cat_freelance',
        date: makeDate(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 15),
        paymentMethod: 'Bank Transfer',
        notes: 'Brand audit project',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Apartment Monthly Rent',
        amount: 1350.00,
        categoryId: 'cat_housing',
        date: makeDate(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 2),
        paymentMethod: 'Bank Transfer',
        notes: 'Previous month rent',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Monthly Supermarket Haul',
        amount: 410.00,
        categoryId: 'cat_groceries',
        date: makeDate(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 10),
        paymentMethod: 'Credit Card',
        notes: 'Monthly staples & groceries',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Dining Out & Takeaway',
        amount: 215.00,
        categoryId: 'cat_dining',
        date: makeDate(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 18),
        paymentMethod: 'Credit Card',
        notes: 'Restaurants and social dining',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Utility Bills (Power + Water)',
        amount: 160.00,
        categoryId: 'cat_utilities',
        date: makeDate(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 5),
        paymentMethod: 'Debit Card',
        notes: 'Winter utilities',
        createdAt: new Date().toISOString()
      },
      {
        id: generateId('tx'),
        type: 'expense',
        title: 'Transportation & Metro Pass',
        amount: 125.00,
        categoryId: 'cat_transport',
        date: makeDate(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 7),
        paymentMethod: 'Credit Card',
        notes: 'Transit card reload & rides',
        createdAt: new Date().toISOString()
      }
    ];

    // Seed Sample Budgets for Current Month
    const sampleBudgets = [
      { id: generateId('bgt'), month: currentMonthStr, categoryId: 'cat_housing', limit: 1400 },
      { id: generateId('bgt'), month: currentMonthStr, categoryId: 'cat_groceries', limit: 450 },
      { id: generateId('bgt'), month: currentMonthStr, categoryId: 'cat_dining', limit: 250 },
      { id: generateId('bgt'), month: currentMonthStr, categoryId: 'cat_utilities', limit: 200 },
      { id: generateId('bgt'), month: currentMonthStr, categoryId: 'cat_transport', limit: 180 },
      { id: generateId('bgt'), month: currentMonthStr, categoryId: 'cat_entertainment', limit: 150 },
      { id: generateId('bgt'), month: currentMonthStr, categoryId: 'cat_health', limit: 100 },
      { id: generateId('bgt'), month: currentMonthStr, categoryId: 'cat_shopping', limit: 250 },
      { id: generateId('bgt'), month: currentMonthStr, categoryId: 'cat_subscriptions', limit: 40 }
    ];

    // Seed Categories
    this.saveCategories(DEFAULT_CATEGORIES);
    this.saveTransactions(sampleTransactions);
    this.saveBudgets(sampleBudgets);
    this.saveSettings({
      currency: 'USD',
      currencySymbol: '$',
      theme: 'light',
      monthlyBudget: 3200
    });
  }

  static clearAllData() {
    this.saveTransactions([]);
    this.saveBudgets([]);
    this.saveCategories(DEFAULT_CATEGORIES);
  }

  static exportDataPackage() {
    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      categories: this.getCategories(),
      budgets: this.getBudgets(),
      transactions: this.getTransactions()
    };
  }

  static importDataPackage(imported) {
    if (!imported || typeof imported !== 'object') {
      throw new Error('Invalid JSON data format');
    }
    if (Array.isArray(imported.categories)) {
      this.saveCategories(imported.categories);
    }
    if (Array.isArray(imported.transactions)) {
      this.saveTransactions(imported.transactions);
    }
    if (Array.isArray(imported.budgets)) {
      this.saveBudgets(imported.budgets);
    }
    if (imported.settings && typeof imported.settings === 'object') {
      this.saveSettings(imported.settings);
    }
  }
}

// Auto-run init
StorageManager.init();
