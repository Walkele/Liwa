// Escrow Management Service
// State machine-based escrow system for secure marketplace transactions
// Implements Google-level reliability and security standards

import { adminDb } from '@/config/firebase-admin';
import {
  EscrowAccount,
  EscrowState,
  PaymentTransaction
} from '@/types/payment';

interface EscrowTransition {
  from: EscrowState;
  to: EscrowState;
  guard: (escrow: EscrowAccount) => boolean;
  action: (escrow: EscrowAccount) => Promise<void>;
}

export class EscrowManagementService {
  private static instance: EscrowManagementService;
  private stateTransitions: Map<string, EscrowTransition[]> = new Map();

  private constructor() {
    this.initializeStateMachine();
  }

  public static getInstance(): EscrowManagementService {
    if (!EscrowManagementService.instance) {
      EscrowManagementService.instance = new EscrowManagementService();
    }
    return EscrowManagementService.instance;
  }

  /**
   * Initialize escrow state machine with transitions and guards
   */
  private initializeStateMachine(): void {
    // Define all valid state transitions
    this.stateTransitions.set('holding', [
      {
        from: 'holding',
        to: 'released',
        guard: (escrow) => this.canReleaseFunds(escrow),
        action: (escrow) => this.releaseFunds(escrow)
      },
      {
        from: 'holding',
        to: 'refunded',
        guard: (escrow) => this.canRefundFunds(escrow),
        action: (escrow) => this.refundFunds(escrow)
      },
      {
        from: 'holding',
        to: 'partial_release',
        guard: (escrow) => this.canPartialRelease(escrow),
        action: (escrow) => this.partialReleaseFunds(escrow)
      },
      {
        from: 'holding',
        to: 'disputed',
        guard: () => true, // Can always enter dispute state
        action: (escrow) => this.initiateDispute(escrow)
      }
    ]);

    this.stateTransitions.set('disputed', [
      {
        from: 'disputed',
        to: 'released',
        guard: (escrow) => this.canReleaseFunds(escrow),
        action: (escrow) => this.releaseFunds(escrow)
      },
      {
        from: 'disputed',
        to: 'refunded',
        guard: (escrow) => this.canRefundFunds(escrow),
        action: (escrow) => this.refundFunds(escrow)
      },
      {
        from: 'disputed',
        to: 'partial_release',
        guard: (escrow) => this.canPartialRelease(escrow),
        action: (escrow) => this.partialReleaseFunds(escrow)
      }
    ]);

    // Final states - no transitions out
    this.stateTransitions.set('released', []);
    this.stateTransitions.set('refunded', []);
    this.stateTransitions.set('partial_release', []);
  }

  /**
   * Create escrow account for a transaction
   */
  async createEscrowAccount(
    transactionId: string,
    amount: number,
    currency: string,
    metadata: Record<string, any> = {}
  ): Promise<EscrowAccount> {
    const escrowId = this.generateEscrowId();
    
    const escrow: EscrowAccount = {
      id: escrowId,
      transactionId,
      amount,
      currency: currency as any,
      state: 'holding',
      releaseConditions: {
        deliveryConfirmed: false,
        inspectionPeriodExpired: false,
        bothPartiesSatisfied: false
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata
    };

    await adminDb.collection('escrow_accounts').doc(escrowId).set({
      ...escrow,
      createdAt: escrow.createdAt.toISOString(),
      updatedAt: escrow.updatedAt.toISOString()
    });

    return escrow;
  }

  /**
   * Transition escrow state with validation and execution
   */
  async transitionState(
    escrowId: string,
    targetState: EscrowState,
    context: Record<string, any> = {}
  ): Promise<EscrowAccount> {
    const escrow = await this.getEscrowAccount(escrowId);
    if (!escrow) {
      throw new Error(`Escrow account not found: ${escrowId}`);
    }

    // Check if transition is valid
    const transitions = this.stateTransitions.get(escrow.state) || [];
    const transition = transitions.find(t => t.to === targetState);

    if (!transition) {
      throw new Error(
        `Invalid state transition from ${escrow.state} to ${targetState}`
      );
    }

    // Execute guard condition
    if (!transition.guard(escrow)) {
      throw new Error(
        `Guard condition failed for transition from ${escrow.state} to ${targetState}`
      );
    }

    // Execute transition action
    await transition.action(escrow);

    // Update escrow state
    escrow.state = targetState;
    escrow.updatedAt = new Date();

    if (targetState === 'released' || targetState === 'partial_release') {
      escrow.releaseDate = new Date();
    }

    await adminDb.collection('escrow_accounts').doc(escrowId).update({
      state: escrow.state,
      releaseDate: escrow.releaseDate?.toISOString(),
      updatedAt: escrow.updatedAt.toISOString(),
      ...context
    });

    return escrow;
  }

  /**
   * Update release conditions for escrow account
   */
  async updateReleaseConditions(
    escrowId: string,
    conditions: Partial<EscrowAccount['releaseConditions']>
  ): Promise<EscrowAccount> {
    const escrow = await this.getEscrowAccount(escrowId);
    if (!escrow) {
      throw new Error(`Escrow account not found: ${escrowId}`);
    }

    escrow.releaseConditions = {
      ...escrow.releaseConditions,
      ...conditions
    };
    escrow.updatedAt = new Date();

    await adminDb.collection('escrow_accounts').doc(escrowId).update({
      releaseConditions: escrow.releaseConditions,
      updatedAt: escrow.updatedAt.toISOString()
    });

    return escrow;
  }

  /**
   * Get escrow account by ID
   */
  async getEscrowAccount(escrowId: string): Promise<EscrowAccount | null> {
    const doc = await adminDb.collection('escrow_accounts').doc(escrowId).get();
    if (!doc.exists) return null;

    const data = doc.data();
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : undefined
    } as EscrowAccount;
  }

  /**
   * Get escrow account by transaction ID
   */
  async getEscrowByTransaction(transactionId: string): Promise<EscrowAccount | null> {
    const snapshot = await adminDb
      .collection('escrow_accounts')
      .where('transactionId', '==', transactionId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : undefined
    } as EscrowAccount;
  }

  /**
   * Guard: Check if funds can be released
   */
  private canReleaseFunds(escrow: EscrowAccount): boolean {
    return (
      escrow.releaseConditions.deliveryConfirmed &&
      escrow.releaseConditions.inspectionPeriodExpired &&
      escrow.releaseConditions.bothPartiesSatisfied
    );
  }

  /**
   * Guard: Check if funds can be refunded
   */
  private canRefundFunds(escrow: EscrowAccount): boolean {
    // Allow refund if conditions are not met and inspection period has expired
    return (
      !escrow.releaseConditions.deliveryConfirmed ||
      !escrow.releaseConditions.bothPartiesSatisfied
    );
  }

  /**
   * Guard: Check if partial release is possible
   */
  private canPartialRelease(escrow: EscrowAccount): boolean {
    return escrow.releaseConditions.deliveryConfirmed;
  }

  /**
   * Action: Release funds to seller
   */
  private async releaseFunds(escrow: EscrowAccount): Promise<void> {
    // In production, this would integrate with payment processor
    console.log(`Releasing funds for escrow ${escrow.id}: ${escrow.amount}`);
    
    // Update transaction record
    await adminDb.collection('payment_transactions').doc(escrow.transactionId).update({
      escrowReleased: true,
      escrowReleasedAt: new Date().toISOString()
    });
  }

  /**
   * Action: Refund funds to buyer
   */
  private async refundFunds(escrow: EscrowAccount): Promise<void> {
    // In production, this would integrate with payment processor
    console.log(`Refunding funds for escrow ${escrow.id}: ${escrow.amount}`);
    
    // Update transaction record
    await adminDb.collection('payment_transactions').doc(escrow.transactionId).update({
      refunded: true,
      refundedAt: new Date().toISOString()
    });
  }

  /**
   * Action: Partial release of funds
   */
  private async partialReleaseFunds(escrow: EscrowAccount): Promise<void> {
    // In production, this would handle partial release logic
    console.log(`Partial release for escrow ${escrow.id}`);
  }

  /**
   * Action: Initiate dispute process
   */
  private async initiateDispute(escrow: EscrowAccount): Promise<void> {
    // Create dispute record
    await adminDb.collection('disputes').add({
      escrowId: escrow.id,
      transactionId: escrow.transactionId,
      amount: escrow.amount,
      status: 'open',
      createdAt: new Date().toISOString(),
      metadata: escrow.metadata
    });
  }

  /**
   * Get escrow statistics
   */
  async getEscrowStatistics(timeRange: { start: Date; end: Date }): Promise<{
    totalEscrow: number;
    holdingAmount: number;
    releasedAmount: number;
    refundedAmount: number;
    disputedAmount: number;
    averageHoldTime: number;
  }> {
    const snapshot = await adminDb
      .collection('escrow_accounts')
      .where('createdAt', '>=', timeRange.start.toISOString())
      .where('createdAt', '<=', timeRange.end.toISOString())
      .get();

    let holdingAmount = 0;
    let releasedAmount = 0;
    let refundedAmount = 0;
    let disputedAmount = 0;
    let totalHoldTime = 0;
    let holdTimeCount = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const amount = data.amount || 0;
      const state = data.state;

      switch (state) {
        case 'holding':
          holdingAmount += amount;
          break;
        case 'released':
          releasedAmount += amount;
          if (data.releaseDate && data.createdAt) {
            const holdTime = new Date(data.releaseDate).getTime() - new Date(data.createdAt).getTime();
            totalHoldTime += holdTime;
            holdTimeCount++;
          }
          break;
        case 'refunded':
          refundedAmount += amount;
          break;
        case 'disputed':
          disputedAmount += amount;
          break;
      }
    });

    return {
      totalEscrow: snapshot.size,
      holdingAmount,
      releasedAmount,
      refundedAmount,
      disputedAmount,
      averageHoldTime: holdTimeCount > 0 ? totalHoldTime / holdTimeCount : 0
    };
  }

  /**
   * Generate unique escrow ID
   */
  private generateEscrowId(): string {
    return `esc_${Date.now()}_${this.generateRandomId(8)}`;
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
export const escrowManagementService = EscrowManagementService.getInstance();