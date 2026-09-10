# BudgetFlow – User Manual

BudgetFlow is a personal finance app for tracking income, expenses, budgets, credit cards, and debts. It runs in the browser, works on mobile and desktop, and can be installed like a native app.

## Getting Started

### Signing In

To start using the app, click **Sign in with Google** on the welcome screen. Your data is stored securely in your own Google account space and is only visible to you.

### Installing as an App (PWA)

BudgetFlow can be installed on your device like a native app:

- **Mobile**: when you visit the app, an install banner may appear — tap **Install** to add it to your home screen.
- **Desktop**: use your browser's install option (e.g. the install icon in the address bar).

Once installed, the app opens in its own window and works even offline.

---

## Dashboard

The Dashboard is your month-at-a-glance overview:

- **KPI cards** – Total Balance, Monthly Income, and Monthly Spending for the current month, each with a trend indicator comparing against last month.
- **Cash Flow chart** – Bar chart of income vs. expenses over the last 6 months.
- **Spending by Category** – Pie chart showing where your money went this month.
- **Budget Overview** – Progress bars for each of your monthly budgets.
- **Recent Transactions** – Your latest entries with a link to see all of them.

Use the **+** button to jump straight in and add a new transaction.

---

## Transactions

Log and manage all your income and expenses.

- **Add a Transaction** – Click **+ Add Transaction** (or press **Ctrl/⌘ + K**). Choose the type (Income or Expense), enter the amount, description, category, and date.
- **Edit / Delete** – Use the ✎ and ✕ buttons on any row. Deletes ask for confirmation.
- **Search** – Type in the search box to find transactions by description or category.
- **Filter** – Filter by type (All / Income / Expense), by category, or by a specific month. Click **Clear filters** to reset.
- **Sort** – Click any column header (Date, Description, Category, Amount) to sort, and click again to reverse the order.
- **Pagination** – Lists are shown 15 at a time; use **Prev / Next** to page through your transactions.

---

## Budgets

Set a spending limit for each category and track your progress.

- **Add a Budget** – Click **+ Add Budget**, pick a category, and enter a monthly limit.
- **Track progress** – Each budget card shows what you've spent, your limit, and what's remaining, with a progress bar.
- **Warnings** – The percentage turns amber when you've used more than 70% of a budget and red when you exceed it.
- **Edit / Delete** – Use the ✎ and ✕ buttons on each card.

The header shows your total spent and total budgeted for the current month.

---

## Credit Cards

Track your card balances, limits, APR, and payments.

- **Add a Card** – Click **+ Add Card** and enter the card name, balance, credit limit, APR, due day, and (optionally) the last four digits. Each card shows its balance and how much of your limit is being used.
- **Add a Charge** – Click **+ Add Charge** to record a purchase; the card's balance updates automatically.
- **Record a Payment** – Click **Pay** on a card, enter the amount, and the balance is reduced. Payments show in the transaction history as a charge reduction.
- **Edit / Delete** – Use the ✎ and ✕ buttons. Deleting a card removes the card and its history — you'll be asked to confirm first.

---

## Debts

Monitor debts and plan your repayments.

- **Add a Debt** – Click **+ Add Debt** and enter the name, person/lender (optional category), current balance, original amount, interest rate, minimum payment, and due date.
- **Grouping** – Debts are grouped by person/category. Use **Select** mode to move one or many debts to another category, or move a single debt with the ⇄ button.
- **Record a Payment** – Click **Pay** on a debt (or **+ Record Payment**) to log a payment; the balance and payoff progress update automatically.
- **Custom Payment** – Enter an amount and choose a payoff strategy:
  - **Snowball** – pays off the smallest balance first.
  - **Avalanche** – pays off the highest APR first.
  
  A preview shows exactly how your payment will be split before you **Apply** it.
- **Payment History** – All logged payments are listed below the debts.
- **KPIs** – Total debt, minimum monthly payments, and estimated monthly interest are shown at the top.

---

## Reports

See your money flow over different periods.

- **Choose a period** – Switch between **Month**, **Quarter**, and **Year**.
- **Income vs Expenses** – Bar chart comparing both for the selected period.
- **Expense Breakdown** – Pie chart and legend showing spending by category.
- **Debt Payoff Progress** – Progress bars showing how much of each debt you've paid off.

---

## Settings

Manage and back up your data.

- **Export Data** – Download a full backup as **JSON**, or just your transactions as **CSV**.
- **Import Data** – Restore from a previously exported JSON backup.
- **Categories** – Add or remove transaction categories; changes apply across the whole app.

---

## Tips

- Use **Ctrl/⌘ + K** anywhere in Transactions to quickly open the "Add Transaction" form.
- The **Sync indicator** in the top bar shows when you're online (Synced) or offline (Offline). The app is installable and opens in its own window, but live syncing of your data requires an internet connection.
- Data updates in real time across all pages as soon as you add or change entries.