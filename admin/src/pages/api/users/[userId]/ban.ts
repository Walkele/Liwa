import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (req.method === 'POST') {
    try {
      const { reason, bannedBy = 'admin' } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Ban reason is required' });
      }

      const batch = adminDb.batch();

      // Update user document
      const userRef = adminDb.collection('users').doc(userId);
      batch.update(userRef, {
        isBanned: true,
        isActive: false,
        banReason: reason,
        bannedBy,
        bannedAt: FieldValue.serverTimestamp(),
      });

      // Archive all active items
      const itemsSnapshot = await adminDb
        .collection('items')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .get();

      itemsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'archived',
          archivedReason: 'User banned',
          archivedAt: FieldValue.serverTimestamp(),
        });
      });

      // Cancel all pending trades
      const tradesSnapshot = await adminDb
        .collection('trades')
        .where('sellerId', '==', userId)
        .where('status', 'in', ['pending', 'accepted'])
        .get();

      tradesSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'cancelled',
          cancelledReason: 'User banned',
          cancelledAt: FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();

      // Log admin action
      await adminDb.collection('admin_logs').add({
        action: 'ban_user',
        targetId: userId,
        performedBy: bannedBy,
        details: { reason },
        timestamp: FieldValue.serverTimestamp(),
      });

      console.log(`User ${userId} banned: ${reason}`);
      res.status(200).json({ message: 'User banned successfully' });
    } catch (error) {
      console.error('Error banning user:', error);
      res.status(500).json({ 
        error: 'Failed to ban user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { unbannedBy = 'admin' } = req.body;

      // Update user document
      await adminDb.collection('users').doc(userId).update({
        isBanned: false,
        isActive: true,
        unbannedBy,
        unbannedAt: FieldValue.serverTimestamp(),
        banReason: FieldValue.delete(),
        bannedBy: FieldValue.delete(),
        bannedAt: FieldValue.delete(),
      });

      // Log admin action
      await adminDb.collection('admin_logs').add({
        action: 'unban_user',
        targetId: userId,
        performedBy: unbannedBy,
        timestamp: FieldValue.serverTimestamp(),
      });

      console.log(`User ${userId} unbanned`);
      res.status(200).json({ message: 'User unbanned successfully' });
    } catch (error) {
      console.error('Error unbanning user:', error);
      res.status(500).json({ 
        error: 'Failed to unban user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}