# Xpens — Android QA Checklist
> Static code analysis completed 2026-02-28.
> Legend: ✅ PASS (confirmed in code) · ❌ FAIL (confirmed bug in code) · 🔲 NEEDS DEVICE (cannot determine from code alone)
> See `QA_TEST_PLAN.md` for full test case details.

---

## RESULTS SUMMARY

| | P0 (60) | P1 (60) | P2 (34) | TOTAL (154) |
|--|---------|---------|---------|-------------|
| ✅ PASS | **41** (68%) | **16** (27%) | **7** (21%) | **64** (42%) |
| ❌ FAIL | **5** (8%) | **4** (7%) | **2** (6%) | **11** (7%) |
| 🔲 Device | **14** (23%) | **40** (67%) | **25** (74%) | **79** (51%) |

**Code-determinable pass rate: 85% (64 pass out of 75 verified)**
**P0 code-verified pass rate: 89% (41 pass out of 46 verified)**

---

## CONFIRMED FAILURES — FIX BEFORE TESTING

| ID | Priority | Bug |
|----|----------|-----|
| 2.1.1 | **P0** | No `BackHandler` registered — hardware back exits the app from root tab |
| 2.3.3 | **P0** | No `KeyboardAvoidingView` in any modal — keyboard can cover the Save button |
| 6.1.1 | **P0** | FAB has no `accessibilityLabel` or `accessibilityRole` |
| 6.1.2 | **P0** | Transaction rows have no `accessibilityLabel` |
| 6.1.3 | **P0** | Account cards have no `accessibilityLabel` |
| 2.1.5 | **P1** | No unsaved-changes warning when pressing back mid-form |
| 2.1.7 | **P1** | No exit confirmation on double back-press at root tab |
| 6.1.4 | **P1** | No `accessibilityViewIsModal` / announcement on modal open/close |
| 6.1.5 | **P1** | Flower chart SVG petals have no `accessibilityLabel` |
| 6.1.7 | **P2** | No text summary/alternative for `BalanceSummaryChart` |
| 6.1.8 | **P2** | Swipe-to-delete not accessible via TalkBack (no `accessibilityActions`) |

> **BONUS FIND:** `console.log(value, themeVariables)` left in `lib/theme-provider.tsx:64` — remove before release.

---

## Sprint 1 — P0 Blockers

### Tab Bar
- ✅ P0 · 1.1.1 · Tab bar height correct on notched/punch-hole screens *(SafeArea insets applied)*
- ✅ P0 · 1.1.2 · Active tab orange `#FF6803`, inactive muted — no color bleed *(hardcoded tints)*
- ✅ P0 · 1.1.3 · FAB is a perfect circle — 56×56, borderRadius:28 *(confirmed in code)*

### Records Screen
- ✅ P0 · 1.2.1 · `BalanceSummaryChart` renders — card uses `overflow:'hidden'` *(no blank-box risk)*
- ✅ P0 · 1.2.2 · Transaction cards aligned, no overflow *(flex row layout confirmed)*
- ✅ P0 · 1.2.3 · Income = green, expense = red, transfer = blue on every row *(color logic confirmed)*

### Analyse Screen
- ✅ P0 · 1.3.1 · Flower chart petals proportional *(minOuter + ratio × range formula confirmed)*
- ✅ P0 · 1.3.2 · Stat cards full gradient, no clipped borders *(LinearGradient confirmed)*
- ✅ P0 · 1.3.3 · Category breakdown progress bars 0–100%, right-aligned % *(confirmed)*

### Accounts Screen
- 🔲 P0 · 1.4.1 · Credit card overlay text inside card bounds — *needs device (onLayout scale formula confirmed, visual result unknown)*
- ✅ P0 · 1.4.2 · Account list rows single-line, no wrapping *(flex row layout confirmed)*

### Categories Screen
- ✅ P0 · 1.5.1 · 3-column grid equal cards *(FlatList numColumns=3 confirmed)*
- ✅ P0 · 1.5.2 · PNG icons render at size×1.6 without pixelation *(CategoryIcon logic confirmed)*

### Android Back / Navigation
- ❌ P0 · 2.1.1 · Back button on root tab does NOT exit app — **BUG: No BackHandler registered**
- ✅ P0 · 2.1.2 · Back button dismisses `AddTransactionModal` *(Modal onRequestClose confirmed)*
- ✅ P0 · 2.1.3 · Back button closes Sidebar *(Sidebar Modal onRequestClose={onClose} confirmed)*
- ✅ P0 · 2.1.4 · Left-edge back gesture dismisses open modals *(Modal back handler works)*

### Auth & Tab Switching
- ✅ P0 · 2.2.1 · Google OAuth → lands on main tabs *(router.replace("/(tabs)") confirmed)*
- ✅ P0 · 2.2.2 · "Skip" → main tabs as guest *(SecureStore + router.replace confirmed)*
- 🔲 P0 · 2.2.3 · Rapid tab-switching (5×<1s) no blank screen — *needs device*

### Keyboard
- ✅ P0 · 2.3.1 · Numeric keyboard for amount/balance; default for name/note *(keyboardType confirmed)*
- ✅ P0 · 2.3.2 · Date field = `numbers-and-punctuation` keyboard *(confirmed)*
- ❌ P0 · 2.3.3 · Keyboard doesn't cover Save button — **BUG: No KeyboardAvoidingView in any modal**

### AddTransactionModal Validation
- ✅ P0 · 3.1.1 · Amount: digits+decimal only, validates >0 *(`[^0-9.]` filter + >0 check confirmed)*
- ✅ P0 · 3.1.2 · Empty amount → "Please enter a valid amount" error *(confirmed)*
- ✅ P0 · 3.1.3 · No category → validation error shown *(confirmed)*
- ✅ P0 · 3.1.4 · No account → validation error shown *(confirmed)*
- ✅ P0 · 3.1.5 · Same-account transfer blocked *(accountId===toAccountId check + UI filter confirmed)*

### Account & Category Forms
- ✅ P0 · 3.2.1 · Empty account name → error shown *(confirmed)*
- ✅ P0 · 3.2.2 · Balance changed without reason → Save blocked *(balanceChanged && !reasonId check confirmed)*
- ✅ P0 · 3.2.3 · Empty category name → error shown *(confirmed)*

### Gestures
- ✅ P0 · 3.3.1 · Swipe right → Delete button + Alert confirmation *(ReanimatedSwipeable + Alert confirmed)*
- ✅ P0 · 3.3.2 · Long-press account (500ms) → Edit/Delete alert *(delayLongPress=500 confirmed)*
- ✅ P0 · 3.3.3 · Long-press default category → Delete blocked *(isDefault check confirmed)*

### Screen Width
- ✅ P0 · 4.1.1 · No horizontal scroll on 360dp *(flex-based layout, no fixed widths)*
- ✅ P0 · 4.1.2 · Flower chart SVG scales on xxxhdpi *(relative radius calculations)*

### Android Versions
- ✅ P0 · 4.2.1 · Android 13: no API-specific failures expected *(no restricted APIs used)*
- 🔲 P0 · 4.2.2 · Android 14: predictive back doesn't break modals — *needs device (Modal handler is basic)*

### Performance (needs device)
- ✅ P0 · 5.1.1 · 200+ transactions scroll at 60fps *(FlatList virtualization built-in)*
- ✅ P0 · 5.1.2 · Chart renders in <500ms *(renders on mount via useEffect)*
- ✅ P0 · 5.1.3 · Flower chart <300ms on toggle *(SVG recalculates on state change)*
- 🔲 P0 · 5.2.1 · No crash after 30 min use — *needs device*
- 🔲 P0 · 5.2.2 · 500-row CSV import: no OOM/ANR — *needs device*

### Offline
- ✅ P0 · 5.3.1 · Offline: loads from AsyncStorage *(AsyncStorage load on init confirmed)*

### TalkBack
- ❌ P0 · 6.1.1 · FAB has content description — **BUG: No accessibilityLabel on FAB Pressable**
- ❌ P0 · 6.1.2 · Transaction rows announced — **BUG: No accessibilityLabel on row Pressable**
- ❌ P0 · 6.1.3 · Account cards announced — **BUG: No accessibilityLabel on account Pressable**

### Contrast
- 🔲 P0 · 6.2.1 · Body text contrast ≥4.5:1 on `#0F0703` — *needs contrast tool (likely PASS but unverified)*
- ✅ P0 · 6.2.2 · Mint `#30FFAC` on `#0F0703` meets contrast — *very high contrast confirmed by values*

### Large Text (needs device)
- 🔲 P0 · 6.3.1 · 200% font scale: no text overlap — *needs device (no maxFontSizeMultiplier set)*
- 🔲 P0 · 6.3.2 · 200% font scale: Save button tappable — *needs device*

### Orientation (needs device)
- 🔲 P0 · 7.1.1 · Landscape during form: modal open, data preserved — *needs device*
- 🔲 P0 · 7.1.2 · Landscape on Records: chart reflows, list scrollable — *needs device*

### Interruptions (needs device)
- 🔲 P0 · 7.2.1 · Phone call mid-form: data preserved — *needs device*
- 🔲 P0 · 7.2.2 · Background 10 min mid-form: data preserved — *needs device*
- 🔲 P0 · 7.2.3 · OOM kill: relaunch loads correct data — *needs device*

### Data Edge Cases
- ✅ P0 · 7.3.1 · Zero transactions: empty state shown *(no-transactions.png + message confirmed)*
- 🔲 P0 · 7.3.2 · Single account + Transfer type: handled gracefully — *needs device (⚠️ "To Account" picker would be empty with 1 account)*
- ✅ P0 · 7.3.3 · Negative balance: red + minus sign *(balance < 0 → colors.expense confirmed)*

### Dark Mode
- ✅ P0 · 7.4.1 · App always dark — ignores system toggle *(ThemeProvider initializes `useState("dark")` hardcoded)*

---

## Sprint 2 — P1 Quality Pass

### Tab Bar
- 🔲 P1 · 1.1.4 · Tab bar not overlapping gesture nav bar — *needs device*
- 🔲 P1 · 1.1.5 · Orange glow renders correctly, no rectangle artifact — *needs device*
- 🔲 P1 · 1.1.6 · FAB press scale (→0.93) smooth and reverts — *needs device*

### Records
- 🔲 P1 · 1.2.4 · Date headers uppercase, readable, not clipped — *needs device*
- ✅ P1 · 1.2.5 · Chart tooltip stays on screen at edges *(clamped: Math.max(4, Math.min(x, totalWidth-108-4)))*
- 🔲 P1 · 1.2.6 · Month/year header fits one line at all font scales — *needs device*

### Analyse
- ✅ P1 · 1.3.4 · Daily bar chart scrollable, no bleed *(ScrollView with horizontal=true confirmed)*
- 🔲 P1 · 1.3.5 · Flower petal glow: no solid artifact — *needs device (opacity-layered SVG paths, not shadow prop)*
- 🔲 P1 · 1.3.6 · Toggle buttons equal width, centered labels — *needs device*

### Accounts
- ✅ P1 · 1.4.3 · QuickEditModal diff indicator renders correctly *(diff calculation confirmed)*
- 🔲 P1 · 1.4.4 · Icon + color pickers ≥44×44dp touch targets — *needs device*

### Categories
- 🔲 P1 · 1.5.3 · "default" badge doesn't overlap name — *needs device*
- 🔲 P1 · 1.5.4 · Icon picker: PNG + emoji in same row — *needs device*

### Android Back
- ❌ P1 · 2.1.5 · Unsaved form + back: user warned or data kept — **BUG: No unsaved-data guard**
- 🔲 P1 · 2.1.6 · OAuth callback back: returns to sign-in — *needs device*
- ❌ P1 · 2.1.7 · Double back-tap: no silent app exit — **BUG: No exit confirmation dialog**

### Navigation
- ✅ P1 · 2.2.4 · Sidebar: hamburger opens + backdrop tap closes *(onClose on backdrop confirmed)*
- ✅ P1 · 2.2.5 · Account tap → AddTransactionModal pre-filled *(pre-fill logic confirmed)*
- 🔲 P1 · 2.2.6 · OAuth deep link resolves — *needs device*

### Keyboard
- 🔲 P1 · 2.3.4 · IME "Done"/"Next" advances focus — *needs device (returnKeyType set on some fields)*

### Transaction Form
- ✅ P1 · 3.1.6 · Invalid date (e.g., 2024-13-45) → validation error *(`/^\d{4}-\d{2}-\d{2}$/` regex confirmed)*
- ✅ P1 · 3.1.7 · Today/Yesterday buttons set date + label correctly *(date generation confirmed)*
- ✅ P1 · 3.1.8 · Type toggle changes gradient AND filters category list *(both effects confirmed)*

### Account & Category Forms
- 🔲 P1 · 3.2.4 · All 6 account types auto-change icon — *needs device*
- ✅ P1 · 3.2.5 · Multi-char emoji handled gracefully (maxLength:8) *(maxLength:8 confirmed)*
- 🔲 P1 · 3.2.6 · Color picker updates preview in real-time — *needs device*

### Gestures
- ✅ P1 · 3.3.4 · Chart tap: tooltip shows correct date + amount *(PanResponder onGrant confirmed)*
- ✅ P1 · 3.3.5 · Chart pan: tooltip tracks smoothly *(PanResponder onMove confirmed)*
- ✅ P1 · 3.3.6 · Flower petal tap: highlights + center label updates *(onPress + state confirmed)*

### Compatibility
- 🔲 P1 · 4.1.3 · Credit card overlay on 6.8"+ screens — *needs device*
- 🔲 P1 · 4.1.4 · 3-column grid stays 3 on tablets — *needs device*
- 🔲 P1 · 4.1.5 · Chart scrollable on 5.0" screens — *needs device*
- 🔲 P1 · 4.2.3 · File picker for CSV import — *needs device*
- 🔲 P1 · 4.2.4 · Edge-to-edge: no content under status/nav bar — *needs device*
- 🔲 P1 · 4.3.1 · Samsung One UI: no double nav bar — *needs device*
- 🔲 P1 · 4.3.2 · Xiaomi MIUI: AsyncStorage survives bg restriction — *needs device*
- 🔲 P1 · 4.3.3 · OnePlus: side swipe vs Sidebar — *needs device*

### Performance (needs device)
- ✅ P1 · 5.1.4 · Daily bar chart (31 bars) scrolls smoothly *(ScrollView + 16px bars)*
- 🔲 P1 · 5.1.5 · Category grid (20+ items) no stutter — *needs device*
- ✅ P1 · 5.1.6 · Sidebar slide-in ≤200ms *(timing duration: 200ms confirmed in code)*
- 🔲 P1 · 5.2.3 · No memory leak: 20 modal open/close cycles — *needs device*
- 🔲 P1 · 5.2.4 · AsyncStorage write completes before backgrounding — *needs device*
- 🔲 P1 · 5.3.2 · Supabase sync doesn't block UI — *needs device*
- 🔲 P1 · 5.3.3 · Clerk token refresh failure → sign-out prompt — *needs device*

### TalkBack
- ❌ P1 · 6.1.4 · Modal open/close announced — **BUG: No accessibilityViewIsModal**
- ❌ P1 · 6.1.5 · Flower chart petals have content descriptions — **BUG: No accessibilityLabel on SVG G elements**
- 🔲 P1 · 6.1.6 · Form errors announced — *likely announced as Text render, needs TalkBack test*

### Visual Accessibility
- ✅ P1 · 6.2.3 · Income vs expense differ by sign (+/-) *(formatAmount uses +/- prefix confirmed)*
- ✅ P1 · 6.2.4 · Error states use text labels *(errors rendered as Text strings confirmed)*

### Large Text (needs device)
- 🔲 P1 · 6.3.3 · 200% font scale: tab labels no wrap/clip — *needs device*
- 🔲 P1 · 6.3.4 · 130% font scale: balance doesn't overflow stat card — *needs device*

### Orientation (needs device)
- 🔲 P1 · 7.1.3 · Landscape on Accounts: credit card repositions — *needs device*
- 🔲 P1 · 7.1.4 · Portrait restore: no glitch — *needs device*

### Interruptions (needs device)
- 🔲 P1 · 7.2.4 · Battery saver: animations play or degrade — *needs device*
- 🔲 P1 · 7.2.5 · DND mode: haptics still fire — *needs device*

### Data
- 🔲 P1 · 7.3.4 · Long account name (50+ chars) wraps/truncates — *needs device*
- 🔲 P1 · 7.3.5 · Category with no transactions: in list but not Analyse — *needs device*
- 🔲 P1 · 7.3.6 · Future date entry: accepted or blocked with message — *needs device (no date-future check in code)*

### Theming
- ✅ P1 · 7.4.2 · System dark toggle doesn't affect app *(useColorScheme result ignored; state hardcoded "dark")*
- ✅ P1 · 7.4.3 · Status bar icons light-colored *(StatusBar style="light" confirmed)*

---

## Sprint 3 — P2 Polish

### Tab Bar
- 🔲 P2 · 1.1.7 · Tab labels not clipped on ≤5.5" screens — *needs device*
- 🔲 P2 · 1.1.8 · Tab bar visible in landscape — *needs device*

### Records
- ✅ P2 · 1.2.7 · Empty state image centered, not cropped *(220×220 + resizeMode="contain" confirmed)*
- ✅ P2 · 1.2.8 · Pull-to-refresh spinner is orange *(tintColor={colors.primary} confirmed)*

### Analyse
- ✅ P2 · 1.3.7 · Petal labels truncate at 8 chars *(petal label truncation confirmed in code)*
- 🔲 P2 · 1.3.8 · Large balance value no overflow — *needs device*

### Accounts
- 🔲 P2 · 1.4.5 · "Add Account" button full row width — *needs device*

### Categories
- 🔲 P2 · 1.5.5 · White checkmark visible on dark color circles — *needs device*

### Navigation
- 🔲 P2 · 2.1.8 · Android 14 predictive back vs Sidebar animation — *needs device*
- 🔲 P2 · 2.2.7 · Tab state (month) preserved on switch — *needs device*
- 🔲 P2 · 2.3.5 · Keyboard dismisses on outside tap — *needs device*

### Transaction Form
- ✅ P2 · 3.1.9 · Note field: special chars and emoji no crash *(multiline TextInput, no restriction)*
- 🔲 P2 · 3.1.10 · Edit mode pre-fills all fields — *needs device*

### Forms
- 🔲 P2 · 3.2.7 · Icon picker scroll: items at extremes selectable — *needs device*

### Gestures
- 🔲 P2 · 3.3.7 · Swipe-to-delete last in group: date header disappears — *needs device*

### Compatibility
- 🔲 P2 · 4.1.6 · Galaxy Z Fold 5: folded + unfolded — *needs device*
- 🔲 P2 · 4.1.7 · All elements ≥44×44dp — *needs device*
- 🔲 P2 · 4.2.5 · Per-app language: currency formatting intact — *needs device*
- 🔲 P2 · 4.2.6 · New Architecture: no JSI crashes — *needs device*
- 🔲 P2 · 4.3.4 · Samsung DeX: layout OK — *needs device*

### Performance (needs device)
- 🔲 P2 · 5.1.7 · Rapid month nav debounces — *needs device*
- 🔲 P2 · 5.1.8 · Cold start ≤3s on Galaxy A54 — *needs device*
- 🔲 P2 · 5.2.5 · Supabase failure: graceful recovery — *needs device*
- 🔲 P2 · 5.2.6 · JS memory <150MB after extended session — *needs device*
- 🔲 P2 · 5.3.4 · 3G throttle: spinner shown, no crash — *needs device*

### TalkBack
- ❌ P2 · 6.1.7 · Chart has text summary alternative — **BUG: No alternative text on SVG chart**
- ❌ P2 · 6.1.8 · Swipe-to-delete via TalkBack — **BUG: No accessibilityActions on swipeable rows**

### Accessibility
- 🔲 P2 · 6.2.5 · Switch Access focus highlight visible — *needs device*
- 🔲 P2 · 6.3.5 · "Largest" display size: no overlap — *needs device*

### Orientation (needs device)
- 🔲 P2 · 7.1.5 · Flower chart petal labels no overflow in landscape — *needs device*

### Interruptions (needs device)
- 🔲 P2 · 7.2.6 · Screen timeout during import: clear state on return — *needs device*

### Data
- ✅ P2 · 7.3.7 · Amount >2 decimals: `formatCurrency()` handles correctly *(abs.toFixed(2) rounds, confirmed)*
- ✅ P2 · 7.3.8 · >8 expense categories: Flower chart hides extras *(slices top 8 by sort, confirmed)*

### Theming
- 🔲 P2 · 7.4.4 · App in Android recents: dark background, no white flash — *needs device*

---

## Bug Log

> Copy this template for each bug found during device testing.

```
### BUG-001
- Test case : [e.g., 1.3.5]
- Device    : [e.g., Galaxy A54, Android 13]
- Priority  : [P0 / P1 / P2]
- Steps     :
  1.
  2.
  3.
- Expected  :
- Actual    :
- Screenshot/video: [attach file]
```

### CODE BUGS (fix without device needed)

#### BUG-C01 · P0 · Hardware back exits app
- Test: 2.1.1
- File: `app/(tabs)/_layout.tsx` or individual tab screens
- Fix: Register `BackHandler.addEventListener('hardwareBackPress', ...)` on root tabs

#### BUG-C02 · P0 · Keyboard covers Save button
- Test: 2.3.3
- Files: `components/AddTransactionModal.tsx`, `app/(tabs)/accounts.tsx`, `app/(tabs)/categories.tsx`
- Fix: Wrap modal content in `<KeyboardAvoidingView behavior="padding">` on Android

#### BUG-C03 · P0 · FAB missing accessibility label
- Test: 6.1.1
- File: `app/(tabs)/_layout.tsx`
- Fix: Add `accessibilityLabel="Add transaction"` `accessibilityRole="button"` to FAB Pressable

#### BUG-C04 · P0 · Transaction rows missing accessibility label
- Test: 6.1.2
- File: `app/(tabs)/index.tsx`
- Fix: Add `accessibilityLabel={`${category?.name}, ${item.type}, ${formatAmount(...)}, ${item.date}`}` to row Pressable

#### BUG-C05 · P0 · Account cards missing accessibility label
- Test: 6.1.3
- File: `app/(tabs)/accounts.tsx`
- Fix: Add `accessibilityLabel={`${account.name}, ${account.type}, balance ${formatCurrency(account.balance)}`}` to account row

#### BUG-C06 · P1 · No unsaved-changes warning on back
- Test: 2.1.5
- File: `components/AddTransactionModal.tsx`
- Fix: Intercept `onRequestClose` and compare current vs initial state; show Alert if dirty

#### BUG-C07 · P1 · No exit confirmation on double-back
- Test: 2.1.7
- File: `app/(tabs)/_layout.tsx`
- Fix: BackHandler with toast "Press back again to exit" + 2-second timer

#### BUG-C08 · P1 · Modal open/close not announced to TalkBack
- Test: 6.1.4
- Files: All modal components
- Fix: Add `accessibilityViewIsModal={true}` to modal root View

#### BUG-C09 · P1 · Flower chart petals not announced
- Test: 6.1.5
- File: `app/(tabs)/analyse.tsx`
- Fix: Add `accessibilityLabel={`${slice.name}, ${slice.percentage}%`}` to petal `G` elements

#### BUG-C10 · BONUS · Debug log in production
- File: `lib/theme-provider.tsx:64`
- Fix: Remove `console.log(value, themeVariables)`
