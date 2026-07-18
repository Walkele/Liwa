// Fee Management API
// Handles fee structure management and fee calculations

import { NextApiRequest, NextApiResponse } from 'next';
import { feeCalculationService } from '@/services/payment/FeeCalculationService';
import { FeeStructure, PaymentMethod } from '@/types/payment';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetFees(req, res);
  } else if (req.method === 'POST') {
    return handleCreateFee(req, res);
  } else if (req.method === 'PUT') {
    return handleUpdateFee(req, res);
  } else if (req.method === 'DELETE') {
    return handleDeleteFee(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

/**
 * Get all fee structures or calculate fee for a transaction
 */
async function handleGetFees(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { action, amount, paymentMethod, transactionType, userTier, category } = req.query;

    if (action === 'calculate') {
      // Calculate fee for a specific transaction
      if (!amount || !paymentMethod || !transactionType) {
        return res.status(400).json({
          error: 'Missing required parameters for fee calculation',
          required: ['amount', 'paymentMethod', 'transactionType']
        });
      }

      const result = await feeCalculationService.calculateFee({
        amount: parseFloat(amount as string),
        paymentMethod: paymentMethod as PaymentMethod,
        transactionType: transactionType as any,
        userTier: userTier as string,
        category: category as string
      });

      return res.status(200).json(result);
    } else {
      // Get all fee structures
      const feeStructures = await feeCalculationService.getAllFeeStructures();
      return res.status(200).json({ feeStructures });
    }
  } catch (error) {
    console.error('Error in fee operation:', error);
    res.status(500).json({
      error: 'Failed to perform fee operation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Create new fee structure
 */
async function handleCreateFee(req: NextApiRequest, res: NextApiResponse) {
  try {
    const feeData = req.body;

    // Validate required fields
    if (!feeData.name || !feeData.feeType || !feeData.feeAmount || !feeData.appliesTo) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'feeType', 'feeAmount', 'appliesTo']
      });
    }

    const feeStructure = await feeCalculationService.upsertFeeStructure({
      ...feeData,
      isActive: feeData.isActive !== undefined ? feeData.isActive : true
    });

    res.status(201).json(feeStructure);
  } catch (error) {
    console.error('Error creating fee structure:', error);
    res.status(500).json({
      error: 'Failed to create fee structure',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Update existing fee structure
 */
async function handleUpdateFee(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const feeData = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing fee structure ID' });
    }

    const feeStructure = await feeCalculationService.upsertFeeStructure({
      id,
      ...feeData
    });

    res.status(200).json(feeStructure);
  } catch (error) {
    console.error('Error updating fee structure:', error);
    res.status(500).json({
      error: 'Failed to update fee structure',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Delete fee structure
 */
async function handleDeleteFee(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing fee structure ID' });
    }

    await feeCalculationService.deleteFeeStructure(id);

    res.status(200).json({ success: true, message: 'Fee structure deleted successfully' });
  } catch (error) {
    console.error('Error deleting fee structure:', error);
    res.status(500).json({
      error: 'Failed to delete fee structure',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}