import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';

interface TradeFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  filter?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const {
        page = '1',
        limit: pageLimit = '20',
        search,
        status,
        type,
        filter
      } = req.query;

      const filters: TradeFilters = {
        page: parseInt(page as string),
        limit: parseInt(pageLimit as string),
        search: search as string,
        status: status as string,
        type: type as string,
        filter: filter as string
      };

      // Build query
      let tradesQuery: any = adminDb.collection('trades');

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        tradesQuery = tradesQuery.where('status', '==', filters.status);
      }

      if (filters.type && filters.type !== 'all') {
        tradesQuery = tradesQuery.where('type', '==', filters.type);
      }

      // Apply special filters
      if (filters.filter === 'active') {
        tradesQuery = tradesQuery.where('status', 'in', ['pending', 'accepted', 'in_progress']);
      } else if (filters.filter === 'completed') {
        tradesQuery = tradesQuery.where('status', '==', 'completed');
      } else if (filters.filter === 'disputed') {
        tradesQuery = tradesQuery.where('status', '==', 'disputed');
      }

      // Apply sorting
      tradesQuery = tradesQuery.orderBy('createdAt', 'desc');

      // Apply pagination
      if (filters.page && filters.page > 1) {
        const offset = (filters.page - 1) * (filters.limit || 20);
        tradesQuery = tradesQuery.offset(offset);
      }

      tradesQuery = tradesQuery.limit(filters.limit || 20);

      const snapshot = await tradesQuery.get();
      const trades: any[] = [];

      // Get additional information for each trade
      for (const docSnapshot of snapshot.docs) {
        const tradeData = docSnapshot.data();
        let itemTitle = 'Unknown Item';
        let itemImages: string[] = [];
        let sellerName = 'Unknown';
        let sellerEmail = 'unknown@example.com';
        let buyerName = 'Unknown';
        let buyerEmail = 'unknown@example.com';

        // Fetch item information
        if (tradeData.itemId) {
          try {
            const itemDoc = await adminDb.collection('items').doc(tradeData.itemId).get();
            if (itemDoc.exists) {
              const itemData = itemDoc.data();
              itemTitle = itemData?.title || 'Unknown Item';
              itemImages = itemData?.images || [];
            }
          } catch (error) {
            console.warn('Failed to fetch item data for trade:', docSnapshot.id);
          }
        }

        // Fetch seller information
        if (tradeData.sellerId) {
          try {
            const userDoc = await adminDb.collection('users').doc(tradeData.sellerId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              sellerName = userData?.displayName || userData?.name || 'Unknown';
              sellerEmail = userData?.email || 'unknown@example.com';
            }
          } catch (error) {
            console.warn('Failed to fetch seller data for trade:', docSnapshot.id);
          }
        }

        // Fetch buyer information
        if (tradeData.buyerId) {
          try {
            const userDoc = await adminDb.collection('users').doc(tradeData.buyerId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              buyerName = userData?.displayName || userData?.name || 'Unknown';
              buyerEmail = userData?.email || 'unknown@example.com';
            }
          } catch (error) {
            console.warn('Failed to fetch buyer data for trade:', docSnapshot.id);
          }
        }

        const trade = {
          id: docSnapshot.id,
          itemId: tradeData.itemId || '',
          itemTitle,
          itemImages,
          sellerId: tradeData.sellerId || '',
          sellerName,
          sellerEmail,
          buyerId: tradeData.buyerId || '',
          buyerName,
          buyerEmail,
          type: tradeData.type || 'trade',
          status: tradeData.status || 'pending',
          amount: tradeData.amount,
          offerDetails: tradeData.offerDetails || tradeData.description || 'No details provided',
          createdAt: tradeData.createdAt,
          updatedAt: tradeData.updatedAt,
          completedAt: tradeData.completedAt,
          disputeReason: tradeData.disputeReason,
          meetingLocation: tradeData.meetingLocation,
          tradeValue: tradeData.tradeValue || tradeData.amount || 0
        };

        // Apply search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const matchesSearch = 
            trade.itemTitle.toLowerCase().includes(searchLower) ||
            trade.sellerName.toLowerCase().includes(searchLower) ||
            trade.buyerName.toLowerCase().includes(searchLower) ||
            trade.offerDetails.toLowerCase().includes(searchLower);
          
          if (matchesSearch) {
            trades.push(trade);
          }
        } else {
          trades.push(trade);
        }
      }

      // Get total count for pagination
      const totalSnapshot = await adminDb.collection('trades').get();
      const total = totalSnapshot.size;

      const result = {
        trades,
        total,
        page: filters.page || 1,
        totalPages: Math.ceil(total / (filters.limit || 20))
      };

      res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching trades:', error);
      res.status(500).json({ 
        error: 'Failed to fetch trades',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}