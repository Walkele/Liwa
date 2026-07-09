import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { timeRange = '7d' } = req.query;
      
      // Calculate date range
      const now = new Date();
      const daysBack = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

      // Get all collections data
      const [usersSnapshot, tradesSnapshot, itemsSnapshot, reportsSnapshot] = await Promise.all([
        adminDb.collection('users').get(),
        adminDb.collection('trades').get(),
        adminDb.collection('items').get(),
        adminDb.collection('reports').get()
      ]);

      // Calculate overview metrics
      const totalUsers = usersSnapshot.size;
      const activeUsers = usersSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.isActive && !data.isBanned;
      }).length;

      const totalTrades = tradesSnapshot.size;
      const completedTrades = tradesSnapshot.docs.filter(doc => 
        doc.data().status === 'completed'
      ).length;

      const totalItems = itemsSnapshot.size;
      const activeItems = itemsSnapshot.docs.filter(doc => 
        doc.data().status === 'active'
      ).length;

      const totalReports = reportsSnapshot.size;
      const pendingReports = reportsSnapshot.docs.filter(doc => 
        doc.data().status === 'pending'
      ).length;

      // Calculate trends (mock data for now - in real app, compare with previous period)
      const trends = {
        userGrowth: Math.floor(Math.random() * 20) - 5, // -5% to +15%
        tradeGrowth: Math.floor(Math.random() * 25) - 5, // -5% to +20%
        itemGrowth: Math.floor(Math.random() * 15) - 3, // -3% to +12%
        reportGrowth: Math.floor(Math.random() * 10) - 15 // -15% to -5%
      };

      // Calculate top categories
      const categoryCount: { [key: string]: number } = {};
      itemsSnapshot.docs.forEach(doc => {
        const category = doc.data().category || 'Other';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });

      const topCategories = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / totalItems) * 100)
        }));

      // Generate daily activity data
      const userActivity = [];
      for (let i = daysBack - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
        userActivity.push({
          date: date.toISOString().split('T')[0],
          activeUsers: Math.floor(activeUsers * (0.8 + Math.random() * 0.4)), // Simulate daily variation
          newUsers: Math.floor(Math.random() * 50) + 10,
          trades: Math.floor(Math.random() * 100) + 20
        });
      }

      // Calculate trade metrics
      const ratings = tradesSnapshot.docs
        .map(doc => doc.data().rating?.averageRating)
        .filter(rating => rating !== undefined);
      
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0;

      const successRate = totalTrades > 0 ? Math.round((completedTrades / totalTrades) * 100) : 0;
      const averageTradeTime = 24 + Math.floor(Math.random() * 48); // Mock: 24-72 hours

      const topTradeReasons = [
        { reason: 'Item Exchange', count: Math.floor(completedTrades * 0.4) },
        { reason: 'Cash Sale', count: Math.floor(completedTrades * 0.3) },
        { reason: 'Service Trade', count: Math.floor(completedTrades * 0.2) },
        { reason: 'Bundle Deal', count: Math.floor(completedTrades * 0.1) }
      ];

      const analytics = {
        overview: {
          totalUsers,
          activeUsers,
          totalTrades,
          completedTrades,
          totalItems,
          activeItems,
          totalReports,
          pendingReports
        },
        trends,
        topCategories,
        userActivity,
        tradeMetrics: {
          averageTradeTime,
          successRate,
          averageRating: Number(averageRating.toFixed(1)),
          topTradeReasons
        }
      };

      res.status(200).json(analytics);
    } catch (error) {
      console.error('Error fetching detailed analytics:', error);
      res.status(500).json({ 
        error: 'Failed to fetch analytics data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}