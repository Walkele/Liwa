import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const snapshot = await adminDb.collection('items').get();
      
      const stats = {
        total: 0,
        active: 0,
        archived: 0,
        reported: 0,
        banned: 0,
        categories: {} as Record<string, number>
      };

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        stats.total++;
        
        const status = data.status || 'active';
        if (status in stats) {
          (stats as any)[status]++;
        }

        const category = data.category || 'other';
        stats.categories[category] = (stats.categories[category] || 0) + 1;
      });

      res.status(200).json(stats);
    } catch (error) {
      console.error('Error fetching item stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch item statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}