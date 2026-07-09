import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Get all reports
      const reportsSnapshot = await adminDb.collection('reports').get();
      
      let total = 0;
      let pending = 0;
      let underReview = 0;
      let resolved = 0;
      let critical = 0;
      let totalResolutionTime = 0;
      let resolvedCount = 0;

      reportsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        total++;
        
        switch (data.status) {
          case 'pending':
            pending++;
            break;
          case 'under_review':
            underReview++;
            break;
          case 'resolved':
            resolved++;
            // Calculate resolution time if available
            if (data.createdAt && data.resolvedAt) {
              const createdTime = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
              const resolvedTime = data.resolvedAt.toDate ? data.resolvedAt.toDate() : new Date(data.resolvedAt);
              const resolutionHours = (resolvedTime.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
              totalResolutionTime += resolutionHours;
              resolvedCount++;
            }
            break;
        }
        
        if (data.severity === 'critical') {
          critical++;
        }
      });

      const avgResolutionTime = resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount) : 0;

      const statistics = {
        total,
        pending,
        underReview,
        resolved,
        critical,
        avgResolutionTime,
        dismissed: total - pending - underReview - resolved
      };

      res.status(200).json(statistics);
    } catch (error) {
      console.error('Error fetching report statistics:', error);
      res.status(500).json({ 
        error: 'Failed to fetch report statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}