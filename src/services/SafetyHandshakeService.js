import { doc, updateDoc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationService } from './notificationService';

export class SafetyHandshakeService {
  
  // Safety code statuses
  static CODE_STATUS = {
    GENERATED: 'generated',
    SHARED: 'shared',
    VERIFIED: 'verified',
    EXPIRED: 'expired',
    MISMATCHED: 'mismatched'
  };

  // Meeting verification levels
  static VERIFICATION_LEVELS = {
    BASIC: 'basic',           // Just safety codes
    ENHANCED: 'enhanced',     // Codes + GPS verification
    PREMIUM: 'premium'        // Codes + GPS + Photo verification
  };

  // Generate safety handshake codes for trade meeting
  static async generateMeetingCodes(tradeId, participantIds) {
    try {
      console.log('🔐 Generating safety codes for trade:', tradeId);
      
      // Validate trade exists and is in correct state
      const tradeRef = doc(db, 'offers', tradeId);
      const tradeDoc = await getDoc(tradeRef);
      
      if (!tradeDoc.exists()) {
        throw new Error('Trade not found');
      }
      
      const trade = tradeDoc.data();
      
      // Verify trade is in meeting-ready state
      if (!['meeting_arranged', 'contact_exchanged'].includes(trade.sopState)) {
        throw new Error('Trade not ready for meeting codes');
      }
      
      // Generate unique 4-digit codes for each participant
      const codes = {};
      const usedCodes = new Set();
      
      for (const userId of participantIds) {
        let code;
        do {
          code = this.generateUniqueCode();
        } while (usedCodes.has(code));
        
        usedCodes.add(code);
        codes[userId] = code;
      }
      
      // Create safety handshake record
      const handshakeData = {
        tradeId: tradeId,
        participantIds: participantIds,
        codes: codes,
        
        // Security settings
        verificationLevel: this.VERIFICATION_LEVELS.ENHANCED,
        requiresGPSProximity: true,
        proximityRadius: 100, // meters
        
        // Status and timing
        status: this.CODE_STATUS.GENERATED,
        generatedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        
        // Verification tracking
        verificationAttempts: 0,
        maxAttempts: 3,
        
        // Meeting context
        meetingLocation: trade.meetingLocation || null,
        estimatedMeetingTime: trade.estimatedMeetingTime || null,
        
        // Safety features
        emergencyContact: true,
        safetyTimer: true,
        autoExpiry: true
      };
      
      // Save handshake record
      const handshakeRef = await addDoc(collection(db, 'safetyHandshakes'), handshakeData);
      
      // Update trade with handshake reference
      await updateDoc(tradeRef, {
        safetyHandshakeId: handshakeRef.id,
        safetyCodesGenerated: true,
        safetyCodesGeneratedAt: serverTimestamp()
      });
      
      // Send codes to participants via secure notification
      await this.sendSafetyCodesSecurely(participantIds, codes, tradeId);
      
      console.log('✅ Safety codes generated successfully');
      
      return {
        success: true,
        handshakeId: handshakeRef.id,
        codesGenerated: participantIds.length,
        expiresAt: handshakeData.expiresAt,
        verificationLevel: handshakeData.verificationLevel
      };
      
    } catch (error) {
      console.error('❌ Error generating safety codes:', error);
      throw error;
    }
  }

  // Verify safety handshake during meeting
  static async verifySafetyHandshake(handshakeId, userId, providedCode, location = null) {
    try {
      console.log('🔍 Verifying safety handshake:', handshakeId);
      
      const handshakeRef = doc(db, 'safetyHandshakes', handshakeId);
      const handshakeDoc = await getDoc(handshakeRef);
      
      if (!handshakeDoc.exists()) {
        throw new Error('Safety handshake not found');
      }
      
      const handshake = handshakeDoc.data();
      
      // Check if handshake is still valid
      if (handshake.status === this.CODE_STATUS.EXPIRED) {
        throw new Error('Safety codes have expired');
      }
      
      if (handshake.verificationAttempts >= handshake.maxAttempts) {
        throw new Error('Maximum verification attempts exceeded');
      }
      
      // Verify user is participant
      if (!handshake.participantIds.includes(userId)) {
        throw new Error('User not authorized for this handshake');
      }
      
      // Verify the code
      const expectedCode = handshake.codes[userId];
      if (providedCode !== expectedCode) {
        // Increment failed attempts
        await updateDoc(handshakeRef, {
          verificationAttempts: handshake.verificationAttempts + 1,
          lastFailedAttempt: serverTimestamp(),
          lastFailedCode: providedCode
        });
        
        throw new Error('Invalid safety code');
      }
      
      // GPS proximity verification (if enabled and location provided)
      let gpsVerified = true;
      if (handshake.requiresGPSProximity && location && handshake.meetingLocation) {
        gpsVerified = this.verifyGPSProximity(
          location,
          handshake.meetingLocation,
          handshake.proximityRadius
        );
        
        if (!gpsVerified) {
          throw new Error('Location verification failed - not at meeting location');
        }
      }
      
      // Mark user as verified
      const verifiedUsers = handshake.verifiedUsers || [];
      if (!verifiedUsers.includes(userId)) {
        verifiedUsers.push(userId);
      }
      
      const allVerified = verifiedUsers.length === handshake.participantIds.length;
      
      // Update handshake record
      await updateDoc(handshakeRef, {
        verifiedUsers: verifiedUsers,
        [`verificationTimes.${userId}`]: serverTimestamp(),
        status: allVerified ? this.CODE_STATUS.VERIFIED : this.CODE_STATUS.SHARED,
        gpsVerified: gpsVerified,
        lastVerificationAt: serverTimestamp()
      });
      
      // If all users verified, enable trade completion
      if (allVerified) {
        await this.enableTradeCompletion(handshake.tradeId);
      }
      
      console.log('✅ Safety handshake verified for user:', userId);
      
      return {
        success: true,
        verified: true,
        allParticipantsVerified: allVerified,
        gpsVerified: gpsVerified,
        canProceedWithTrade: allVerified
      };
      
    } catch (error) {
      console.error('❌ Error verifying safety handshake:', error);
      throw error;
    }
  }

  // Get safety handshake status for trade
  static async getHandshakeStatus(tradeId, userId) {
    try {
      const q = query(
        collection(db, 'safetyHandshakes'),
        where('tradeId', '==', tradeId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return {
          exists: false,
          codesGenerated: false
        };
      }
      
      const handshake = snapshot.docs[0].data();
      const handshakeId = snapshot.docs[0].id;
      
      const userCode = handshake.codes[userId];
      const isVerified = (handshake.verifiedUsers || []).includes(userId);
      const allVerified = (handshake.verifiedUsers || []).length === handshake.participantIds.length;
      
      return {
        exists: true,
        handshakeId: handshakeId,
        userCode: userCode,
        isVerified: isVerified,
        allVerified: allVerified,
        status: handshake.status,
        expiresAt: handshake.expiresAt,
        verificationLevel: handshake.verificationLevel,
        requiresGPS: handshake.requiresGPSProximity,
        attemptsRemaining: handshake.maxAttempts - handshake.verificationAttempts
      };
      
    } catch (error) {
      console.error('❌ Error getting handshake status:', error);
      return { exists: false, error: error.message };
    }
  }

  // Send emergency alert if safety protocol is violated
  static async sendEmergencyAlert(handshakeId, userId, alertType, details = {}) {
    try {
      console.log('🚨 Sending emergency alert for handshake:', handshakeId);
      
      const handshakeRef = doc(db, 'safetyHandshakes', handshakeId);
      const handshakeDoc = await getDoc(handshakeRef);
      
      if (!handshakeDoc.exists()) {
        throw new Error('Safety handshake not found');
      }
      
      const handshake = handshakeDoc.data();
      
      // Create emergency alert record
      const alertData = {
        handshakeId: handshakeId,
        tradeId: handshake.tradeId,
        reportedBy: userId,
        alertType: alertType,
        details: details,
        location: details.location || null,
        timestamp: serverTimestamp(),
        status: 'active',
        severity: this.getAlertSeverity(alertType)
      };
      
      await addDoc(collection(db, 'emergencyAlerts'), alertData);
      
      // Notify other participant
      const otherParticipant = handshake.participantIds.find(id => id !== userId);
      if (otherParticipant) {
        await NotificationService.sendNotification(
          otherParticipant,
          'Safety Alert',
          'A safety concern has been reported for your meeting. Please stay safe.',
          {
            type: 'emergency_alert',
            priority: 'high',
            tradeId: handshake.tradeId
          }
        );
      }
      
      // Mark handshake as compromised
      await updateDoc(handshakeRef, {
        status: 'compromised',
        emergencyAlert: true,
        alertedAt: serverTimestamp()
      });
      
      return { success: true, alertSent: true };
      
    } catch (error) {
      console.error('❌ Error sending emergency alert:', error);
      throw error;
    }
  }

  // Helper: Generate unique 4-digit code
  static generateUniqueCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  // Helper: Send safety codes securely to participants
  static async sendSafetyCodesSecurely(participantIds, codes, tradeId) {
    try {
      const notifications = participantIds.map(userId => {
        return NotificationService.sendNotification(
          userId,
          'Safety Code Generated',
          `Your meeting safety code: ${codes[userId]}. Share this code verbally when you meet.`,
          {
            type: 'safety_code',
            tradeId: tradeId,
            code: codes[userId],
            priority: 'high',
            secure: true
          }
        );
      });
      
      await Promise.all(notifications);
      
    } catch (error) {
      console.error('❌ Error sending safety codes:', error);
    }
  }

  // Helper: Verify GPS proximity
  static verifyGPSProximity(userLocation, meetingLocation, radiusMeters) {
    try {
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        meetingLocation.latitude,
        meetingLocation.longitude
      );
      
      return distance <= radiusMeters;
      
    } catch (error) {
      console.error('❌ Error verifying GPS proximity:', error);
      return false;
    }
  }

  // Helper: Calculate distance between two GPS points
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  // Helper: Enable trade completion after successful handshake
  static async enableTradeCompletion(tradeId) {
    try {
      const tradeRef = doc(db, 'offers', tradeId);
      await updateDoc(tradeRef, {
        safetyVerified: true,
        canCompleteExchange: true,
        safetyVerifiedAt: serverTimestamp()
      });
      
      console.log('✅ Trade completion enabled after safety verification');
      
    } catch (error) {
      console.error('❌ Error enabling trade completion:', error);
    }
  }

  // Helper: Get alert severity level
  static getAlertSeverity(alertType) {
    const severityMap = {
      'no_show': 'medium',
      'wrong_person': 'high',
      'unsafe_location': 'high',
      'suspicious_behavior': 'high',
      'emergency': 'critical'
    };
    
    return severityMap[alertType] || 'medium';
  }

  // Cleanup expired handshakes
  static async cleanupExpiredHandshakes() {
    try {
      console.log('🧹 Cleaning up expired safety handshakes');
      
      const now = new Date();
      const q = query(
        collection(db, 'safetyHandshakes'),
        where('expiresAt', '<=', now),
        where('status', '!=', this.CODE_STATUS.EXPIRED)
      );
      
      const snapshot = await getDocs(q);
      const cleanupPromises = [];
      
      snapshot.forEach(doc => {
        cleanupPromises.push(
          updateDoc(doc.ref, {
            status: this.CODE_STATUS.EXPIRED,
            expiredAt: serverTimestamp()
          })
        );
      });
      
      await Promise.all(cleanupPromises);
      
      console.log(`✅ Cleaned up ${snapshot.size} expired handshakes`);
      
      return { cleaned: snapshot.size };
      
    } catch (error) {
      console.error('❌ Error cleaning up expired handshakes:', error);
      return { cleaned: 0 };
    }
  }
}