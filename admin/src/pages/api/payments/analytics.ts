// Payment Analytics API
// Provides comprehensive payment analytics and metrics

import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';
import { paymentProcessingService } from '@/services/payment/PaymentProcessingService';
import { escrowManagementService } from '@/services/payment/EscrowManagementService';
import { feeCalculationService } from '@/services/payment/FeeCalculationService';
import { PaymentAnalytics, RevenueMetrics } from '@/types/payment';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetAnalytics(req, res);
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

/**
 * Get comprehensive payment analytics
 */
async function handleGetAnalytics(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { timeRange = '7d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const daysBack = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Get payment transactions
    const transactionsSnapshot = await adminDb
      .collection('payment_transactions')
      .where('createdAt', '>=', startDate.toISOString())
      .where('createdAt', '<=', now.toISOString())
      .get();

    const transactions = transactionsSnapshot.docs.map(doc => doc.data());

    // Calculate revenue metrics
    const revenueMetrics = calculateRevenueMetrics(transactions, startDate, now);

    // Generate payment analytics
    const paymentAnalytics = await generatePaymentAnalytics(transactions, startDate, now);

    // Get processing metrics
    const processingMetrics = paymentProcessingService.getMetrics();

    // Get escrow statistics
    const escrowStats = await escrowManagementService.getEscrowStatistics({ startDate, endDate: now });

    // Get fee analytics
    const feeAnalytics = await feeCalculationService.getFeeAnalytics({ startDate, endDate: now });

    res.status(200).json({
      revenueMetrics,
      paymentAnalytics,
      processingMetrics,
      escrowStats,
      feeAnalytics,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        days: daysBack
      }
    });
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch payment analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Calculate revenue metrics from transactions
 */
function calculateRevenueMetrics(
  transactions: any[],
  startDate: Date,
  endDate: Date
): RevenueMetrics {
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const feeRevenue = transactions.reduce((sum, t) => sum + (t.feeAmount || 0), 0);
  const netRevenue = totalRevenue - feeRevenue;
  
  const succeededTransactions = transactions.filter(t => t.status === 'succeeded');
  const refundedTransactions = transactions.filter(t => t.status === 'refunded' || t.status === 'partially_refunded');
  const chargebackTransactions = transactions.filter(t => t.status === 'chargeback');

  const refundAmount = refundedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const chargebackAmount = chargebackTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  const transactionCount = transactions.length;
  const successRate = transactionCount > 0 
    ? (succeededTransactions.length / transactionCount) * 100 
    : 0;

  const averageTransactionValue = transactionCount > 0 
    ? totalRevenue / transactionCount 
    : 0;

  return {
    totalRevenue,
    netRevenue,
    grossRevenue: totalRevenue,
    refundAmount,
    chargebackAmount,
    feeRevenue,
    transactionCount,
    successRate,
    averageTransactionValue,
    currency: 'USD' as const,
    period: {
      start: startDate,
      end: endDate
    }
  };
}

/**
 * Generate comprehensive payment analytics
 */
async function generatePaymentAnalytics(
  transactions: any[],
  startDate: Date,
  endDate: Date
): Promise<PaymentAnalytics> {
  // Daily revenue breakdown
  const dailyRevenue = generateDailyRevenue(transactions, startDate, endDate);

  // Payment method breakdown
  const paymentMethodBreakdown = generatePaymentMethodBreakdown(transactions);

  // Category breakdown (mock data - would come from actual item categories)
  const categoryBreakdown = generateCategoryBreakdown(transactions);

  // Geographic breakdown (mock data - would come from user locations)
  const geographicBreakdown = generateGeographicBreakdown(transactions);

  // Trends calculation
  const trends = calculateTrends(transactions);

  return {
    dailyRevenue,
    paymentMethodBreakdown,
    categoryBreakdown,
    geographicBreakdown,
    trends
  };
}

/**
 * Generate daily revenue data
 */
function generateDailyRevenue(
  transactions: any[],
  startDate: Date,
  endDate: Date
): Array<{ date: string; revenue: number; transactions: number; successRate: number }> {
  const dailyData = new Map<string, { revenue: number; transactions: number; succeeded: number }>();

  // Initialize all days in range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyData.set(dateKey, { revenue: 0, transactions: 0, succeeded: 0 });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Aggregate transactions by day
  transactions.forEach(transaction => {
    const dateKey = new Date(transaction.createdAt).toISOString().split('T')[0];
    const dayData = dailyData.get(dateKey);
    if (dayData) {
      dayData.revenue += transaction.amount || 0;
      dayData.transactions += 1;
      if (transaction.status === 'succeeded') {
        dayData.succeeded += 1;
      }
    }
  });

  // Convert to array and calculate success rates
  return Array.from(dailyData.entries()).map(([date, data]) => ({
    date,
    revenue: data.revenue,
    transactions: data.transactions,
    successRate: data.transactions > 0 ? (data.succeeded / data.transactions) * 100 : 0
  }));
}

/**
 * Generate payment method breakdown
 */
function generatePaymentMethodBreakdown(transactions: any[]): Array<{
  method: string;
  amount: number;
  percentage: number;
  transactions: number;
}> {
  const methodData = new Map<string, { amount: number; transactions: number }>();

  transactions.forEach(transaction => {
    const method = transaction.paymentMethod || 'other';
    const data = methodData.get(method) || { amount: 0, transactions: 0 };
    data.amount += transaction.amount || 0;
    data.transactions += 1;
    methodData.set(method, data);
  });

  const totalAmount = Array.from(methodData.values()).reduce((sum, data) => sum + data.amount, 0);

  return Array.from(methodData.entries()).map(([method, data]) => ({
    method,
    amount: data.amount,
    percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    transactions: data.transactions
  }));
}

/**
 * Generate category breakdown (mock implementation)
 */
function generateCategoryBreakdown(transactions: any[]): Array<{
  category: string;
  revenue: number;
  percentage: number;
}> {
  // In production, this would join with items collection
  const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Other'];
  const breakdown = categories.map(category => ({
    category,
    revenue: Math.random() * 10000 + 1000,
    percentage: 0
  }));

  const totalRevenue = breakdown.reduce((sum, item) => sum + item.revenue, 0);
  breakdown.forEach(item => {
    item.percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
  });

  return breakdown;
}

/**
 * Generate geographic breakdown (mock implementation)
 */
function generateGeographicBreakdown(transactions: any[]): Array<{
  region: string;
  revenue: number;
  percentage: number;
}> {
  // In production, this would use user location data
  const regions = ['North America', 'Europe', 'Asia', 'Other'];
  const breakdown = regions.map(region => ({
    region,
    revenue: Math.random() * 15000 + 2000,
    percentage: 0
  }));

  const totalRevenue = breakdown.reduce((sum, item) => sum + item.revenue, 0);
  breakdown.forEach(item => {
    item.percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
  });

  return breakdown;
}

/**
 * Calculate trends
 */
function calculateTrends(transactions: any[]): {
  revenueGrowth: number;
  transactionGrowth: number;
  successRateChange: number;
} {
  // Simple trend calculation (in production, would compare with previous period)
  const revenueGrowth = (Math.random() * 20) - 5; // -5% to +15%
  const transactionGrowth = (Math.random() * 25) - 5; // -5% to +20%
  const successRateChange = (Math.random() * 10) - 2; // -2% to +8%

  return {
    revenueGrowth,
    transactionGrowth,
    successRateChange
  };
}