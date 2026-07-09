import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { itemId } = req.query;

  if (!itemId || typeof itemId !== 'string') {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const itemDoc = await adminDb.collection('items').doc(itemId).get();
      
      if (!itemDoc.exists) {
        return res.status(404).json({ error: 'Item not found' });
      }

      const itemData = itemDoc.data();
      let userName = 'Unknown';
      let userEmail = 'unknown@example.com';

      // Fetch user information
      if (itemData?.userId) {
        try {
          const userDoc = await adminDb.collection('users').doc(itemData.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userName = userData?.displayName || userData?.name || 'Unknown';
            userEmail = userData?.email || 'unknown@example.com';
          }
        } catch (error) {
          console.warn('Failed to fetch user data for item:', itemId);
        }
      }

      const item = {
        id: itemDoc.id,
        title: itemData?.title || 'Untitled',
        description: itemData?.description || '',
        category: itemData?.category || 'other',
        condition: itemData?.condition || 'unknown',
        images: itemData?.images || [],
        userId: itemData?.userId || '',
        userName,
        userEmail,
        status: itemData?.status || 'active',
        createdAt: itemData?.createdAt,
        updatedAt: itemData?.updatedAt,
        reportCount: itemData?.reportCount || 0,
        viewCount: itemData?.viewCount || 0,
        offerCount: itemData?.offerCount || 0,
        location: itemData?.location,
        tags: itemData?.tags || []
      };

      res.status(200).json(item);
    } catch (error) {
      console.error('Error fetching item:', error);
      res.status(500).json({ 
        error: 'Failed to fetch item',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const itemRef = adminDb.collection('items').doc(itemId);
      
      // First, get the item to log the deletion
      const itemDoc = await itemRef.get();
      if (itemDoc.exists) {
        const itemData = itemDoc.data();
        console.log(`Deleting item: ${itemData?.title} (${itemId})`);
      }

      // Delete the item
      await itemRef.delete();
      
      res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
      console.error('Error deleting item:', error);
      res.status(500).json({ 
        error: 'Failed to delete item',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const itemRef = adminDb.collection('items').doc(itemId);
      
      await itemRef.update({
        status,
        updatedAt: FieldValue.serverTimestamp()
      });

      res.status(200).json({ message: 'Item status updated successfully' });
    } catch (error) {
      console.error('Error updating item status:', error);
      res.status(500).json({ 
        error: 'Failed to update item status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'DELETE', 'PATCH']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}