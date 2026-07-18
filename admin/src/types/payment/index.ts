// Payment System Type Definitions
// Based on Google-level engineering standards for payment processing

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed'
  | 'chargeback';

export type PaymentMethod = 
  | 'card'
  | 'bank_transfer'
  | 'wallet'
  | 'cash'
  | 'other';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';

export type EscrowState = 
  | 'holding'
  | 'released'
  | 'refunded'
  | 'partial_release'
  | 'disputed';

export type RefundStatus = 
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type TransactionType = 
  | 'payment'
  | 'refund'
  | 'chargeback'
  | 'adjustment'
  | 'fee';

export interface PaymentTransaction {
  id: string;
  userId: string;
  tradeId?: string;
  itemId?: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentMethodDetails: {
    cardLast4?: string;
    cardBrand?: string;
    bankName?: string;
    walletType?: string;
  };
  description: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  failedReason?: string;
  feeAmount: number;
  netAmount: number;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
}

export interface EscrowAccount {
  id: string;
  transactionId: string;
  amount: number;
  currency: Currency;
  state: EscrowState;
  releaseConditions: {
    deliveryConfirmed: boolean;
    inspectionPeriodExpired: boolean;
    bothPartiesSatisfied: boolean;
  };
  releaseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface RefundRequest {
  id: string;
  transactionId: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  requestedBy: string;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  rejectionReason?: string;
  metadata: Record<string, any>;
}

export interface FeeStructure {
  id: string;
  name: string;
  feeType: 'percentage' | 'fixed' | 'tiered';
  feeAmount: number;
  feeMin?: number;
  feeMax?: number;
  appliesTo: 'payment' | 'withdrawal' | 'listing' | 'premium';
  conditions: {
    minAmount?: number;
    maxAmount?: number;
    userTier?: string;
    category?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenueMetrics {
  totalRevenue: number;
  netRevenue: number;
  grossRevenue: number;
  refundAmount: number;
  chargebackAmount: number;
  feeRevenue: number;
  transactionCount: number;
  successRate: number;
  averageTransactionValue: number;
  currency: Currency;
  period: {
    start: Date;
    end: Date;
  };
}

export interface PaymentAnalytics {
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    transactions: number;
    successRate: number;
  }>;
  paymentMethodBreakdown: Array<{
    method: PaymentMethod;
    amount: number;
    percentage: number;
    transactions: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  geographicBreakdown: Array<{
    region: string;
    revenue: number;
    percentage: number;
  }>;
  trends: {
    revenueGrowth: number;
    transactionGrowth: number;
    successRateChange: number;
  };
}

export interface ReconciliationReport {
  id: string;
  period: {
    start: Date;
    end: Date;
  };
  stripeBalance: number;
  internalBalance: number;
  variance: number;
  varianceReason: string;
  transactions: Array<{
    transactionId: string;
    stripeAmount: number;
    internalAmount: number;
    variance: number;
    status: 'matched' | 'unmatched' | 'discrepancy';
  }>;
  generatedAt: Date;
  generatedBy: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
  livemode: boolean;
  apiVersion: string;
  requestId: string;
}

export interface PaymentProcessingError {
  code: string;
  message: string;
  type: 'card_error' | 'validation_error' | 'api_error' | 'authentication_error' | 'rate_limit_error';
  param?: string;
  declineCode?: string;
}

export interface PaymentDashboardConfig {
  refreshInterval: number;
  alertThresholds: {
    lowSuccessRate: number;
    highFailureRate: number;
    unusualRefundRate: number;
  };
  displaySettings: {
    showRealTimeData: boolean;
    showPredictiveAnalytics: boolean;
    defaultTimeRange: '24h' | '7d' | '30d' | '90d';
  };
}

export interface BatchOperation {
  id: string;
  type: 'refund' | 'charge' | 'adjustment';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  performedBy: string;
  results: Array<{
    recordId: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}