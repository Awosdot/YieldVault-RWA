# Frontend Component Hierarchy

This document describes the high-level component hierarchy and responsibilities for the primary dashboard view.

---

# Dashboard Component Tree

```
VaultDashboard
│
├── Transaction Confirmation Modal
│
├── Vault Statistics Panel
│   ├── ApiStatusBanner
│   ├── Dashboard Header
│   ├── Vault Metrics
│   └── Refresh / Status Indicators
│
├── VaultCapWarning
│
├── SharePriceDisplay
│
├── VaultPerformanceChart
│
├── Transaction Tabs
│   ├── Deposit
│   ├── Withdraw
│   └── Step Indicator
│       ├── Amount
│       ├── Review
│       └── Result
│
├── Transaction Forms
│
├── Validation & Error States
│
├── Toast Notifications
│
└── Transaction Conflict Resolution
```

---

# Component Responsibilities

## VaultDashboard

The main dashboard container responsible for:

- Fetching vault data
- Managing dashboard state
- Coordinating transactions
- Rendering all dashboard sections
- Managing loading and error states

---

## Transaction Confirmation Modal

Displays a confirmation dialog before sensitive user actions such as deposits and withdrawals.

Responsibilities:

- Transaction confirmation
- Prevent accidental submissions
- Display transaction summary

---

## Vault Statistics Panel

Displays overall vault information.

Responsibilities:

- TVL
- APY
- Vault summary
- Refresh status
- Loading skeletons

---

## ApiStatusBanner

Displays API and backend connectivity errors.

Responsibilities:

- Network error display
- Backend availability status
- User-friendly error messaging

---

## VaultCapWarning

Warns users when the vault approaches or reaches capacity.

Responsibilities:

- Capacity utilization
- Deposit restrictions
- Visual warning state

---

## SharePriceDisplay

Displays the current vault share price.

Responsibilities:

- Current share value
- Price formatting
- Live updates

---

## VaultPerformanceChart

Visualizes vault performance over time.

Responsibilities:

- Historical performance
- Performance trends
- User insight

---

## Transaction Tabs

Allows switching between available transaction types.

Responsibilities:

- Deposit flow
- Withdrawal flow
- Preserve dashboard state

---

## Step Indicator

Guides users through the transaction process.

Steps:

1. Amount
2. Review
3. Result

---

## Transaction Forms

Collects user input.

Responsibilities:

- Amount validation
- Balance checking
- Slippage configuration
- Fee estimation

---

## Validation & Error Handling

Provides client-side and server-side validation.

Responsibilities:

- Form validation
- API validation
- Display field errors
- Prevent invalid submissions

---

## Toast Notifications

Displays transaction feedback.

Responsibilities:

- Success notifications
- Error notifications
- Warning notifications

---

## Transaction Conflict Resolution

Handles stale transactions and conflicting state.

Responsibilities:

- Detect stale submissions
- Retry flow
- Intent refresh
- Conflict resolution

---

# Notes

The dashboard centralizes transaction management while delegating visualization, validation, and feedback to dedicated child components. This separation keeps business logic isolated from reusable UI components and improves maintainability.

---

# Vault Comparison Screen

Route: `/compare` (lazy-loaded, `frontend/src/pages/VaultComparison.tsx`).

Lets a user select two or three vault strategies and view them side by side before allocating capital. Reachable from the "Compare" navbar link and from the vault dashboard's comparison CTA (`frontend/src/components/VaultDashboard.tsx`).

Responsibilities:

- Strategy selection with a configurable maximum (currently 3)
- Empty state guidance when fewer than two strategies are selected
- Side-by-side table comparing APY, liquidity, lockup, risk, and settlement across the selected strategies

Test coverage:

- Unit: `frontend/src/pages/VaultComparison.test.tsx`
- E2E: `frontend/e2e/vault-comparison.spec.ts`