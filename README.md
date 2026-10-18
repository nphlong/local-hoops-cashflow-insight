# 🏀 Basketball Court Booking Cashflow Insight

A comprehensive financial dashboard for tracking cash flow (inflows and outflows) specifically designed for basketball court booking businesses.

![React](https://img.shields.io/badge/React-18.2-green.svg?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg?style=for-the-badge&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-blue.svg?style=for-the-badge&logo=tailwind-css)

## 📊 What This Dashboard Does

- **Visualize Cashflow Trends**: See how money flows in and out of your business over time
- **Track Revenue Sources**: Breakdown of court rentals, memberships, events, etc.
- **Monitor Expenses**: Detailed tracking of maintenance, utilities, security, etc.
- **Import Bank Statements**: Upload CSV bank statements for automatic processing
- **Quick Data Entry**: Manually add transactions in seconds
- **Real-time Dashboard**: Track inflows, outflows, net cashflow, and booking counts

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager

### Installation

```bash
# Install dependencies
npm install

# Start development server (runs both frontend and backend)
npm run dev

# Or start just the frontend
npm run client
```

## 📁 Project Structure

```
Local-Hoops-Cashflow-Insight/
├── src/
│   ├── components/           # React components
│   │   ├── Dashboard/        # SummaryCards, TransactionTable
│   │   ├── Charts/           # TrendChart, InflowChart, OutflowChart
│   │   ├── Forms/            # ImportSection, ManualEntryForm
│   │   └── Layouts/          # Header
│   ├── types/                # TypeScript interfaces
│   ├── utils/                # Helper functions
│   ├── App.tsx               # Main app component
│   └── main.tsx              # Entry point
├── services/
│   ├── backend.ts            # Bank statement processor
│   ├── server.ts             # Express API server
│   └── api.ts                # Frontend API client
├── public/                   # Static assets
├── .github/workflows/        # CI/CD configs
├── package.json              # Dependencies & scripts
└── tsconfig.json             # TypeScript config
```

## 📋 Cashflow Categories

### Inflow Categories
- **Court Rental Fees**: Direct court booking revenue
- **Membership Subscriptions**: Monthly/annual member fees
- **Event Hosting Fees**: Corporate events, tournaments, leagues
- **Equipment Rental Income**: Basketball gear rental
- **Training Program Sales**: Private/group training sessions
- **Merchandise Sales**: Team kits, apparel sales
- **Sponsorship & Advertising**: Court ads, sponsor partnerships

### Outflow Categories
- **Facility Maintenance**: Court upkeep, resurfacing, repairs
- **Security Staffing**: Guards/monitors for court safety
- **Cleaning Services**: Daily cleaning supplies and staff
- **Insurance Premiums**: Liability insurance
- **Utilities & Rent**: Electricity, water, facility lease
- **Equipment Repairs**: Hoops, boards, flooring repairs
- **Payment Processing Fees**: Credit card/PayPal fees
- **Marketing & Promotion**: Social ads, flyers, local marketing

## 📊 Dashboard Features

### 1. Summary Cards (Top)
- Total Inflow - Total money received
- Total Outflow - Total money spent
- Net Cashflow - Profit/loss for the period
- Booking Count - Number of transactions

### 2. Charts Section
- **Trend Chart**: Line graph showing inflow vs outflow over time
- **Inflow Chart**: Pie chart breaking down revenue sources
- **Outflow Chart**: Bar chart showing expense categories

### 3. Transaction Table
- Full list of all transactions
- Search functionality
- Date, description, category, and amount columns

### 4. Data Entry Section
- **Import Bank Statement**: Drag & drop CSV files from your bank
- **Quick Transaction Entry**: Manually add new transactions

## 🔄 Bank Statement Import

The app processes raw bank statement CSV files and categorizes them automatically based on:
- Transaction descriptions (e.g., "court rental booking" → Court Rental Fees)
- Amounts (positive = inflow, negative = outflow)
- Date extraction for monthly grouping

### Supported CSV Format Example:
```csv
Date,Description,Credit,Debit,Balance
01/2024-15,Court Rental - Team A,,2500.00,,
01/2024-16,Membership Fee - John,,,1500.00,
```

## 🛠️ API Endpoints (Backend)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/statements/upload` | POST | Upload and process CSV bank statement |
| `/api/statements` | GET | Get all processed statements |
| `/api/summary` | GET | Get overall summary stats |
| `/api/monthly` | GET | Get monthly breakdowns for charts |
| `/api/export/csv` | GET | Export all transactions to CSV |
| `/api/categories` | GET | Get available category definitions |

## 🚧 Future Enhancements

- [ ] Multi-currency support
- [ ] User authentication & multi-user support
- [ ] Cloud database (Firebase/MongoDB) backend
- [ ] Email notifications for low cashflow periods
- [ ] Export to PDF reports
- [ ] Mobile app version

---

Built with ❤️ by Local-Hoops Team
