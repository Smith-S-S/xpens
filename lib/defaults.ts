import { Account, Category } from './types';

// ─── Default Categories ──────────────────────────────────────────────────────

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'createdAt'>[] = [
  { id: 'cat-food', name: 'Food', type: 'expense', icon: '🛒', color: '#FF7043', isDefault: true, sortOrder: 1 },
  { id: 'cat-transport', name: 'Transport', type: 'expense', icon: '🚗', color: '#42A5F5', isDefault: true, sortOrder: 2 },
  { id: 'cat-shopping', name: 'Shopping', type: 'expense', icon: '🛍️', color: '#EC407A', isDefault: true, sortOrder: 3 },
  { id: 'cat-health', name: 'Health', type: 'expense', icon: '🏥', color: '#EF5350', isDefault: true, sortOrder: 4 },
  { id: 'cat-entertainment', name: 'Entertainment', type: 'expense', icon: '🎬', color: '#AB47BC', isDefault: true, sortOrder: 5 },
  { id: 'cat-housing', name: 'Housing', type: 'expense', icon: '🏠', color: '#26A69A', isDefault: true, sortOrder: 6 },
  { id: 'cat-education', name: 'Education', type: 'expense', icon: '📚', color: '#5C6BC0', isDefault: true, sortOrder: 7 },
  { id: 'cat-travel', name: 'Travel', type: 'expense', icon: '✈️', color: '#29B6F6', isDefault: true, sortOrder: 8 },
  { id: 'cat-utilities', name: 'Utilities', type: 'expense', icon: '💡', color: '#FFCA28', isDefault: true, sortOrder: 9 },
  { id: 'cat-pets', name: 'Pets', type: 'expense', icon: '🐾', color: '#8D6E63', isDefault: true, sortOrder: 10 },
  { id: 'cat-personal', name: 'Personal Care', type: 'expense', icon: '💆', color: '#F06292', isDefault: true, sortOrder: 11 },
  { id: 'cat-gifts', name: 'Gifts', type: 'expense', icon: '🎁', color: '#FF7043', isDefault: true, sortOrder: 12 },
  { id: 'cat-money', name: 'Money', type: 'expense', icon: 'img:money', color: '#66BB6A', isDefault: true, sortOrder: 13 },
  { id: 'cat-surprise', name: 'Surprise', type: 'expense', icon: 'img:surprised', color: '#FF9800', isDefault: true, sortOrder: 14 },
  { id: 'cat-unexpected', name: 'Unexpected', type: 'expense', icon: 'img:un-expected', color: '#EF5350', isDefault: true, sortOrder: 15 },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'createdAt'>[] = [
  { id: 'cat-salary', name: 'Salary', type: 'income', icon: '💼', color: '#66BB6A', isDefault: true, sortOrder: 1 },
  { id: 'cat-business', name: 'Business', type: 'income', icon: '🏢', color: '#42A5F5', isDefault: true, sortOrder: 2 },
  { id: 'cat-investment', name: 'Investment', type: 'income', icon: '📈', color: '#26A69A', isDefault: true, sortOrder: 3 },
  { id: 'cat-freelance', name: 'Freelance', type: 'income', icon: '💻', color: '#AB47BC', isDefault: true, sortOrder: 4 },
  { id: 'cat-rental', name: 'Rental Income', type: 'income', icon: '🏘️', color: '#FF7043', isDefault: true, sortOrder: 5 },
  { id: 'cat-other-income', name: 'Other Income', type: 'income', icon: '💰', color: '#FFCA28', isDefault: true, sortOrder: 6 },
];

export const DEFAULT_CATEGORIES: Category[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
].map(cat => ({ ...cat, createdAt: new Date().toISOString() }));

// ─── Default Accounts ────────────────────────────────────────────────────────

export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc-cash',
    name: 'Cash',
    type: 'cash',
    initialBalance: 500,
    icon: '💵',
    color: '#4CAF50',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc-bank',
    name: 'Bank Account',
    type: 'bank',
    initialBalance: 2000,
    icon: '🏦',
    color: '#2196F3',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc-card',
    name: 'Credit Card',
    type: 'credit_card',
    initialBalance: 0,
    icon: '💳',
    color: '#9C27B0',
    createdAt: new Date().toISOString(),
  },
];

// ─── Icon options for picker ─────────────────────────────────────────────────

export const CATEGORY_ICONS = [
  '🛒', '🚗', '🛍️', '🏥', '🎬', '🏠', '📚', '✈️', '💡', '🐾',
  '💆', '🎁', '💼', '🏢', '📈', '💻', '🏘️', '💰', '🍕', '☕',
  '🎮', '🎵', '⚽', '🏋️', '💊', '🔧', '📱', '🚿', '🌿', '🎓',
  '🚌', '🚂', '⛽', '🅿️', '🍺', '🍷', '🎪', '🎭', '📷', '✂️',
];

export const ACCOUNT_ICONS = ['💵', '🏦', '💳', '💰', '📊', '🏧', '💎', '🪙'];

export const CATEGORY_COLORS = [
  '#FF7043', '#42A5F5', '#EC407A', '#EF5350', '#AB47BC',
  '#26A69A', '#5C6BC0', '#29B6F6', '#FFCA28', '#8D6E63',
  '#F06292', '#66BB6A', '#FF8A65', '#4DB6AC', '#7986CB',
  '#4FC3F7', '#FFD54F', '#A1887F', '#F48FB1', '#81C784',
];

export const ACCOUNT_COLORS = [
  '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#F44336',
  '#00BCD4', '#795548', '#607D8B', '#E91E63', '#3F51B5',
];
