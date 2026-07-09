import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { reportId } = req.query;

  if (!reportId || typeof reportId !== 'string') {
    return res.status(400).json({ error: 'Report ID is required' });
  }

  if (req.method === 'POST') {
    try {
      const { action, note, assignee, performedBy } = req.body;

      if (!action || !performedBy) {
        return res.status(400).json({ error: 'Action and performedBy are required' });
      }

      const reportRef = adminDb.collection('reports').doc(reportId);
      const reportDoc = await reportRef.get();

      if (!reportDoc.exists) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const reportData = reportDoc.data();
      const updateData: any = {
        updatedAt: FieldValue.serverTimestamp()
      };

      switch (action) {
        case 'resolve':
          updateData.status = 'resolved';
          updateData.resolution = note;
          updateData.resolvedBy = performedBy;
          updateData.resolvedAt = FieldValue.serverTimestamp();
          break;

        case 'dismiss':
          updateData.status = 'dismissed';
          updateData.dismissalReason = note;
          updateData.dismissedBy = performedBy;
          updateData.dismissedAt = FieldValue.serverTimestamp();
          break;

        case 'escalate':
          updateData.status = 'escalated';
          updateData.escalationReason = note;
          updateData.escalatedBy = performedBy;
          updateData.escalatedAt = FieldValue.serverTimestamp();
          updateData.priority = 1; // Highest priority
          break;

        case 'assign':
          if (!assignee) {
            return res.status(400).json({ error: 'Assignee is required for assign action' });
          }
          updateData.status = 'under_review';
          updateData.assignedTo = assignee;
          updateData.assignedBy = performedBy;
          updateData.assignedAt = FieldValue.serverTimestamp();
          if (note) updateData.assignmentNote = note;
          break;

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

      // Update the report
      await reportRef.update(updateData);

      // Log the admin action
      await adminDb.collection('admin_logs').add({
        action: `report_${action}`,
        targetId: reportId,
        targetType: 'report',
        performedBy,
        details: {
          reportType: reportData?.reportedType,
          reportedId: reportData?.reportedId,
          note,
          assignee
        },
        timestamp: FieldValue.serverTimestamp(),
      });

      // Execute additional actions based on report resolution
      if (action === 'resolve') {
        await executePostResolutionActions(reportData, performedBy);
      }

      console.log(`Report ${reportId} ${action}d by ${performedBy}`);
      res.status(200).json({ 
        message: `Report ${action}d successfully`,
        reportId 
      });
    } catch (error) {
      console.error(`Error ${req.body.action}ing report:`, error);
      res.status(500).json({ 
        error: `Failed to ${req.body.action} report`,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

async function executePostResolutionActions(reportData: any, performedBy: string) {
  try {
    // Based on the report type and resolution, take appropriate actions
    if (reportData.severity === 'critical' && reportData.reportedType === 'user') {
      // For critical user reports, consider additional actions
      const userRef = adminDb.collection('users').doc(reportData.reportedId);
      await userRef.update({
        flagCount: FieldValue.increment(1),
        lastFlaggedAt: FieldValue.serverTimestamp()
      });
    }

    // Update reported entity statistics
    const entityCollection = reportData.reportedType === 'user' ? 'users' : 'items';
    const entityRef = adminDb.collection(entityCollection).doc(reportData.reportedId);
    await entityRef.update({
      resolvedReportCount: FieldValue.increment(1),
      lastReportResolvedAt: FieldValue.serverTimestamp()
    });

  } catch (error) {
    console.error('Error executing post-resolution actions:', error);
  }
}