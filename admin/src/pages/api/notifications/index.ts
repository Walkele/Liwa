import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const notificationsSnapshot = await adminDb
        .collection('admin_notifications')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const notifications = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        scheduledAt: doc.data().scheduledAt?.toDate?.() || doc.data().scheduledAt,
        sentAt: doc.data().sentAt?.toDate?.() || doc.data().sentAt
      }));

      res.status(200).json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ 
        error: 'Failed to fetch notifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}