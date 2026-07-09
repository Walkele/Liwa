import { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/config/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const DEFAULT_SETTINGS = {
  appName: 'SwipeIt',
  appVersion: '1.0.0',
  maintenanceMode: false,
  registrationEnabled: true,
  maxItemsPerUser: 50,
  maxActiveTradesPerUser: 10,
  requireEmailVerification: true,
  requirePhoneVerification: false,
  minTrustScoreForTrades: 20,
  autoSuspendThreshold: 5,
  tradeTimeoutHours: 48,
  maxCounterOffers: 3,
  requireMeetingConfirmation: true,
  allowCashOffers: true,
  pushNotificationsEnabled: true,
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: false,
  autoModerationEnabled: true,
  profanityFilterEnabled: true,
  imageAnalysisEnabled: false,
  serviceOffersEnabled: true,
  premiumFeaturesEnabled: false,
  locationBasedMatching: true,
  qrCodeVerification: true
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const settingsDoc = await adminDb.collection('system_settings').doc('app_config').get();
      
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        res.status(200).json({ ...DEFAULT_SETTINGS, ...settings });
      } else {
        // Create default settings if they don't exist
        await adminDb.collection('system_settings').doc('app_config').set({
          ...DEFAULT_SETTINGS,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
        res.status(200).json(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ 
        error: 'Failed to fetch settings',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'POST') {
    try {
      const settings = req.body;
      
      // Validate settings
      if (typeof settings !== 'object') {
        return res.status(400).json({ error: 'Invalid settings data' });
      }

      // Update settings in database
      await adminDb.collection('system_settings').doc('app_config').set({
        ...settings,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      // Log admin action
      await adminDb.collection('admin_logs').add({
        action: 'update_settings',
        performedBy: 'admin', // TODO: Get from auth context
        details: { settingsUpdated: Object.keys(settings) },
        timestamp: FieldValue.serverTimestamp(),
      });

      console.log('System settings updated');
      res.status(200).json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ 
        error: 'Failed to update settings',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}