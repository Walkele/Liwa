import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const snapshot = await adminDb.collection('items')
        .where('reportCount', '>', 0)
        .orderBy('reportCount', 'desc')
        .get();

      const reportedItems: any[] = [];

      for (const docSnapshot of snapshot.docs) {
        const itemData = docSnapshot.data();
        let userName = 'Unknown';
        let userEmail = 'unknown@example.com';

        // Fetch user information
        if (itemData.userId) {
          try {
            const userDoc = await adminDb.collection('users').doc(itemData.userId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              userName = userData?.displayName || userData?.name || 'Unknown';
              userEmail = userData?.email || 'unknown@example.com';
            }
          } catch (error) {
            console.warn('Failed to fetch user data for reported item:', docSnapshot.id);
          }
        }

        reportedItems.push({
          id: docSnapshot.id,
          title: itemData.title || 'Untitled',
          description: itemData.description || '',
          category: itemData.category || 'other',
          condition: itemData.condition || 'unknown',
          images: itemData.images || [],
          userId: itemData.userId || '',
          userName,
          userEmail,
          status: itemData.status || 'active',
          createdAt: itemData.createdAt,
          updatedAt: itemData.updatedAt,
          reportCount: itemData.reportCount || 0,
          viewCount: itemData.viewCount || 0,
          offerCount: itemData.offerCount || 0,
          location: itemData.location,
          tags: itemData.tags || []
        });
      }

      res.status(200).json(reportedItems);
    } catch (error) {
      console.error('Error fetching reported items:', error);
      res.status(500).json({ 
        error: 'Failed to fetch reported items',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}