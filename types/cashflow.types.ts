// Basketball Court Booking Cashflow Types

export type TransactionType = 'inflow' | 'outflow';

export interface BaseCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface InflowCategory extends BaseCategory {
  id: string;
  name: string;
  description?: string;
}

export interface OutflowCategory extends BaseCategory {
  id: string;
  name: string;
  description?: string;
}

export type CategoryType = 'inflow' | 'outflow';

export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  description: string;
  categoryType: TransactionType;
  categoryId: string; // Using string for flexibility, can be mapped to category names
  subAmount?: number; // For split transactions (e.g., platform fees)
  bankStatementId?: string; // Reference to processed statement data
}

export interface ProcessedTransaction extends Transaction {
  sourceStatementId: string;
  originalDescription?: string;
  matchedRule?: string;
  confidenceScore?: number;
}

export interface BankStatementFile {
  id: string;
  name: string;
  fileUrl: string;
  uploadDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'error';
  month?: string; // MM-YYYY format
}

export interface ProcessedStatement {
  id: string;
  fileId: string;
  filename: string;
  month: string; // MM-YYYY
  year: number;
  transactions: ProcessedTransaction[];
  totalInflow: number;
  totalOutflow: number;
  netCashflow: number;
  processingDate: Date;
}

export interface SummaryStats {
  totalInflow: number;
  totalOutflow: number;
  netCashflow: number;
  bookingCount: number;
  revenuePerBooking: number;
  avgTransactionAmount: number;
}

export interface MonthlySummary {
  month: string; // MM-YYYY
  year: number;
  totalInflow: number;
  totalOutflow: number;
  netCashflow: number;
  bookingCount: number;
  inflowBreakdown: { [key: string]: number };
  outflowBreakdown: { [key: string]: number };
}

// Default inflow category definitions
export const DEFAULT_INFLOW_CATEGORIES: InflowCategory[] = [
  { id: 'other_income', name: 'Other Income', description: 'Events, training, sponsorships, and other revenue' },
  { id: 'basketball_courts', name: 'Basketball Courts Income (Net)', description: 'Net court hire revenue' },
  { id: 'fb_income', name: 'F&B Income (Net)', description: 'Net food and beverage revenue' },
  { id: 'income_misc', name: 'Misc', description: 'Unclassified income' },
];

export const DEFAULT_OUTFLOW_CATEGORIES: OutflowCategory[] = [
  { id: 'expense_misc', name: 'Misc', description: 'Unclassified expenses' },
  { id: 'renting', name: 'Renting', description: 'Facility lease' },
  { id: 'tax', name: 'Tax', description: 'Tax installments' },
  { id: 'inventory', name: 'Inventory', description: 'Gear, stock, and replacements' },
  { id: 'electricity', name: 'Electricity', description: 'Power for the facility' },
  { id: 'employees', name: 'Employees', description: 'Floor staff and cleaning' },
  { id: 'water', name: 'Water', description: 'Water for the facility' },
];