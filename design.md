# MyMoney — Interface Design Plan

## Brand Identity

- **App Name:** MyMoney
- **Tagline:** Track every dollar, every day
- **Primary Brand Color:** Deep Teal `#00897B` (trust, money, clarity)
- **Income Color:** `#4CAF50` (green)
- **Expense Color:** `#F44336` (red)
- **Transfer Color:** `#2196F3` (blue)
- **Background:** `#FFFFFF` / `#F7F8FA` (light grey sections)
- **Surface:** `#FFFFFF` (cards)
- **Typography:** System font (SF Pro on iOS, Roboto on Android) — clean, readable

---

## Screen List

1. **Records** (Tab 1) — Monthly transaction list grouped by date
2. **Analyse** (Tab 2) — Visual analytics with donut chart and category breakdown
3. **Add/Edit Transaction** (Modal) — Bottom sheet for adding or editing transactions
4. **Accounts** (Tab 4) — Account management with balance overview
5. **Categories** (Tab 5) — Category management grid
6. **Account Detail** (Push screen) — Transactions filtered by account
7. **Add/Edit Account** (Modal) — Bottom sheet for account creation/editing
8. **Add/Edit Category** (Modal) — Bottom sheet for category creation/editing

---

## Screen Designs

### 1. Records Screen

**Layout (top → bottom):**
- Header: Month navigator `< February 2026 >` — centered, bold month label
- Summary bar: 3 columns — Income (green), Expense (red), Total (green/red)
- Transaction list: `FlatList` grouped by date headers
  - Date header: "Saturday, Feb 21" with subtle divider
  - Transaction row: icon circle + category name + sub-label (account · type) + amount
- Empty state: centered illustration + "No transactions this month. Tap + to add one."

**Color coding:**
- Expense amounts: `#F44336` with `-` prefix
- Income amounts: `#4CAF50` with `+` prefix
- Transfer amounts: `#2196F3`

---

### 2. Analyse Screen

**Layout (top → bottom):**
- Header: Month navigator (same as Records)
- Summary cards: 3 horizontal cards — Income, Expense, Balance
- Expense/Income toggle tabs
- Donut chart: centered, 240px diameter, category segments, center total label
- Category breakdown list: icon + name + amount + % + mini bar
- Daily bar chart: collapsible section at bottom

---

### 3. Add/Edit Transaction Modal (Bottom Sheet)

**Layout (top → bottom):**
- Drag handle at top
- Type selector: `[INCOME] [EXPENSE ✓] [TRANSFER]` — pill buttons, color-coded
- Amount input: large `$0.00` field, full width, prominent
- Category picker row (tappable, opens grid picker)
- Account picker row (tappable, opens list picker)
- Date picker row
- Note text input
- Cancel / Save buttons at bottom

**Edit mode additions:**
- Trash icon in top-right corner
- "UPDATE" instead of "SAVE"

---

### 4. Accounts Screen

**Layout (top → bottom):**
- Total Balance header: large centered balance display
- Account cards list: icon + name + balance, tappable
- "Add Account" button at bottom

**Account card:**
- Rounded card with left-side colored icon
- Account name (bold) + type label
- Balance right-aligned (red if negative)

---

### 5. Categories Screen

**Layout (top → bottom):**
- Expense / Income tab toggle
- 3-column grid of category tiles
- Each tile: colored icon circle + name below
- "Add Category" button at bottom

---

## Key User Flows

### Add Expense Flow
1. User taps center `+` button → Bottom sheet slides up
2. EXPENSE type pre-selected (red highlight)
3. User taps amount field → numpad appears
4. User selects category → grid picker overlay
5. User selects account → list picker
6. Date defaults to today (can change)
7. Optional note
8. Tap SAVE → sheet closes → records list refreshes

### Edit Transaction Flow
1. User taps transaction row → sheet opens pre-filled
2. User modifies fields → taps UPDATE
3. Or taps trash icon → confirm dialog → delete

### Swipe to Delete Flow
1. User swipes left on transaction row → red delete button revealed
2. Tap delete → confirmation dialog → confirm → item removed

---

## Navigation Structure

```
Bottom Tab Bar (5 tabs):
├── Tab 1: Records (list icon)
├── Tab 2: Analyse (chart icon)
├── Tab 3: + (center FAB, elevated, teal circle)
├── Tab 4: Accounts (wallet icon)
└── Tab 5: Categories (tag icon)
```

The center `+` tab is a floating action button — larger, circular, teal background, elevated shadow. It does NOT navigate to a screen; it opens the Add Transaction modal.

---

## Color Palette (Final)

| Token | Light | Usage |
|-------|-------|-------|
| `primary` | `#00897B` | Brand, FAB, active tabs |
| `income` | `#4CAF50` | Income amounts, income type |
| `expense` | `#F44336` | Expense amounts, expense type |
| `transfer` | `#2196F3` | Transfer amounts, transfer type |
| `background` | `#FFFFFF` | Screen backgrounds |
| `surface` | `#F7F8FA` | Cards, input fields |
| `foreground` | `#1A1A2E` | Primary text |
| `muted` | `#6B7280` | Secondary text, labels |
| `border` | `#E5E7EB` | Dividers, input borders |
