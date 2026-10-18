import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { statementProcessor } from './backend';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Multer configuration for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.originalname.split('.')[0] + '_' + uniqueSuffix + '.csv');
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') cb(null, true);
    else cb(new Error('Only CSV files are allowed'));
  }
});

// Upload bank statement and process it
app.post('/api/statements/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const processed = await statementProcessor.processFile(req.file.path);
    const jsonPath = req.file.path.replace(/\.csv$/, '.json');
    fs.writeFileSync(jsonPath, JSON.stringify(processed, null, 2));
    res.json({ success: true, data: { id: processed.id, filename: processed.filename, status: 'completed', month: processed.month, transactionCount: processed.transactions.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all processed statements
app.get('/api/statements', (req: Request, res: Response) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(uploadsDir, f), 'utf-8')));
  res.json({ success: true, data: files });
});

// Get summary statistics across all statements
app.get('/api/summary', (req: Request, res: Response) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  let totalInflow = 0, totalOutflow = 0, bookingCount = 0;
  try {
    for (const file of fs.readdirSync(uploadsDir).filter(f => f.endsWith('.json'))) {
      const statement = JSON.parse(fs.readFileSync(path.join(uploadsDir, file), 'utf-8'));
      const inflows = statement.transactions.filter((t: any) => t.categoryType === 'inflow');
      const outflows = statement.transactions.filter((t: any) => t.categoryType === 'outflow');
      totalInflow += inflows.reduce((sum: number, t: any) => sum + t.amount, 0);
      totalOutflow += outflows.reduce((sum: number, t: any) => sum + t.amount, 0);
      bookingCount += statement.transactions.length;
    }
    res.json({ success: true, data: { totalInflow, totalOutflow, netCashflow: totalInflow - totalOutflow, bookingCount, revenuePerBooking: bookingCount > 0 ? totalInflow / bookingCount : 0, avgTransactionAmount: bookingCount > 0 ? (totalInflow + totalOutflow) / bookingCount : 0 } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get monthly breakdowns for charts
app.get('/api/monthly', (req: Request, res: Response) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  try {
    const monthlyMap = new Map();
    for (const file of fs.readdirSync(uploadsDir).filter(f => f.endsWith('.json'))) {
      const statement = JSON.parse(fs.readFileSync(path.join(uploadsDir, file), 'utf-8'));
      const inflows = statement.transactions.filter((t: any) => t.categoryType === 'inflow');
      const outflows = statement.transactions.filter((t: any) => t.categoryType === 'outflow');
      monthlyMap.set(statement.month, {
        month: statement.month, totalInflow: inflows.reduce((sum: number, t: any) => sum + t.amount, 0),
        totalOutflow: outflows.reduce((sum: number, t: any) => sum + t.amount, 0),
        netCashflow: (inflows.reduce((sum: number, t: any) => sum + t.amount, 0) - outflows.reduce((sum: number, t: any) => sum + t.amount, 0)),
        bookingCount: statement.transactions.length,
        inflowBreakdown: Object.fromEntries(inflows.reduce((acc: any, t: any) => { if (!acc[t.categoryId]) acc[t.categoryId] = 0; acc[t.categoryId] += t.amount; return acc; }, {} as any)),
        outflowBreakdown: Object.fromEntries(outflows.reduce((acc: any, t: any) => { if (!acc[t.categoryId]) acc[t.categoryId] = 0; acc[t.categoryId] += t.amount; return acc; }, {} as any)),
      });
    }
    res.json({ success: true, data: Array.from(monthlyMap.values()) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export all transactions to CSV
app.get('/api/export/csv', (req: Request, res: Response) => {
  try {
    const allTransactions: any[] = [];
    for (const file of fs.readdirSync(path.join(__dirname, '../uploads')).filter(f => f.endsWith('.json'))) {
      allTransactions.push(...JSON.parse(fs.readFileSync(path.join(__dirname, '../uploads', file), 'utf-8')).transactions);
    }
    allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Type'];
    const csvContent = [headers.join(','), ...allTransactions.map(t => `${t.date.toISOString().split('T')[0]},${t.description},${t.categoryId},${t.amount},${t.categoryType}`)].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all category definitions
app.get('/api/categories', (req: Request, res: Response) => {
  res.json({ success: true, data: statementProcessor.getCategories() });
});

// Serve static files and handle SPA routing
app.use(express.static(path.join(__dirname, '../../public')));
app.get('*', (req: Request, res: Response) => {
  const indexPath = path.join(__dirname, '../../public/index.html');
  res.sendFile(indexPath);
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log('API available at http://localhost:' + PORT + '/api');
});

export default app;
// Get transactions from a specific statement
app.get('/api/statements/:id/transactions', (req: Request, res: Response) => {
  try {
    const filePath = path.join(__dirname, '../uploads', req.params.id + '.json');
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Statement not found' });
    res.json({ success: true, data: JSON.parse(fs.readFileSync(filePath, 'utf-8')).transactions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new transaction manually
app.post('/api/transactions', (req: Request, res: Response) => {
  const transaction = req.body;
  if (!transaction.amount || !transaction.date || !transaction.categoryId) 
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  res.json({ success: true, data: { id: 'manual-' + Date.now(), ...transaction } });
});

// Delete transaction
app.delete('/api/transactions/:id', (req: Request, res: Response) => {
  res.json({ success: true, data: {} });
});