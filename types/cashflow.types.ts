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
  { id: 'court_rental', name: 'Court Rental Fees', description: 'Direct court booking revenue' },
  { id: 'membership_fees', name: 'Membership Subscriptions', description: 'Monthly/annual member fees' },
  { id: 'event_hosting', name: 'Event Hosting Fees', description: 'Corporate events, tournaments, leagues' },
  { id: 'equipment_rental', name: 'Equipment Rental Income', description: 'Basketball gear, jerseys rental' },
  { id: 'training_programs', name: 'Training Program Sales', description: 'Private/group training sessions' },
  { id: 'merchandise_sales', name: 'Merchandise Sales', description: 'Team kits, apparel sales' },
  { id: 'sponsorships', name: 'Sponsorship & Advertising', description: 'Court ads, sponsor partnerships' },
];

// Default outflow category definitions
export const DEFAULT_OUTFLOW_CATEGORIES: OutflowCategory[] = [
  { id: 'facility_maintenance', name: 'Facility Maintenance', description: 'Court upkeep, resurfacing, repairs' },
  { id: 'security_staffing', name: 'Security Staffing', description: 'Guards/monitors for court safety' },
  { id: 'cleaning_services', name: 'Cleaning Services', description: 'Daily cleaning supplies and staff' },
  { id: 'insurance_premiums', name: 'Insurance Premiums', description: 'Liability insurance' },
  { id: 'platform_subscriptions', name: 'Platform Subscriptions', description: 'Booking system software costs' },
  { id: 'marketing_promotion', name: 'Marketing & Promotion', description: 'Social ads, flyers, local marketing' },
  { id: 'utilities_rent', name: 'Utilities & Rent', description: 'Electricity, water, facility lease' },
  { id: 'equipment_repairs', name: 'Equipment Repairs', description: 'Hoops, boards, flooring repairs' },
  { id: 'payment_fees', name: 'Payment Processing Fees', description: 'Credit card/PayPal fees' },
  { id: 'miscellaneous', name: 'Miscellaneous Expenses', description: 'Other operational costs' },
];