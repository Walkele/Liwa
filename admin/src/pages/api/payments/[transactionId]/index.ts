// Individual Payment Transaction API
// Handles operations on specific payment transactions

import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';
import { paymentProcessingService } from '@/services/payment/PaymentProcessingService';
import { escrowManagementService } from '@/services/payment/EscrowManagementService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { transactionId } = req.query;

  if (!transactionId || typeof transactionId !== 'string') {
    return res.status(400).json({ error: 'Invalid transaction ID' });
  }

  if (req.method === 'GET') {
    return handleGetTransaction(transactionId, res);
  } else if (req.method === 'POST') {
    return handleTransactionAction(transactionId, req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

/**
 * Get transaction details
 */
async function handleGetTransaction(transactionId: string, res: NextApiResponse) {
  try {
    const transaction = await paymentProcessingService.getTransaction(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Get escrow information if available
    const escrow = await escrowManagementService.getEscrowByTransaction(transactionId);

    res.status(200).json({
      transaction,
      escrow: escrow || null
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      error: 'Failed to fetch transaction',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handle transaction actions (refund, cancel, etc.)
 */
async function handleTransactionAction(
  transactionId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { action } = req.body;

    switch (action) {
      case 'refund':
        return handleRefund(transactionId, req, res);
      case 'cancel':
        return handleCancel(transactionId, res);
      case 'create_escrow':
        return handleCreateEscrow(transactionId, req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error handling transaction action:', error);
    res.status(500).json({
      error: 'Failed to handle action',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handle refund action
 */
async function handleRefund(
  transactionId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { amount, reason } = req.body;

    const transaction = await paymentProcessingService.getTransaction(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'succeeded') {
      return res.status(400).json({ error: 'Can only refund succeeded transactions' });
    }

    // In production, this would integrate with actual refund processing
    // For now, update transaction status
    const refundAmount = amount || transaction.amount;
    
    // Create refund record
    await adminDb.collection('refunds').add({
      transactionId,
      amount: refundAmount,
      reason: reason || 'Refund requested',
      status: 'processing',
      createdAt: new Date().toISOString(),
      processedBy: req.body.processedBy || 'admin'
    });

    // Update transaction status
    const updatedStatus = refundAmount === transaction.amount ? 'refunded' : 'partially_refunded';
    await adminDb.collection('payment_transactions').doc(transactionId).update({
      status: updatedStatus,
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      refundAmount,
      status: updatedStatus
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      error: 'Failed to process refund',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handle cancel action
 */
async function handleCancel(transactionId: string, res: NextApiResponse) {
  try {
    const transaction = await paymentProcessingService.getTransaction(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'pending' && transaction.status !== 'processing') {
      return res.status(400).json({ error: 'Can only cancel pending or processing transactions' });
    }

    await adminDb.collection('payment_transactions').doc(transactionId).update({
      status: 'failed',
      failedReason: 'Cancelled by admin',
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Transaction cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling transaction:', error);
    res.status(500).json({
      error: 'Failed to cancel transaction',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handle create escrow action
 */
async function handleCreateEscrow(
  transactionId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const transaction = await paymentProcessingService.getTransaction(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'succeeded') {
      return res.status(400).json({ error: 'Can only create escrow for succeeded transactions' });
    }

    // Check if escrow already exists
    const existingEscrow = await escrowManagementService.getEscrowByTransaction(transactionId);
    if (existingEscrow) {
      return res.status(400).json({ error: 'Escrow already exists for this transaction' });
    }

    const escrow = await escrowManagementService.createEscrowAccount(
      transactionId,
      transaction.amount,
      transaction.currency,
      {
        userId: transaction.userId,
        tradeId: transaction.tradeId,
        itemId: transaction.itemId
      }
    );

    res.status(201).json({
      success: true,
      escrow
    });
  } catch (error) {
    console.error('Error creating escrow:', error);
    res.status(500).json({
      error: 'Failed to create escrow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}