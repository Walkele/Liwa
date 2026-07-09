import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';

interface ItemFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const {
        page = '1',
        limit: pageLimit = '20',
        search,
        status,
        category,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filters: ItemFilters = {
        page: parseInt(page as string),
        limit: parseInt(pageLimit as string),
        search: search as string,
        status: status as string,
        category: category as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      // Build query
      let itemsQuery: any = adminDb.collection('items');

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        itemsQuery = itemsQuery.where('status', '==', filters.status);
      }

      if (filters.category && filters.category !== 'all') {
        itemsQuery = itemsQuery.where('category', '==', filters.category);
      }

      // Apply sorting
      itemsQuery = itemsQuery.orderBy(filters.sortBy || 'createdAt', filters.sortOrder || 'desc');

      // Apply pagination
      if (filters.page && filters.page > 1) {
        const offset = (filters.page - 1) * (filters.limit || 20);
        itemsQuery = itemsQuery.offset(offset);
      }

      itemsQuery = itemsQuery.limit(filters.limit || 20);

      const snapshot = await itemsQuery.get();
      const items: any[] = [];

      // Get user information for each item
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
            console.warn('Failed to fetch user data for item:', docSnapshot.id);
          }
        }

        const item = {
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
        };

        // Apply search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const matchesSearch = 
            item.title.toLowerCase().includes(searchLower) ||
            item.description.toLowerCase().includes(searchLower) ||
            item.category.toLowerCase().includes(searchLower) ||
            item.userName.toLowerCase().includes(searchLower) ||
            item.userEmail.toLowerCase().includes(searchLower);
          
          if (matchesSearch) {
            items.push(item);
          }
        } else {
          items.push(item);
        }
      }

      // Get total count for pagination
      const totalSnapshot = await adminDb.collection('items').get();
      const total = totalSnapshot.size;

      const result = {
        items,
        total,
        page: filters.page || 1,
        totalPages: Math.ceil(total / (filters.limit || 20))
      };

      res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching items:', error);
      res.status(500).json({ 
        error: 'Failed to fetch items',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}