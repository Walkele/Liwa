// Fee Calculation Service
// Configurable fee engine with rule-based calculations
// Supports complex fee structures and business logic

import { adminDb } from '@/config/firebase-admin';
import { FeeStructure, PaymentMethod } from '@/types/payment';

export class FeeCalculationService {
  private static instance: FeeCalculationService;
  private feeCache: Map<string, FeeStructure[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): FeeCalculationService {
    if (!FeeCalculationService.instance) {
      FeeCalculationService.instance = new FeeCalculationService();
    }
    return FeeCalculationService.instance;
  }

  /**
   * Calculate fee for a transaction based on applicable rules
   */
  async calculateFee(params: {
    amount: number;
    paymentMethod: PaymentMethod;
    transactionType: 'payment' | 'withdrawal' | 'listing' | 'premium';
    userTier?: string;
    category?: string;
    currency?: string;
  }): Promise<{ feeAmount: number; feeBreakdown: FeeStructure[] }> {
    const applicableFees = await this.getApplicableFees(params);
    
    let totalFee = 0;
    const feeBreakdown: FeeStructure[] = [];

    for (const feeStructure of applicableFees) {
      const calculatedFee = this.calculateFeeForStructure(params.amount, feeStructure);
      totalFee += calculatedFee;
      feeBreakdown.push(feeStructure);
    }

    return {
      feeAmount: totalFee,
      feeBreakdown
    };
  }

  /**
   * Get applicable fee structures based on transaction parameters
   */
  private async getApplicableFees(params: {
    amount: number;
    paymentMethod: PaymentMethod;
    transactionType: 'payment' | 'withdrawal' | 'listing' | 'premium';
    userTier?: string;
    category?: string;
  }): Promise<FeeStructure[]> {
    const cacheKey = this.generateCacheKey(params);
    
    // Check cache
    if (this.feeCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return this.feeCache.get(cacheKey)!;
    }

    // Fetch from database
    const snapshot = await adminDb
      .collection('fee_structures')
      .where('appliesTo', '==', params.transactionType)
      .where('isActive', '==', true)
      .get();

    let feeStructures = snapshot.docs.map(doc => doc.data() as FeeStructure);

    // Filter by conditions
    feeStructures = feeStructures.filter(fee => {
      // Check amount range
      if (fee.conditions.minAmount && params.amount < fee.conditions.minAmount) {
        return false;
      }
      if (fee.conditions.maxAmount && params.amount > fee.conditions.maxAmount) {
        return false;
      }

      // Check user tier
      if (fee.conditions.userTier && params.userTier !== fee.conditions.userTier) {
        return false;
      }

      // Check category
      if (fee.conditions.category && params.category !== fee.conditions.category) {
        return false;
      }

      return true;
    });

    // Sort by priority (feeAmount ascending - lower fees have priority)
    feeStructures.sort((a, b) => a.feeAmount - b.feeAmount);

    // Cache the result
    this.feeCache.set(cacheKey, feeStructures);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

    return feeStructures;
  }

  /**
   * Calculate fee for a specific fee structure
   */
  private calculateFeeForStructure(amount: number, feeStructure: FeeStructure): number {
    let fee = 0;

    switch (feeStructure.feeType) {
      case 'percentage':
        fee = amount * (feeStructure.feeAmount / 100);
        break;
      case 'fixed':
        fee = feeStructure.feeAmount;
        break;
      case 'tiered':
        fee = this.calculateTieredFee(amount, feeStructure);
        break;
    }

    // Apply min/max constraints
    if (feeStructure.feeMin && fee < feeStructure.feeMin) {
      fee = feeStructure.feeMin;
    }
    if (feeStructure.feeMax && fee > feeStructure.feeMax) {
      fee = feeStructure.feeMax;
    }

    return fee;
  }

  /**
   * Calculate tiered fee (progressive fee structure)
   */
  private calculateTieredFee(amount: number, feeStructure: FeeStructure): number {
    // This is a simplified tiered calculation
    // In production, this would support complex tier structures
    const tiers = [
      { min: 0, max: 100, rate: 0.05 },
      { min: 100, max: 1000, rate: 0.03 },
      { min: 1000, max: Infinity, rate: 0.02 }
    ];

    let totalFee = 0;
    let remainingAmount = amount;

    for (const tier of tiers) {
      if (remainingAmount <= 0) break;

      const tierAmount = Math.min(remainingAmount, tier.max - tier.min);
      if (tierAmount > 0) {
        totalFee += tierAmount * tier.rate;
        remainingAmount -= tierAmount;
      }
    }

    return totalFee;
  }

  /**
   * Create or update fee structure
   */
  async upsertFeeStructure(feeStructure: Omit<FeeStructure, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeeStructure> {
    const feeId = feeStructure.id || this.generateFeeId();
    const now = new Date();

    const completeFeeStructure: FeeStructure = {
      id: feeId,
      ...feeStructure,
      createdAt: now,
      updatedAt: now
    };

    await adminDb.collection('fee_structures').doc(feeId).set({
      ...completeFeeStructure,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }, { merge: true });

    // Invalidate cache
    this.invalidateCache();

    return completeFeeStructure;
  }

  /**
   * Get all fee structures
   */
  async getAllFeeStructures(): Promise<FeeStructure[]> {
    const snapshot = await adminDb.collection('fee_structures').get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      } as FeeStructure;
    });
  }

  /**
   * Get fee structure by ID
   */
  async getFeeStructure(feeId: string): Promise<FeeStructure | null> {
    const doc = await adminDb.collection('fee_structures').doc(feeId).get();
    if (!doc.exists) return null;

    const data = doc.data();
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    } as FeeStructure;
  }

  /**
   * Delete fee structure
   */
  async deleteFeeStructure(feeId: string): Promise<void> {
    await adminDb.collection('fee_structures').doc(feeId).delete();
    this.invalidateCache();
  }

  /**
   * Get fee analytics
   */
  async getFeeAnalytics(timeRange: { start: Date; end: Date }): Promise<{
    totalFeesCollected: number;
    feeByType: Record<string, number>;
    feeByPaymentMethod: Record<PaymentMethod, number>;
    averageFeeRate: number;
    feeTrends: Array<{
      date: string;
      amount: number;
      transactions: number;
    }>;
  }> {
    // In production, this would query actual transaction data
    // For now, return mock data
    
    return {
      totalFeesCollected: 45678.90,
      feeByType: {
        payment: 38456.78,
        withdrawal: 5432.12,
        listing: 1234.56,
        premium: 555.44
      },
      feeByPaymentMethod: {
        card: 32456.78,
        bank_transfer: 8765.43,
        wallet: 3456.79,
        cash: 0,
        other: 1000.00
      },
      averageFeeRate: 2.9,
      feeTrends: this.generateMockFeeTrends(timeRange)
    };
  }

  /**
   * Generate mock fee trends for analytics
   */
  private generateMockFeeTrends(timeRange: { start: Date; end: Date }): Array<{
    date: string;
    amount: number;
    transactions: number;
  }> {
    const trends = [];
    const currentDate = new Date(timeRange.start);
    
    while (currentDate <= timeRange.end) {
      trends.push({
        date: currentDate.toISOString().split('T')[0],
        amount: Math.random() * 2000 + 500,
        transactions: Math.floor(Math.random() * 100) + 20
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trends;
  }

  /**
   * Invalidate fee cache
   */
  private invalidateCache(): void {
    this.feeCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * Generate cache key from parameters
   */
  private generateCacheKey(params: {
    amount: number;
    paymentMethod: PaymentMethod;
    transactionType: string;
    userTier?: string;
    category?: string;
  }): string {
    return `${params.transactionType}_${params.paymentMethod}_${params.amount}_${params.userTier || 'default'}_${params.category || 'default'}`;
  }

  /**
   * Generate unique fee ID
   */
  private generateFeeId(): string {
    return `fee_${Date.now()}_${this.generateRandomId(8)}`;
  }

  /**
   * Generate random ID string
   */
  private generateRandomId(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Export singleton instance
export const feeCalculationService = FeeCalculationService.getInstance();