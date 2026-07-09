import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const [itemsSnapshot, tradesSnapshot, reportsSnapshot] = await Promise.all([
        adminDb.collection('items').where('userId', '==', userId).get(),
        adminDb.collection('trades').where('sellerId', '==', userId).get(),
        adminDb.collection('reports').where('reportedId', '==', userId).get(),
      ]);

      const totalItems = itemsSnapshot.size;
      const activeItems = itemsSnapshot.docs.filter(doc => doc.data().status === 'active').length;
      
      const totalTrades = tradesSnapshot.size;
      const completedTrades = tradesSnapshot.docs.filter(doc => doc.data().status === 'completed').length;
      const successRate = totalTrades > 0 ? (completedTrades / totalTrades) * 100 : 0;

      // Calculate average rating
      const ratingsData = tradesSnapshot.docs
        .map(doc => doc.data().rating?.sellerRating)
        .filter(rating => rating !== undefined);
      
      const averageRating = ratingsData.length > 0 
        ? ratingsData.reduce((sum, rating) => sum + rating, 0) / ratingsData.length 
        : 0;

      const reportCount = reportsSnapshot.size;

      const stats = {
        totalItems,
        activeItems,
        totalTrades,
        completedTrades,
        successRate,
        averageRating,
        reportCount,
      };

      res.status(200).json(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch user statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}