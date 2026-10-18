/**
 * Backend API Service for Bank Statement Processing
 * Handles CSV parsing, data transformation, and storage
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ProcessStatementResponse {
  id: string;
  filename: string;
  month: string;
  transactions: {
    id: string;
    date: Date;
    amount: number;
    description: string;
    categoryType: 'inflow' | 'outflow';
    categoryId: string;
  }[];
}

export interface RawBankStatementRow {
  date?: string;
  description?: string;
  creditAmount?: string;
  debitAmount?: string;
  balance?: string;
}

// Export default categories from types
import { DEFAULT_INFLOW_CATEGORIES, DEFAULT_OUTFLOW_CATEGORIES } from '../types/cashflow.types';

export const parseCSV = (csvContent: string): RawBankStatementRow[] => {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const dataRows: RawBankStatementRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = line.split(',').map(v => v.trim());
    
    const row: RawBankStatementRow = {};
    for (let j = 0; j < headers.length && j < values.length; j++) {
      const header = headers[j].toLowerCase();
      const value = values[j];
      
      if (header.includes('date') || header.includes('day')) {
        row.date = value;
      } else if (header.includes('desc') || header.includes('description') || header.includes('note') || header.includes('memo')) {
        row.description = value;
      } else if (header.includes('credit') || header.includes('deposit') || header.includes('inflow')) {
        row.creditAmount = value;
      } else if (header.includes('debit') || header.includes('payment') || header.includes('outflow') || header.includes('withdrawal')) {
        row.debitAmount = value;
      } else if (header.includes('balance') || header.includes('bal')) {
        row.balance = value;
      }
    }
    
    dataRows.push(row);
  }
  
  return dataRows;
};

export const convertAmountToNumber = (value: string | undefined): number => {
  if (!value) return 0;
  const numValue = parseFloat(value.replace(/[^0-9.-]+/g, ''));
  return isNaN(numValue) ? 0 : numValue;
};
export interface CategorizedTransaction {
  id: string;
  date: Date;
  amount: number;
  description: string;
  categoryType: 'inflow' | 'outflow';
  categoryId: string;
}

export interface StatementProcessor {
  processFile(filePath: string): Promise<ProcessStatementResponse>;
  parseTransactions(rows: RawBankStatementRow[]): CategorizedTransaction[];
  categorizeTransaction(
    description: string, 
    amount: number,
    isCredit?: boolean
  ): { categoryId: string | null; categoryType: 'inflow' | 'outflow' };
}

export class BasketballCourtStatementProcessor implements StatementProcessor {
  
  constructor() {}

  public categorizeTransaction(
    description: string, 
    amount: number,
    isCredit?: boolean
  ): { categoryId: string | null; categoryType: 'inflow' | 'outflow' } {
    const normalizedDesc = this.normalizeDescription(description);
    
    const commonInflowKeywords = [
      'court rental', 'booking', 'membership', 'event hosting', 
      'tournament', 'training', 'sponsorship', 'platform fee'
    ];
    
    const commonOutflowKeywords = [
      'maintenance', 'security', 'cleaning', 'insurance', 'platform',
      'marketing', 'rent', 'utilities', 'repair', 'visa', 'paypal', 'stripe', 'payment'
    ];
    
    for (const keyword of commonInflowKeywords) {
      if (normalizedDesc.includes(keyword)) {
        const category = DEFAULT_INFLOW_CATEGORIES.find(c => c.name.toLowerCase().includes(keyword.replace(/\s+/g, '')));
        return { categoryId: category?.id || 'court_rental', categoryType: 'inflow' };
      }
    }
    
    for (const keyword of commonOutflowKeywords) {
      if (normalizedDesc.includes(keyword)) {
        const category = DEFAULT_OUTFLOW_CATEGORIES.find(c => c.name.toLowerCase().includes(keyword.replace(/\s+/g, '')));
        return { categoryId: category?.id || 'utilities_rent', categoryType: 'outflow' };
      }
    }
    
    return { 
      categoryId: isCredit ? 'court_rental' : 'utilities_rent', 
      categoryType: isCredit ? 'inflow' : 'outflow' 
    };
  }

  private parseDate(dateStr: string): Date {
    const formats = [
      new Date(dateStr),           
      new Date(dateStr.replace(/-/g, '/')), 
    ];
    
    for (const fmt of formats) {
      if (!isNaN(fmt.getTime())) return fmt;
    }
    
    const cleanDate = dateStr.replace(/[^\d\/-]/g, '');
    if (cleanDate.length >= 8) {
      const [year, month, day] = cleanDate.slice(0, 8).split('-');
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
    
    throw new Error(`Unable to parse date: ${dateStr}`);
  }

  private normalizeDescription(desc: string): string {
    if (!desc) return '';
    return desc.toLowerCase()
      .replace(/bank.*transfer/i, '')
      .replace(/payment/i, '')
      .replace(/deposit/i, '')
      .replace(/\$|EUR|GBP/i, '')
      .trim();
  }

  public parseTransactions(rows: RawBankStatementRow[]): CategorizedTransaction[] {
    const transactions: CategorizedTransaction[] = [];
    
    for (const row of rows) {
      if (!row.description && !row.creditAmount && !row.debitAmount) continue;
      
      const dateStr = row.date || new Date().toISOString();
      const date = this.parseDate(dateStr);
      
      let isCredit = false;
      let amount: number = 0;
      
      if (row.creditAmount) {
        amount = convertAmountToNumber(row.creditAmount);
        isCredit = true;
      } else if (row.debitAmount) {
        amount = convertAmountToNumber(row.debitAmount);
      }
      
      if (amount === 0 && row.balance) continue;
      
      const description = this.normalizeDescription(row.description || '');
      
      const categorization = this.categorizeTransaction(description, amount, isCredit);
      
      transactions.push({
        id: uuidv4(),
        date,
        amount,
        description: row.description || '',
        categoryType: categorization.categoryType,
        categoryId: categorization.categoryId || '',
      });
    }
    
    return transactions;
  }

  public async processFile(filePath: string): Promise<ProcessStatementResponse> {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(csvContent);
    
    if (rows.length === 0) {
      throw new Error('No transactions found in the statement');
    }
    
    const firstDate = this.parseDate(rows[0].date || '');
    const year = firstDate.getFullYear();
    const monthKey = `${String(firstDate.getMonth() + 1).padStart(2, '0')}-${year}`;
    
    const transactions = this.parseTransactions(rows);
    
    return {
      id: uuidv4(),
      filename: path.basename(filePath),
      month: monthKey,
      transactions,
    };
  }

  public getCategories(): { inflow: Array<{id: string; name: string}>; outflow: Array<{id: string; name: string}> } {
    return {
      inflow: DEFAULT_INFLOW_CATEGORIES,
      outflow: DEFAULT_OUTFLOW_CATEGORIES,
    };
  }
}

export const statementProcessor = new BasketballCourtStatementProcessor();