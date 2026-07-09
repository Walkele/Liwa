import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const { limit = '50' } = req.query;
      const activityLimit = parseInt(limit as string);
      
      const activities: any[] = [];

      // Get recent items
      const itemsSnapshot = await adminDb
        .collection('items')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(activityLimit)
        .get();

      itemsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        activities.push({
          type: 'item_created',
          timestamp: data.createdAt?.toDate?.() || data.createdAt,
          data: {
            itemId: doc.id,
            title: data.title,
            status: data.status,
          },
        });
      });

      // Get recent trades
      const tradesSnapshot = await adminDb
        .collection('trades')
        .where('sellerId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(activityLimit)
        .get();

      tradesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        activities.push({
          type: 'trade_initiated',
          timestamp: data.createdAt?.toDate?.() || data.createdAt,
          data: {
            tradeId: doc.id,
            status: data.status,
            type: data.type,
          },
        });
      });

      // Sort by timestamp
      activities.sort((a, b) => {
        const aTime = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
        const bTime = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
        return bTime.getTime() - aTime.getTime();
      });

      const limitedActivities = activities.slice(0, activityLimit);

      res.status(200).json(limitedActivities);
    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({ 
        error: 'Failed to fetch user activity',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}