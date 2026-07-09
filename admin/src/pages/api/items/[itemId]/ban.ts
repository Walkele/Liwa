import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { itemId } = req.query;

  if (!itemId || typeof itemId !== 'string') {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  if (req.method === 'POST') {
    try {
      const { reason = 'Banned by admin' } = req.body;
      
      const itemRef = adminDb.collection('items').doc(itemId);
      
      await itemRef.update({
        status: 'banned',
        banReason: reason,
        bannedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`Item ${itemId} banned: ${reason}`);
      res.status(200).json({ message: 'Item banned successfully' });
    } catch (error) {
      console.error('Error banning item:', error);
      res.status(500).json({ 
        error: 'Failed to ban item',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const itemRef = adminDb.collection('items').doc(itemId);
      
      await itemRef.update({
        status: 'active',
        banReason: FieldValue.delete(),
        bannedAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`Item ${itemId} unbanned`);
      res.status(200).json({ message: 'Item unbanned successfully' });
    } catch (error) {
      console.error('Error unbanning item:', error);
      res.status(500).json({ 
        error: 'Failed to unban item',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}