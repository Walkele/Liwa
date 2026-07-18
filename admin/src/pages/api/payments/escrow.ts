// Escrow Management API
// Handles escrow account operations and state transitions

import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';
import { escrowManagementService } from '@/services/payment/EscrowManagementService';
import { EscrowState } from '@/types/payment';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetEscrow(req, res);
  } else if (req.method === 'POST') {
    return handleCreateEscrow(req, res);
  } else if (req.method === 'PUT') {
    return handleUpdateEscrow(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

/**
 * Get escrow accounts with filtering
 */
async function handleGetEscrow(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { transactionId, state, limit = '50', offset = '0' } = req.query;

    let query = adminDb.collection('escrow_accounts') as any;

    if (transactionId) {
      query = query.where('transactionId', '==', transactionId);
    }
    if (state) {
      query = query.where('state', '==', state);
    }

    query = query.orderBy('createdAt', 'desc');

    if (limit) {
      query = query.limit(parseInt(limit as string));
    }
    if (offset) {
      query = query.offset(parseInt(offset as string));
    }

    const snapshot = await query.get();
    const escrowAccounts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        releaseDate: data.releaseDate ? new Date(data.releaseDate) : undefined
      };
    });

    res.status(200).json({
      escrowAccounts,
      total: snapshot.size,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching escrow accounts:', error);
    res.status(500).json({
      error: 'Failed to fetch escrow accounts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Create new escrow account
 */
async function handleCreateEscrow(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { transactionId, amount, currency, metadata } = req.body;

    if (!transactionId || !amount || !currency) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['transactionId', 'amount', 'currency']
      });
    }

    const escrow = await escrowManagementService.createEscrowAccount(
      transactionId,
      amount,
      currency,
      metadata || {}
    );

    res.status(201).json(escrow);
  } catch (error) {
    console.error('Error creating escrow account:', error);
    res.status(500).json({
      error: 'Failed to create escrow account',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Update escrow account (state transitions, condition updates)
 */
async function handleUpdateEscrow(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { escrowId, action, targetState, conditions } = req.body;

    if (!escrowId) {
      return res.status(400).json({ error: 'Missing escrow ID' });
    }

    switch (action) {
      case 'transition_state':
        if (!targetState) {
          return res.status(400).json({ error: 'Missing target state' });
        }
        const updatedEscrow = await escrowManagementService.transitionState(
          escrowId,
          targetState as EscrowState,
          req.body.context || {}
        );
        return res.status(200).json(updatedEscrow);

      case 'update_conditions':
        if (!conditions) {
          return res.status(400).json({ error: 'Missing conditions' });
        }
        const escrowWithConditions = await escrowManagementService.updateReleaseConditions(
          escrowId,
          conditions
        );
        return res.status(200).json(escrowWithConditions);

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error updating escrow account:', error);
    res.status(500).json({
      error: 'Failed to update escrow account',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}