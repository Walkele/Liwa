import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { title, message, type, target, scheduledAt, targetUsers } = req.body;

      if (!title || !message || !type || !target) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get target users based on selection
      let recipientCount = 0;
      let targetUserIds: string[] = [];

      if (target === 'all') {
        const usersSnapshot = await adminDb.collection('users').get();
        recipientCount = usersSnapshot.size;
        targetUserIds = usersSnapshot.docs.map(doc => doc.id);
      } else if (target === 'active') {
        const usersSnapshot = await adminDb
          .collection('users')
          .where('isActive', '==', true)
          .where('isBanned', '==', false)
          .get();
        recipientCount = usersSnapshot.size;
        targetUserIds = usersSnapshot.docs.map(doc => doc.id);
      } else if (target === 'inactive') {
        const usersSnapshot = await adminDb
          .collection('users')
          .where('isActive', '==', false)
          .get();
        recipientCount = usersSnapshot.size;
        targetUserIds = usersSnapshot.docs.map(doc => doc.id);
      } else if (target === 'specific' && targetUsers) {
        targetUserIds = targetUsers;
        recipientCount = targetUsers.length;
      }

      const notificationData = {
        title,
        message,
        type,
        target,
        targetUsers: targetUserIds,
        recipientCount,
        status: scheduledAt ? 'scheduled' : 'sent',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        sentAt: scheduledAt ? null : FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        createdBy: 'admin', // TODO: Get from auth context
        openRate: 0,
        clickRate: 0
      };

      // Save notification to database
      const notificationRef = await adminDb
        .collection('admin_notifications')
        .add(notificationData);

      // If not scheduled, send immediately
      if (!scheduledAt) {
        // Create individual notifications for each user
        const batch = adminDb.batch();
        
        for (const userId of targetUserIds.slice(0, 100)) { // Limit to prevent timeout
          const userNotificationRef = adminDb.collection('notifications').doc();
          batch.set(userNotificationRef, {
            userId,
            title,
            message,
            type: 'system',
            read: false,
            createdAt: FieldValue.serverTimestamp(),
            adminNotificationId: notificationRef.id
          });
        }

        await batch.commit();

        // TODO: Implement actual push notification, email, SMS sending here
        // This would integrate with services like Firebase Cloud Messaging, SendGrid, Twilio, etc.
        
        console.log(`Notification sent to ${recipientCount} users: ${title}`);
      } else {
        console.log(`Notification scheduled for ${scheduledAt}: ${title}`);
      }

      // Log admin action
      await adminDb.collection('admin_logs').add({
        action: 'send_notification',
        performedBy: 'admin',
        details: { 
          notificationId: notificationRef.id,
          title,
          type,
          target,
          recipientCount,
          scheduled: !!scheduledAt
        },
        timestamp: FieldValue.serverTimestamp(),
      });

      res.status(200).json({ 
        message: scheduledAt ? 'Notification scheduled successfully' : 'Notification sent successfully',
        notificationId: notificationRef.id,
        recipientCount
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).json({ 
        error: 'Failed to send notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}