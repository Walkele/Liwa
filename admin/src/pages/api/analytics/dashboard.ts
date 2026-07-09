import { NextApiRequest, NextApiResponse } from 'next';
import { AnalyticsService } from '@/services/AnalyticsService';
import { AdminAuthService } from '@/services/AdminAuthService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify admin authentication
    const token = req.cookies['admin-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = AdminAuthService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check permissions
    if (!decoded.permissions.includes('analytics.read') && decoded.role !== 'super-admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (req.method === 'GET') {
      const analytics = await AnalyticsService.getDashboardAnalytics();

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Dashboard analytics API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}