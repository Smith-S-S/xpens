# MyMoney TODO

## Setup & Infrastructure
- [x] Configure theme colors (teal primary, income/expense/transfer colors)
- [x] Set up 5-tab navigation with center FAB
- [x] Create data models (Transaction, Account, Category)
- [x] Implement AsyncStorage persistence layer
- [x] Seed default categories (12 expense + 6 income)
- [x] Seed default accounts (Cash, Bank, Credit Card)
- [x] Generate and set app logo/icon

## Records Tab
- [x] Month navigator (< Month Year >)
- [x] Summary bar (Income / Expense / Total)
- [x] Transaction list grouped by date (FlatList)
- [x] Transaction row with icon, name, account, amount
- [x] Tap transaction → open edit modal
- [x] Swipe left to delete with confirmation
- [x] Empty state message
- [x] Pull to refresh

## Add/Edit Transaction Modal
- [x] Bottom sheet modal
- [x] Transaction type selector (Income / Expense / Transfer)
- [x] Amount input with large display
- [x] Category picker (filtered by type)
- [x] Account picker (with balance)
- [x] Transfer: two account fields (From / To)
- [x] Date picker (default today)
- [x] Note text input
- [x] Save / Cancel buttons with validation
- [x] Edit mode: pre-fill fields, UPDATE button, delete icon
- [x] Form validation with inline errors

## Analyse Tab
- [x] Month navigator
- [x] Summary cards (Income / Expense / Balance)
- [x] Expense / Income tab toggle
- [x] Donut chart with category segments
- [x] Category breakdown list (ranked by amount)
- [x] Daily bar chart section

## Accounts Tab
- [x] Total balance header
- [x] Account cards list
- [x] Tap account → add transaction for that account
- [x] Add account button / modal
- [x] Edit account (long press)
- [x] Delete account with warning dialog

## Categories Tab
- [x] Expense / Income tab toggle
- [x] 3-column category grid
- [x] Tap to edit category
- [x] Add category button / modal
- [x] Delete category (long press)

## Global
- [x] Center FAB always visible across all tabs
- [x] Delete confirmation dialogs
- [x] Consistent color coding (income=green, expense=red, transfer=blue)
- [x] Currency formatting ($0.00)
- [x] Date formatting (localized)
- [x] Unit tests for core logic (20 tests passing)
- [x] Fix formatCurrency negative number bug
- [x] Fix formatMonthYear off-by-one bug
