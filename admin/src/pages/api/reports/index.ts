import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';

interface ReportFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  priority?: string;
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
        priority
      } = req.query;

      const filters: ReportFilters = {
        page: parseInt(page as string),
        limit: parseInt(pageLimit as string),
        search: search as string,
        status: status as string,
        type: type as string,
        priority: priority as string
      };

      // Build query
      let reportsQuery: any = adminDb.collection('reports');

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        reportsQuery = reportsQuery.where('status', '==', filters.status);
      }

      if (filters.type && filters.type !== 'all') {
        reportsQuery = reportsQuery.where('type', '==', filters.type);
      }

      if (filters.priority === 'high') {
        reportsQuery = reportsQuery.where('priority', '==', 'high');
      }

      // Apply sorting
      reportsQuery = reportsQuery.orderBy('createdAt', 'desc');

      // Apply pagination
      if (filters.page && filters.page > 1) {
        const offset = (filters.page - 1) * (filters.limit || 20);
        reportsQuery = reportsQuery.offset(offset);
      }

      reportsQuery = reportsQuery.limit(filters.limit || 20);

      const snapshot = await reportsQuery.get();
      const reports: any[] = [];

      // Get additional information for each report
      for (const docSnapshot of snapshot.docs) {
        const reportData = docSnapshot.data();
        let reporterName = 'Anonymous';
        let reporterEmail = 'unknown@example.com';
        let targetTitle = '';
        let targetUserName = '';
        let targetUserEmail = '';

        // Fetch reporter information
        if (reportData.reportedBy) {
          try {
            const userDoc = await adminDb.collection('users').doc(reportData.reportedBy).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              reporterName = userData?.displayName || userData?.name || 'Anonymous';
              reporterEmail = userData?.email || 'unknown@example.com';
            }
          } catch (error) {
            console.warn('Failed to fetch reporter data for report:', docSnapshot.id);
          }
        }

        // Fetch target information based on report type
        if (reportData.reportedId) {
          try {
            if (reportData.type === 'user') {
              const userDoc = await adminDb.collection('users').doc(reportData.reportedId).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                targetUserName = userData?.displayName || userData?.name || 'Unknown User';
                targetUserEmail = userData?.email || 'unknown@example.com';
              }
            } else if (reportData.type === 'item') {
              const itemDoc = await adminDb.collection('items').doc(reportData.reportedId).get();
              if (itemDoc.exists) {
                const itemData = itemDoc.data();
                targetTitle = itemData?.title || 'Unknown Item';
                // Also get item owner info
                if (itemData?.userId) {
                  const ownerDoc = await adminDb.collection('users').doc(itemData.userId).get();
                  if (ownerDoc.exists) {
                    const ownerData = ownerDoc.data();
                    targetUserName = ownerData?.displayName || ownerData?.name || 'Unknown User';
                    targetUserEmail = ownerData?.email || 'unknown@example.com';
                  }
                }
              }
            }
          } catch (error) {
            console.warn('Failed to fetch target data for report:', docSnapshot.id);
          }
        }

        const report = {
          id: docSnapshot.id,
          type: reportData.type || 'user',
          reportedId: reportData.reportedId || '',
          reportedBy: reportData.reportedBy || '',
          reporterName,
          reporterEmail,
          reason: reportData.reason || 'No reason provided',
          description: reportData.description || '',
          status: reportData.status || 'pending',
          createdAt: reportData.createdAt,
          reviewedAt: reportData.reviewedAt,
          reviewedBy: reportData.reviewedBy,
          resolution: reportData.resolution,
          targetTitle,
          targetUserName,
          targetUserEmail
        };

        // Apply search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const matchesSearch = 
            report.reason.toLowerCase().includes(searchLower) ||
            report.description.toLowerCase().includes(searchLower) ||
            report.reporterName.toLowerCase().includes(searchLower) ||
            report.targetTitle.toLowerCase().includes(searchLower) ||
            report.targetUserName.toLowerCase().includes(searchLower);
          
          if (matchesSearch) {
            reports.push(report);
          }
        } else {
          reports.push(report);
        }
      }

      // Get total count for pagination
      const totalSnapshot = await adminDb.collection('reports').get();
      const total = totalSnapshot.size;

      const result = {
        reports,
        total,
        page: filters.page || 1,
        totalPages: Math.ceil(total / (filters.limit || 20))
      };

      res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({ 
        error: 'Failed to fetch reports',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}