import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Get system statistics
      const [usersSnapshot, tradesSnapshot, itemsSnapshot, reportsSnapshot] = await Promise.all([
        adminDb.collection('users').get(),
        adminDb.collection('trades').get(),
        adminDb.collection('items').get(),
        adminDb.collection('reports').get()
      ]);

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

      // Calculate system health based on various factors
      let systemHealth = 100;
      
      // Reduce health based on pending reports
      if (pendingReports > 10) systemHealth -= 10;
      if (pendingReports > 50) systemHealth -= 20;
      
      // Reduce health based on failed trades ratio
      const failedTrades = tradesSnapshot.docs.filter(doc => 
        doc.data().status === 'cancelled' || doc.data().status === 'failed'
      ).length;
      const failureRate = totalTrades > 0 ? (failedTrades / totalTrades) * 100 : 0;
      if (failureRate > 20) systemHealth -= 15;
      if (failureRate > 40) systemHealth -= 25;

      // Mock storage usage (in a real app, this would come from your storage provider)
      const storageUsed = Math.min(95, Math.floor((totalItems * 2.5) / 100)); // Rough estimate

      // Mock API calls (in a real app, this would come from your API analytics)
      const apiCalls = Math.floor(Math.random() * 5000) + 10000;

      const stats = {
        totalUsers,
        activeUsers,
        totalTrades,
        completedTrades,
        totalItems,
        activeItems,
        totalReports,
        pendingReports,
        systemHealth: Math.max(0, systemHealth),
        storageUsed,
        apiCalls,
        tradeSuccessRate: totalTrades > 0 ? ((completedTrades / totalTrades) * 100).toFixed(1) : '0',
        userActivityRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : '0'
      };

      res.status(200).json(stats);
    } catch (error) {
      console.error('Error fetching system stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch system statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}