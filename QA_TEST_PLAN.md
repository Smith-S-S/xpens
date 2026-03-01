# Xpens — Android QA Test Plan

> **Platform**: Android only
> **App**: React Native / Expo SDK 54 (`newArchEnabled: true`)
> **Tabs**: Records · Analyse · Add (FAB) · Accounts · Categories
> **Last updated**: 2026-02-28

---

## Device Matrix

| Priority | Device | Android | Screen |
|----------|--------|---------|--------|
| P0 | Google Pixel 8 | 14 (API 34) | 6.2" FHD+ |
| P0 | Samsung Galaxy A54 | 13 (API 33) | 6.4" FHD+ |
| P1 | Samsung Galaxy S24 Ultra | 14 (API 34) | 6.8" QHD+ |
| P1 | OnePlus 12 | 14 (API 34) | 6.82" LTPO |
| P1 | Samsung Galaxy Z Fold 5 | 13 (API 33) | 7.6" foldable |
| P2 | Xiaomi Redmi Note 12 | 13 (API 33) | 6.67" FHD+ |
| P2 | Google Pixel 6a | 14 (API 34) | 6.1" OLED |
| P2 | Samsung Galaxy Tab S9 | 13 (API 33) | 11" tablet |

---

## Tooling

| Tool | Purpose |
|------|---------|
| **Detox** | E2E automation (RN-native, gesture support, preferred over Appium) |
| **Android Studio AVD** | Emulator testing across API levels |
| **Android Studio Layout Inspector** | Visual alignment / padding inspection |
| **Android Profiler** | CPU / Memory / GPU frame rate |
| **Perfetto** | System-level trace for jank analysis |
| **Accessibility Scanner** (Google Play) | Contrast + touch target audit |
| **TalkBack** (built-in) | Screen reader testing |
| **Scrcpy / adb screenrecord** | Screen capture for bug reports |
| **Charles Proxy / AVD Network** | Network throttling + offline simulation |
| **adb logcat** | Crash logs and JS errors |

---

## Priority Legend

| Label | Meaning |
|-------|---------|
| **P0** | Must pass before any release — blockers |
| **P1** | Should pass — UX quality and compatibility |
| **P2** | Nice to have — polish, tablets, edge scenarios |

---

## High-Risk Areas (Test First)

1. **Flower chart SVG glow** — SVG shadow on Android is buggy; petal highlight glow may render as solid rectangle
2. **Credit card `onLayout` scale calculation** — dynamic text positions can misalign on non-standard densities
3. **`newArchEnabled: true`** — New Architecture + Android 13 is a known crash point (JSI/TurboModule)
4. **Sidebar swipe vs Android 14 predictive back** — left-edge spring animation conflicts with system back gesture
5. **QuickEditModal reason selector** — complex 3-button required state easy to break in edge cases

---

## 1. Visual Layout & Alignment

### 1.1 Tab Bar

| # | Test Case | Priority |
|---|-----------|----------|
| 1.1.1 | Tab bar renders at correct height (60px + inset, max 68px) on notched / punch-hole screens | P0 |
| 1.1.2 | Active tab icon shows orange `#FF6803` tint; inactive shows muted — no color bleed between tabs | P0 |
| 1.1.3 | FAB (center `+` button, 56×56px) renders as a perfect circle, not oval, on all screen densities | P0 |
| 1.1.4 | Tab bar does not overlap content on devices with gesture nav bar (Android 10+) | P1 |
| 1.1.5 | Orange glow/shadow on tab bar top border renders correctly — no solid rectangle artifact | P1 |
| 1.1.6 | FAB press-scale animation (→ 0.93) is smooth and fully reverts on release | P1 |
| 1.1.7 | Tab labels are not clipped on narrow screens (≤ 5.5") | P2 |
| 1.1.8 | Tab bar remains visible in landscape mode without being cut off | P2 |

### 1.2 Records Screen

| # | Test Case | Priority |
|---|-----------|----------|
| 1.2.1 | `BalanceSummaryChart` (SVG) renders without blank white/black box — fills container | P0 |
| 1.2.2 | Transaction cards: category icon, name, and amount are horizontally aligned with no text overflow | P0 |
| 1.2.3 | Income = mint green `#30FFAC`, expense = red `#EF5350`, transfer = blue — verified on every row | P0 |
| 1.2.4 | Date section headers are uppercase, readable, and not clipped | P1 |
| 1.2.5 | Chart tooltip (date + amount) stays within screen bounds when touching first/last data points | P1 |
| 1.2.6 | Month/year label in header stays on one line at all system font scale levels | P1 |
| 1.2.7 | Empty-state image (`no-transactions.png`) is centered and not cropped on small screens | P2 |
| 1.2.8 | Pull-to-refresh spinner shows primary orange color and doesn't flash on completion | P2 |

### 1.3 Analyse Screen

| # | Test Case | Priority |
|---|-----------|----------|
| 1.3.1 | Flower chart petals render with correct proportional sizes — no overlap or truncation | P0 |
| 1.3.2 | Stat cards (Income / Expense) show full gradient backgrounds with no clipped borders | P0 |
| 1.3.3 | Category breakdown progress bars fill 0–100% correctly; percentage labels are right-aligned | P0 |
| 1.3.4 | "Daily Spending" bar chart is horizontally scrollable; bars don't bleed outside container | P1 |
| 1.3.5 | Active petal glow renders without a solid rectangle artifact (react-native-svg Android) | P1 |
| 1.3.6 | Expense/Income type toggle buttons have equal widths and centered labels | P1 |
| 1.3.7 | Category names on petals truncate at 8 chars without overflowing petal boundary | P2 |
| 1.3.8 | Total balance value doesn't overflow its container with large amounts (e.g., ₹99,99,99,999) | P2 |

### 1.4 Accounts Screen

| # | Test Case | Priority |
|---|-----------|----------|
| 1.4.1 | Credit card overlay: name, balance, date, and initials all stay within card image bounds on all screen sizes | P0 |
| 1.4.2 | Account list rows: icon, name, type, balance, pencil icon align in one row without wrapping | P0 |
| 1.4.3 | `QuickEditModal` diff indicator (+/- amount in green/red) renders correctly next to balance input | P1 |
| 1.4.4 | `AccountFormModal` icon and color picker circles are evenly spaced with ≥ 44×44dp touch targets | P1 |
| 1.4.5 | "Add Account" dashed-border button spans full row width correctly | P2 |

### 1.5 Categories Screen

| # | Test Case | Priority |
|---|-----------|----------|
| 1.5.1 | 3-column grid: all cards equal size, icons centered, no clipping on any column | P0 |
| 1.5.2 | PNG icons (`img:money`, `img:surprised`, `img:un-expected`) render at `size × 1.6` without pixelation | P0 |
| 1.5.3 | "default" badge on system categories doesn't overlap the category name | P1 |
| 1.5.4 | `CategoryFormModal` icon picker shows PNG and emoji icons in the same row without size mismatch | P1 |
| 1.5.5 | Color picker white checkmark is visible on dark-colored circles | P2 |

---

## 2. Android-Specific Navigation

### 2.1 Hardware / Gesture Back

| # | Test Case | Priority |
|---|-----------|----------|
| 2.1.1 | Hardware back on Records tab: app does NOT exit (no-op or exit confirmation) | P0 |
| 2.1.2 | Hardware back dismisses `AddTransactionModal` — no blank screen afterward | P0 |
| 2.1.3 | Hardware back closes Sidebar — backdrop disappears, sidebar slides out | P0 |
| 2.1.4 | Left-edge back gesture on Accounts tab dismisses any open modal correctly | P0 |
| 2.1.5 | Back press with unsaved form data in `AddTransactionModal` — data is warned about or preserved | P1 |
| 2.1.6 | Back button in OAuth callback screen returns to sign-in screen (no broken route) | P1 |
| 2.1.7 | Double-tapping back on root tab does not silently exit the app | P1 |
| 2.1.8 | Android 14 predictive back gesture does not conflict with Sidebar spring animation | P2 |

### 2.2 Navigation Flows

| # | Test Case | Priority |
|---|-----------|----------|
| 2.2.1 | Google OAuth sign-in → redirects to main tabs on Android (deep link / intent handling) | P0 |
| 2.2.2 | "Skip" on sign-in → loads main tabs as guest without crash | P0 |
| 2.2.3 | Rapid tab-switching (5 taps < 1 second) causes no blank screens or state corruption | P0 |
| 2.2.4 | Sidebar opens via hamburger icon AND closes via backdrop tap — both reliable | P1 |
| 2.2.5 | Tapping account row opens `AddTransactionModal` pre-filled with that account | P1 |
| 2.2.6 | OAuth callback deep link resolves correctly on Android (intent filter configured) | P1 |
| 2.2.7 | Tab state (e.g., selected month) is preserved when switching between tabs | P2 |

### 2.3 Keyboard Behaviour

| # | Test Case | Priority |
|---|-----------|----------|
| 2.3.1 | Numeric keyboard appears for amount and balance fields; alphanumeric for name / note | P0 |
| 2.3.2 | Date field shows numbers-and-punctuation keyboard (not full QWERTY) | P0 |
| 2.3.3 | Keyboard does not obscure the Save button in any modal | P0 |
| 2.3.4 | IME "Done" / "Next" action on form fields moves focus forward correctly | P1 |
| 2.3.5 | Tapping outside an input in any modal dismisses the keyboard | P2 |

---

## 3. Touch & Input Handling

### 3.1 AddTransactionModal (Primary Form)

| # | Test Case | Priority |
|---|-----------|----------|
| 3.1.1 | Amount field: accepts digits + decimal point, rejects letters, validates > 0 on save | P0 |
| 3.1.2 | Saving with empty amount shows an error — no crash or silent failure | P0 |
| 3.1.3 | Saving with no category selected shows a validation error | P0 |
| 3.1.4 | Saving with no account selected shows a validation error | P0 |
| 3.1.5 | Transfer type: "To Account" picker appears; saving with same from/to account shows error | P0 |
| 3.1.6 | Manual date entry with invalid value (e.g., `2024-13-45`) shows validation error | P1 |
| 3.1.7 | Quick date buttons (Today, Yesterday) set date correctly and display the right label | P1 |
| 3.1.8 | Type toggle (Expense/Income/Transfer) updates gradient color AND filters category list | P1 |
| 3.1.9 | Note field accepts special characters and emoji without crash | P2 |
| 3.1.10 | Edit mode pre-fills all fields correctly: type, amount, category, account, date, note | P2 |

### 3.2 Account & Category Forms

| # | Test Case | Priority |
|---|-----------|----------|
| 3.2.1 | `AccountFormModal`: saving with empty name shows an error | P0 |
| 3.2.2 | `QuickEditModal`: changing balance without selecting a reason blocks the Save button | P0 |
| 3.2.3 | `CategoryFormModal`: saving with empty name shows an error | P0 |
| 3.2.4 | `AccountFormModal` type selector: selecting each of the 6 types auto-changes the icon | P1 |
| 3.2.5 | Custom emoji input: pasting a multi-char emoji (e.g., 👨‍👩‍👧) is handled gracefully (≤ 8 chars) | P1 |
| 3.2.6 | Color picker: selecting a new color updates the preview icon border in real-time | P1 |
| 3.2.7 | Icon picker horizontal scroll in `AccountFormModal` is smooth; icons at extremes are selectable | P2 |

### 3.3 Gestures

| # | Test Case | Priority |
|---|-----------|----------|
| 3.3.1 | Swipe right on transaction card: Delete button appears and triggers confirmation alert | P0 |
| 3.3.2 | Long-press (500ms) on account card: Alert menu with Edit / Delete appears | P0 |
| 3.3.3 | Long-press (500ms) on category card: Alert appears; Delete is blocked for default categories | P0 |
| 3.3.4 | Tap on `BalanceSummaryChart`: tooltip shows correct date and amount for tapped data point | P1 |
| 3.3.5 | Pan across `BalanceSummaryChart`: tooltip tracks finger across all data points smoothly | P1 |
| 3.3.6 | Tap on flower petal: petal highlights and center label updates with icon + value + % | P1 |
| 3.3.7 | Swipe-to-delete on the last transaction in a date group: date header also disappears | P2 |

---

## 4. Device Compatibility

### 4.1 Screen Sizes & Densities

| # | Test Case | Priority |
|---|-----------|----------|
| 4.1.1 | All screens render without horizontal scroll on 360dp width (Android minimum baseline) | P0 |
| 4.1.2 | Flower chart SVG scales correctly on xxxhdpi displays (640 dpi) | P0 |
| 4.1.3 | Credit card overlay positions correctly on large screens (6.8"+) via `onLayout` scale | P1 |
| 4.1.4 | 3-column category grid stays 3 columns on tablets (not expanding to 4+) | P1 |
| 4.1.5 | `BalanceSummaryChart` is horizontally scrollable and doesn't overflow on 5.0" screens | P1 |
| 4.1.6 | Galaxy Z Fold 5: layout adapts on both folded (cover) and unfolded screens | P2 |
| 4.1.7 | No interactive element is smaller than 44×44dp touch target on any device | P2 |

### 4.2 Android Versions

| # | Test Case | Priority |
|---|-----------|----------|
| 4.2.1 | Android 13 (API 33): all features work, no permission regressions | P0 |
| 4.2.2 | Android 14 (API 34): predictive back API does not break modal dismissal | P0 |
| 4.2.3 | Android 13+: document/file picker for CSV import opens correctly | P1 |
| 4.2.4 | Android 14: edge-to-edge — status bar and nav bar don't overlap content | P1 |
| 4.2.5 | Android 13: per-app language setting doesn't break currency formatting | P2 |
| 4.2.6 | Expo SDK 54 New Architecture: no JSI / TurboModule crashes on Android 13+ | P2 |

### 4.3 Manufacturer Customizations

| # | Test Case | Priority |
|---|-----------|----------|
| 4.3.1 | Samsung One UI: no double navigation bar rendered | P1 |
| 4.3.2 | Xiaomi MIUI: auto-start / background restriction doesn't kill AsyncStorage writes | P1 |
| 4.3.3 | OnePlus OxygenOS: side-swipe gesture doesn't conflict with Sidebar open animation | P1 |
| 4.3.4 | Samsung DeX (tablet + monitor): layout doesn't break in desktop mode | P2 |

---

## 5. Performance & Responsiveness

### 5.1 Scroll & Rendering

| # | Test Case | Priority |
|---|-----------|----------|
| 5.1.1 | Records FlatList with 200+ transactions scrolls at 60fps without jank | P0 |
| 5.1.2 | `BalanceSummaryChart` renders within 500ms on first load (no blank placeholder flash) | P0 |
| 5.1.3 | Flower chart SVG renders within 300ms when switching Expense ↔ Income toggle | P0 |
| 5.1.4 | Daily bar chart (31 bars) scrolls horizontally without frame drops | P1 |
| 5.1.5 | Category grid (20+ items) scrolls without stutter | P1 |
| 5.1.6 | Sidebar slide-in animation completes in ≤ 200ms without skipping frames | P1 |
| 5.1.7 | Rapid month navigation (tapping prev/next quickly): chart debounces correctly, no race condition | P2 |
| 5.1.8 | Cold start to interactive: ≤ 3 seconds on mid-range device (Galaxy A54) | P2 |

### 5.2 Memory & Stability

| # | Test Case | Priority |
|---|-----------|----------|
| 5.2.1 | No crash after 30 minutes of active use with background → foreground cycles | P0 |
| 5.2.2 | Importing a 500-row CSV file: no OOM crash or ANR dialog | P0 |
| 5.2.3 | No memory leak after opening/closing `AddTransactionModal` 20 times consecutively | P1 |
| 5.2.4 | AsyncStorage write completes before app is backgrounded (data not lost on minimize) | P1 |
| 5.2.5 | App recovers from Supabase sync failure gracefully (no crash, shows error or retries) | P2 |
| 5.2.6 | JS bundle memory stays under 150MB after an extended use session | P2 |

### 5.3 Network & Sync

| # | Test Case | Priority |
|---|-----------|----------|
| 5.3.1 | App loads data from AsyncStorage when fully offline (no blank screens) | P0 |
| 5.3.2 | Supabase sync on foreground doesn't block UI thread (list still scrollable during sync) | P1 |
| 5.3.3 | Clerk token refresh failure shows sign-out prompt instead of crashing | P1 |
| 5.3.4 | Slow network (3G throttle): sync spinner appears; no timeout crash after 30s | P2 |

---

## 6. Accessibility

### 6.1 TalkBack

| # | Test Case | Priority |
|---|-----------|----------|
| 6.1.1 | All interactive elements have content descriptions: FAB, tab icons, type toggles | P0 |
| 6.1.2 | Transaction list items are announced with category, type, amount, and date | P0 |
| 6.1.3 | Account cards are announced with name, type, and balance | P0 |
| 6.1.4 | Modal open/close is announced (e.g., "Add Transaction dialog, open") | P1 |
| 6.1.5 | Flower chart petals have content descriptions: category name + percentage | P1 |
| 6.1.6 | Form validation errors are announced without requiring sight | P1 |
| 6.1.7 | `BalanceSummaryChart` has a text summary alternative (e.g., "Expenses this month: $1,234") | P2 |
| 6.1.8 | Swipe-to-delete is accessible via TalkBack custom swipe actions | P2 |

### 6.2 Visual Accessibility

| # | Test Case | Priority |
|---|-----------|----------|
| 6.2.1 | Text contrast ratio ≥ 4.5:1 for all body text on dark background `#0F0703` | P0 |
| 6.2.2 | Income mint `#30FFAC` on dark background meets contrast requirements for amounts | P0 |
| 6.2.3 | Income vs expense amounts differ by sign (+/-), not only by color | P1 |
| 6.2.4 | Error states use an icon or text label — not only a red color change | P1 |
| 6.2.5 | Focus highlight is visible on all interactive elements when using Switch Access | P2 |

### 6.3 Large Text & Display Size

| # | Test Case | Priority |
|---|-----------|----------|
| 6.3.1 | At 200% font scale: all text is visible — no overlap with icons or other text | P0 |
| 6.3.2 | At 200% font scale: Save button remains tappable (not pushed off screen) | P0 |
| 6.3.3 | At 200% font scale: tab labels don't wrap or get clipped | P1 |
| 6.3.4 | At 130% font scale: total balance in Analyse screen doesn't overflow the stat card | P1 |
| 6.3.5 | "Largest" display size setting: layout adapts without element overlap | P2 |

---

## 7. Edge Cases

### 7.1 Orientation

| # | Test Case | Priority |
|---|-----------|----------|
| 7.1.1 | Rotating to landscape during `AddTransactionModal`: modal stays open, data not lost | P0 |
| 7.1.2 | Rotating to landscape on Records: chart reflows and list is still scrollable | P0 |
| 7.1.3 | Rotating to landscape on Accounts: credit card overlay repositions correctly | P1 |
| 7.1.4 | Rotating back to portrait: no visual glitch or blank screen | P1 |
| 7.1.5 | Flower chart in landscape: petal labels don't overlap the chart boundary | P2 |

### 7.2 System Interruptions

| # | Test Case | Priority |
|---|-----------|----------|
| 7.2.1 | Incoming phone call during form entry: form data preserved when call ends | P0 |
| 7.2.2 | App backgrounded mid-form and foregrounded after 10 minutes: form data preserved | P0 |
| 7.2.3 | System OOM kills app in background: relaunching loads correct data from AsyncStorage | P0 |
| 7.2.4 | Battery saver mode: animations still play or degrade gracefully | P1 |
| 7.2.5 | Do Not Disturb mode active: haptic feedback still fires | P1 |
| 7.2.6 | Screen timeout during CSV import: import resumes or shows clear state on re-open | P2 |

### 7.3 Data Edge Cases

| # | Test Case | Priority |
|---|-----------|----------|
| 7.3.1 | Zero transactions: Records shows empty state image + message, no crash or blank | P0 |
| 7.3.2 | Only one account exists: Transfer type in `AddTransactionModal` handles gracefully | P0 |
| 7.3.3 | Account with negative balance: displayed in red with a minus sign, not as positive | P0 |
| 7.3.4 | Account name > 50 chars: wraps or truncates in card without breaking layout | P1 |
| 7.3.5 | Category with no transactions this month: visible in Categories, absent from Analyse chart | P1 |
| 7.3.6 | Future date in `AddTransactionModal`: accepted or blocked with a clear message | P1 |
| 7.3.7 | Amount > 2 decimal places (e.g., `$1.999`): `formatCurrency()` handles correctly | P2 |
| 7.3.8 | > 8 expense categories in Analyse: Flower chart shows top 8 and hides the rest gracefully | P2 |

### 7.4 Dark Mode & Theming

| # | Test Case | Priority |
|---|-----------|----------|
| 7.4.1 | App always uses dark theme (`#0F0703`) — ignores Android system light/dark toggle | P0 |
| 7.4.2 | Toggling system dark mode off/on doesn't change any app colors | P1 |
| 7.4.3 | Status bar icons (time, battery) are light-colored against the dark background | P1 |
| 7.4.4 | App screenshot in Android recents shows dark background (no white flash) | P2 |

---

## Sprint Plan

### Sprint 1 — P0 blockers (start here)
- **Goal**: Zero crashes, all core flows work, data is safe
- **Devices**: Pixel 8 (Android 14) + Galaxy A54 (Android 13)
- **Tools**: Manual testing + `adb logcat` for crashes
- **Sections**: All P0 items in 1–7 (≈ 45 test cases)

### Sprint 2 — P1 quality pass
- **Goal**: UX quality and device compatibility
- **Devices**: Full device matrix above
- **Tools**: Detox regression suite + Accessibility Scanner
- **Sections**: All P1 items (≈ 55 test cases)

### Sprint 3 — P2 polish
- **Goal**: Tablets, foldables, edge scenarios, performance profiling
- **Devices**: Z Fold 5 + Tab S9 + Pixel 6a (budget)
- **Tools**: Android Profiler + Perfetto
- **Sections**: All P2 items (≈ 30 test cases)

---

## Key Source Files

| File | What to test against |
|------|---------------------|
| [app/(tabs)/index.tsx](app/(tabs)/index.tsx) | Records screen, swipe-to-delete, chart |
| [app/(tabs)/analyse.tsx](app/(tabs)/analyse.tsx) | Flower chart, daily chart, type toggle |
| [app/(tabs)/accounts.tsx](app/(tabs)/accounts.tsx) | Credit card overlay, QuickEditModal, AccountFormModal |
| [app/(tabs)/categories.tsx](app/(tabs)/categories.tsx) | Category grid, CategoryFormModal, default protection |
| [components/AddTransactionModal.tsx](components/AddTransactionModal.tsx) | Primary transaction form, all validation |
| [components/BalanceSummaryChart.tsx](components/BalanceSummaryChart.tsx) | SVG chart, touch/pan interactions |
| [lib/storage.ts](lib/storage.ts) | AsyncStorage persistence — data integrity tests |
| [lib/AppContext.tsx](lib/AppContext.tsx) | State after CRUD — verify reducer actions |
| [lib/format.ts](lib/format.ts) | `formatCurrency()` edge cases |
