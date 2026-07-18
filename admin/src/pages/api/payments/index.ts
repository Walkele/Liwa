// Payment API - Main endpoint for payment operations
// Handles transaction listing, creation, and bulk operations

import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';
import { paymentProcessingService } from '@/services/payment/PaymentProcessingService';
import { PaymentTransaction, PaymentStatus, PaymentMethod } from '@/types/payment';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetPayments(req, res);
  } else if (req.method === 'POST') {
    return handleCreatePayment(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

/**
 * Get payments with filtering and pagination
 */
async function handleGetPayments(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      userId,
      status,
      paymentMethod,
      startDate,
      endDate,
      limit = '50',
      offset = '0'
    } = req.query;

    const filters: any = {};

    if (userId) filters.userId = userId as string;
    if (status) filters.status = status as PaymentStatus;
    if (paymentMethod) filters.paymentMethod = paymentMethod as PaymentMethod;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    filters.limit = parseInt(limit as string);
    filters.offset = parseInt(offset as string);

    const result = await paymentProcessingService.getTransactions(filters);

    res.status(200).json({
      transactions: result.transactions,
      total: result.total,
      limit: filters.limit,
      offset: filters.offset
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      error: 'Failed to fetch payments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Create a new payment transaction
 */
async function handleCreatePayment(req: NextApiRequest, res: NextApiResponse) {
  try {
    const paymentData = req.body;

    // Validate required fields
    if (!paymentData.userId || !paymentData.amount || !paymentData.currency) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'amount', 'currency']
      });
    }

    // Process payment
    const transaction = await paymentProcessingService.processPayment({
      userId: paymentData.userId,
      tradeId: paymentData.tradeId,
      itemId: paymentData.itemId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      paymentMethod: paymentData.paymentMethod || 'card',
      paymentMethodDetails: paymentData.paymentMethodDetails || {},
      description: paymentData.description || 'Payment transaction',
      metadata: paymentData.metadata || {}
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      error: 'Failed to create payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}