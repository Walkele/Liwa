import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (req.method === 'PATCH') {
    try {
      const { trustScore, updatedBy } = req.body;
      
      if (typeof trustScore !== 'number' || trustScore < 0 || trustScore > 100) {
        return res.status(400).json({ error: 'Trust score must be a number between 0 and 100' });
      }

      const userRef = adminDb.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const oldScore = userDoc.data()?.trustScore || 0;

      await userRef.update({
        trustScore,
        trustScoreUpdatedAt: FieldValue.serverTimestamp(),
        trustScoreUpdatedBy: updatedBy || 'admin',
      });

      // Log admin action
      await adminDb.collection('admin_logs').add({
        action: 'update_trust_score',
        targetId: userId,
        performedBy: updatedBy || 'admin',
        details: { oldScore, newScore: trustScore },
        timestamp: FieldValue.serverTimestamp(),
      });

      console.log(`Trust score updated for user ${userId}: ${oldScore} -> ${trustScore}`);
      res.status(200).json({ message: 'Trust score updated successfully' });
    } catch (error) {
      console.error('Error updating trust score:', error);
      res.status(500).json({ 
        error: 'Failed to update trust score',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['PATCH']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}