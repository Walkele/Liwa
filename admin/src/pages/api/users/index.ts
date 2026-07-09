import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';

interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'banned' | 'all';
  sortBy?: 'createdAt' | 'lastLoginAt' | 'trustScore';
  sortOrder?: 'asc' | 'desc';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const {
        page = '1',
        limit: pageLimit = '20',
        search,
        status = 'all',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filters: UserFilters = {
        page: parseInt(page as string),
        limit: parseInt(pageLimit as string),
        search: search as string,
        status: status as 'active' | 'banned' | 'all',
        sortBy: sortBy as 'createdAt' | 'lastLoginAt' | 'trustScore',
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      // Simple query to get all users, then filter in memory
      // This avoids complex index requirements
      let usersQuery = adminDb.collection('users')
        .orderBy('createdAt', 'desc')
        .limit(100); // Get more than needed, then filter

      const snapshot = await usersQuery.get();
      const allUsers: any[] = [];

      // Process all users and calculate statistics
      for (const docSnapshot of snapshot.docs) {
        const userData = docSnapshot.data();
        
        // Get user statistics (simplified to avoid timeout)
        let totalTrades = 0;
        let completedTrades = 0;
        let successRate = 0;
        let averageRating = 0;
        let reportCount = 0;

        // Only fetch stats for first 20 users to avoid timeout
        if (allUsers.length < 20) {
          try {
            const [tradesSnapshot, reportsSnapshot] = await Promise.all([
              adminDb.collection('trades').where('sellerId', '==', docSnapshot.id).limit(50).get(),
              adminDb.collection('reports').where('reportedId', '==', docSnapshot.id).limit(10).get()
            ]);

            totalTrades = tradesSnapshot.size;
            completedTrades = tradesSnapshot.docs.filter(doc => doc.data().status === 'completed').length;
            successRate = totalTrades > 0 ? (completedTrades / totalTrades) * 100 : 0;

            // Calculate average rating
            const ratingsData = tradesSnapshot.docs
              .map(doc => doc.data().rating?.sellerRating)
              .filter(rating => rating !== undefined);
            
            averageRating = ratingsData.length > 0 
              ? ratingsData.reduce((sum, rating) => sum + rating, 0) / ratingsData.length 
              : 0;

            reportCount = reportsSnapshot.size;
          } catch (error) {
            console.warn('Failed to fetch user stats for user:', docSnapshot.id);
          }
        }

        const user = {
          id: docSnapshot.id,
          displayName: userData.displayName || userData.name || 'No Name',
          email: userData.email || 'unknown@example.com',
          photoURL: userData.photoURL,
          isActive: userData.isActive !== false,
          isBanned: userData.isBanned === true,
          trustScore: userData.trustScore || 0,
          createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
          lastLoginAt: userData.lastLoginAt?.toDate?.() || userData.lastLoginAt,
          banReason: userData.banReason,
          bannedBy: userData.bannedBy,
          bannedAt: userData.bannedAt?.toDate?.() || userData.bannedAt,
          totalTrades,
          completedTrades,
          successRate,
          averageRating,
          reportCount
        };

        allUsers.push(user);
      }

      // Apply filters in memory
      let filteredUsers = allUsers;

      // Status filter
      if (filters.status === 'active') {
        filteredUsers = filteredUsers.filter(user => user.isActive && !user.isBanned);
      } else if (filters.status === 'banned') {
        filteredUsers = filteredUsers.filter(user => user.isBanned);
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
          user.displayName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
        );
      }

      // Sort users
      filteredUsers.sort((a, b) => {
        const aValue = a[filters.sortBy || 'createdAt'];
        const bValue = b[filters.sortBy || 'createdAt'];
        
        if (filters.sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Apply pagination
      const startIndex = ((filters.page || 1) - 1) * (filters.limit || 20);
      const endIndex = startIndex + (filters.limit || 20);
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

      const result = {
        users: paginatedUsers,
        total: filteredUsers.length,
        page: filters.page || 1,
        totalPages: Math.ceil(filteredUsers.length / (filters.limit || 20)),
        hasMore: endIndex < filteredUsers.length
      };

      res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ 
        error: 'Failed to fetch users',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}