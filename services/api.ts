// Frontend API service for communicating with backend

import type { 
  ProcessedStatement, 
  ProcessedTransaction, 
  Transaction, 
  SummaryStats, 
  MonthlySummary 
} from '../types/cashflow.types'

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export const api = {
  // Bank Statement Upload & Processing
  uploadStatement: async (file: File): Promise<ApiResponse<{ fileId: string; status: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/api/statements/upload`, {
      method: 'POST',
      body: formData,
    });
    
    return { success: true, data: await response.json() };
  },

  // Get processed statements list
  getStatements: async (): Promise<ApiResponse<ProcessedStatement[]>> => {
    const response = await fetch(`${API_BASE_URL}/api/statements`);
    const data = await response.json();
    return data as ApiResponse<ProcessedStatement[]>;
  },

  // Get transactions by statement
  getStatementTransactions: async (statementId: string): Promise<ApiResponse<ProcessedTransaction[]>> => {
    const response = await fetch(`${API_BASE_URL}/api/statements/${statementId}/transactions`);
    const data = await response.json();
    return data as ApiResponse<ProcessedTransaction[]>;
  },

  // Create new transaction manually
  createTransaction: async (transaction: Partial<Transaction>): Promise<ApiResponse<{ id: string }>> => {
    const response = await fetch(`${API_BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    
    return { success: true, data: await response.json() };
  },

  // Delete transaction
  deleteTransaction: async (transactionId: string): Promise<ApiResponse<void>> => {
    const response = await fetch(`${API_BASE_URL}/api/transactions/${transactionId}`, {
      method: 'DELETE',
    });
    
    return { success: true };
  },

  // Get all transactions for dashboard
  getAllTransactions: async (month?: string): Promise<ApiResponse<Transaction[]>> => {
    const url = month 
      ? `${API_BASE_URL}/api/transactions?month=${month}`
      : `${API_BASE_URL}/api/transactions`;
    
    const response = await fetch(url);
    const data = await response.json();
    return data as ApiResponse<Transaction[]>;
  },

  // Get summary stats
  getSummary: async (): Promise<ApiResponse<SummaryStats>> => {
    const response = await fetch(`${API_BASE_URL}/api/summary`);
    const data = await response.json();
    return data as ApiResponse<SummaryStats>;
  },

  // Get monthly summaries for charts
  getMonthlySummaries: async (): Promise<ApiResponse<MonthlySummary[]>> => {
    const response = await fetch(`${API_BASE_URL}/api/monthly`);
    const data = await response.json();
    return data as ApiResponse<MonthlySummary[]>;
  },

  // Export transactions to CSV
  exportToCSV: async (): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/api/export/csv`);
    return response.blob();
  },
};