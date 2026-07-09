import { 
  doc, 
  updateDoc, 
  getDoc, 
  addDoc, 
  collection, 
  serverTimestamp,
  query,
  where,
  getDocs 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Location from 'expo-location';
import { TrustScoreService } from './TrustScoreService';
import { NotificationService } from './notificationService';

export class QRVerificationService {
  
  // Safe zone types and their trust requirements
  static SAFE_ZONE_TYPES = {
    POLICE_STATION: {
      name: 'Police Station',
      icon: '🚔',
      trustRequired: 0,
      safetyRating: 5,
      description: 'Highest security location'
    },
    SHOPPING_MALL: {
      name: 'Shopping Mall',
      icon: '🏬',
      trustRequired: 20,
      safetyRating: 4,
      description: 'Public area with security'
    },
    COFFEE_SHOP: {
      name: 'Coffee Shop',
      icon: '☕',
      trustRequired: 30,
      safetyRating: 4,
      description: 'Public meeting space'
    },
    LIBRARY: {
      name: 'Library',
      icon: '📚',
      trustRequired: 25,
      safetyRating: 4,
      description: 'Quiet public space'
    },
    COMMUNITY_CENTER: {
      name: 'Community Center',
      icon: '🏢',
      trustRequired: 35,
      safetyRating: 3,
      description: 'Local community space'
    },
    BANK: {
      name: 'Bank',
      icon: '🏦',
      trustRequired: 40,
      safetyRating: 5,
      description: 'High security location'
    }
  };

  // QR verification requirements based on trade value
  static VERIFICATION_REQUIREMENTS = {
    LOW_VALUE: {
      maxValue: 100,
      qrRequired: false,
      trustRequired: 0,
      description: 'Simple handshake verification'
    },
    MEDIUM_VALUE: {
      maxValue: 500,
      qrRequired: true,
      trustRequired: 30,
      description: 'QR code verification required'
    },
    HIGH_VALUE: {
      maxValue: 2000,
      qrRequired: true,
      trustRequired: 50,
      description: 'QR + ID verification required'
    },
    PREMIUM_VALUE: {
      maxValue: Infinity,
      qrRequired: true,
      trustRequired: 70,
      description: 'Full verification + safe zone required'
    }
  };

  // Generate QR verification codes for trade
  static async generateTradeQRCodes(tradeId, participants) {
    try {
      console.log('🔐 Generating QR codes for trade:', tradeId);
      
      const tradeDoc = await getDoc(doc(db, 'active_trades', tradeId));
      if (!tradeDoc.exists()) {
        throw new Error('Trade not found');
      }

      const trade = tradeDoc.data();
      
      // Generate unique verification codes for each participant
      const verificationCodes = {};
      const qrData = {};
      
      for (const userId of participants) {
        const verificationCode = this.generateSecureCode(8);
        const qrPayload = {
          tradeId,
          userId,
          verificationCode,
          timestamp: Date.now(),
          expiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
          type: 'trade_verification'
        };
        
        verificationCodes[userId] = verificationCode;
        qrData[userId] = JSON.stringify(qrPayload);
      }

      // Update trade with QR codes
      await updateDoc(doc(db, 'active_trades', tradeId), {
        qrCodesGenerated: true,
        verificationCodes,
        qrData,
        qrGeneratedAt: serverTimestamp(),
        qrExpiresAt: new Date(Date.now() + (2 * 60 * 60 * 1000))
      });

      // Log QR generation
      await this.logVerificationEvent(tradeId, 'qr_generated', {
        participants,
        generatedBy: 'system'
      });

      console.log('✅ QR codes generated successfully');
      return { verificationCodes, qrData };

    } catch (error) {
      console.error('Error generating QR codes:', error);
      throw error;
    }
  }

  // Verify QR code scan
  static async verifyQRScan(scannedData, scannerUserId, scannerLocation = null) {
    try {
      console.log('📱 Verifying QR scan...');
      
      const qrPayload = JSON.parse(scannedData);
      const { tradeId, userId, verificationCode, timestamp, expiresAt } = qrPayload;

      // Check if QR code is expired
      if (Date.now() > expiresAt) {
        throw new Error('QR code has expired');
      }

      // Get trade data
      const tradeDoc = await getDoc(doc(db, 'active_trades', tradeId));
      if (!tradeDoc.exists()) {
        throw new Error('Trade not found');
      }

      const trade = tradeDoc.data();

      // Verify scanner is a participant
      if (!trade.participants.includes(scannerUserId)) {
        throw new Error('Unauthorized scanner');
      }

      // Verify the other participant's QR code
      if (userId === scannerUserId) {
        throw new Error('Cannot scan your own QR code');
      }

      // Verify the verification code matches
      if (trade.verificationCodes[userId] !== verificationCode) {
        throw new Error('Invalid verification code');
      }

      // Record the verification
      const verificationKey = `verification_${scannerUserId}_scanned_${userId}`;
      const verificationData = {
        scannedAt: serverTimestamp(),
        scannerLocation,
        verified: true
      };

      await updateDoc(doc(db, 'active_trades', tradeId), {
        [`verifications.${verificationKey}`]: verificationData
      });

      // Check if both participants have verified each other
      const bothVerified = await this.checkBothParticipantsVerified(tradeId, trade.participants);
      
      if (bothVerified) {
        await this.completeTradeVerification(tradeId);
      }

      // Log verification event
      await this.logVerificationEvent(tradeId, 'qr_scanned', {
        scanner: scannerUserId,
        scanned: userId,
        location: scannerLocation
      });

      // Send notification to other participant
      const otherUserId = trade.participants.find(id => id !== scannerUserId);
      await NotificationService.notifyQRVerification(otherUserId, scannerUserId, tradeId, bothVerified);

      console.log('✅ QR verification successful');
      return {
        success: true,
        bothVerified,
        tradeId,
        message: bothVerified ? 'Trade verification complete!' : 'Waiting for other participant to scan your QR code'
      };

    } catch (error) {
      console.error('Error verifying QR scan:', error);
      
      // Log failed verification
      if (error.message !== 'Trade not found') {
        await this.logVerificationEvent(null, 'qr_scan_failed', {
          scanner: scannerUserId,
          error: error.message,
          scannedData: scannedData.substring(0, 100) // Log partial data for debugging
        });
      }
      
      throw error;
    }
  }

  // Check if both participants have verified each other
  static async checkBothParticipantsVerified(tradeId, participants) {
    try {
      const tradeDoc = await getDoc(doc(db, 'active_trades', tradeId));
      const trade = tradeDoc.data();
      const verifications = trade.verifications || {};

      const [user1, user2] = participants;
      const user1VerifiedUser2 = verifications[`verification_${user1}_scanned_${user2}`]?.verified;
      const user2VerifiedUser1 = verifications[`verification_${user2}_scanned_${user1}`]?.verified;

      return user1VerifiedUser2 && user2VerifiedUser1;
    } catch (error) {
      console.error('Error checking verification status:', error);
      return false;
    }
  }

  // Complete trade verification
  static async completeTradeVerification(tradeId) {
    try {
      console.log('🎉 Completing trade verification:', tradeId);
      
      await updateDoc(doc(db, 'active_trades', tradeId), {
        status: 'verified_complete',
        verificationComplete: true,
        completedAt: serverTimestamp(),
        phase: 'completed'
      });

      // Update trust scores for both participants
      const tradeDoc = await getDoc(doc(db, 'active_trades', tradeId));
      const trade = tradeDoc.data();
      
      for (const userId of trade.participants) {
        await TrustScoreService.calculateTrustScore(userId);
      }

      // Log completion
      await this.logVerificationEvent(tradeId, 'trade_completed', {
        participants: trade.participants,
        completedAt: new Date()
      });

      console.log('✅ Trade verification completed');
      return true;

    } catch (error) {
      console.error('Error completing trade verification:', error);
      throw error;
    }
  }

  // Find nearby safe exchange zones
  static async findNearbyExchangeZones(userLocation, radiusKm = 10, userTrustScore = 0) {
    try {
      console.log('🗺️ Finding nearby safe exchange zones...');
      
      // This would integrate with Google Places API in production
      // For now, we'll return mock data based on common safe locations
      const mockSafeZones = [
        {
          id: 'police_1',
          name: 'Central Police Station',
          type: 'POLICE_STATION',
          address: '123 Main St, Downtown',
          location: {
            latitude: userLocation.latitude + 0.01,
            longitude: userLocation.longitude + 0.01
          },
          distance: 1.2,
          rating: 5.0,
          isVerified: true,
          hours: '24/7',
          features: ['Security Cameras', 'Safe Parking', 'Well Lit']
        },
        {
          id: 'mall_1',
          name: 'City Center Mall',
          type: 'SHOPPING_MALL',
          address: '456 Shopping Blvd',
          location: {
            latitude: userLocation.latitude + 0.005,
            longitude: userLocation.longitude - 0.008
          },
          distance: 0.8,
          rating: 4.5,
          isVerified: true,
          hours: '10 AM - 10 PM',
          features: ['Security Guards', 'Food Court', 'Public Restrooms']
        },
        {
          id: 'coffee_1',
          name: 'Starbucks Coffee',
          type: 'COFFEE_SHOP',
          address: '789 Coffee Ave',
          location: {
            latitude: userLocation.latitude - 0.003,
            longitude: userLocation.longitude + 0.006
          },
          distance: 0.5,
          rating: 4.2,
          isVerified: false,
          hours: '6 AM - 9 PM',
          features: ['WiFi', 'Seating Area', 'Busy Location']
        },
        {
          id: 'library_1',
          name: 'Public Library',
          type: 'LIBRARY',
          address: '321 Knowledge St',
          location: {
            latitude: userLocation.latitude + 0.008,
            longitude: userLocation.longitude - 0.004
          },
          distance: 1.0,
          rating: 4.8,
          isVerified: true,
          hours: '9 AM - 8 PM',
          features: ['Quiet Environment', 'Security', 'Free Parking']
        }
      ];

      // Filter zones based on user's trust score
      const availableZones = mockSafeZones.filter(zone => {
        const zoneType = this.SAFE_ZONE_TYPES[zone.type];
        return userTrustScore >= zoneType.trustRequired;
      });

      // Sort by distance and safety rating
      const sortedZones = availableZones
        .filter(zone => zone.distance <= radiusKm)
        .sort((a, b) => {
          // Prioritize verified zones and police stations
          if (a.type === 'POLICE_STATION' && b.type !== 'POLICE_STATION') return -1;
          if (b.type === 'POLICE_STATION' && a.type !== 'POLICE_STATION') return 1;
          if (a.isVerified && !b.isVerified) return -1;
          if (b.isVerified && !a.isVerified) return 1;
          return a.distance - b.distance;
        })
        .map(zone => ({
          ...zone,
          safetyInfo: this.SAFE_ZONE_TYPES[zone.type],
          recommendationReason: this.getRecommendationReason(zone, userTrustScore)
        }));

      console.log(`✅ Found ${sortedZones.length} safe exchange zones`);
      return sortedZones;

    } catch (error) {
      console.error('Error finding safe exchange zones:', error);
      return [];
    }
  }

  // Get recommendation reason for a safe zone
  static getRecommendationReason(zone, userTrustScore) {
    const zoneType = this.SAFE_ZONE_TYPES[zone.type];
    
    if (zone.type === 'POLICE_STATION') {
      return 'Highest security - Recommended for all trades';
    }
    
    if (zone.isVerified) {
      return 'Verified safe location';
    }
    
    if (userTrustScore >= zoneType.trustRequired + 20) {
      return 'Good match for your trust level';
    }
    
    return `Requires ${zoneType.trustRequired}+ trust score`;
  }

  // Get verification requirements for trade value
  static getVerificationRequirements(tradeValue) {
    for (const [level, requirements] of Object.entries(this.VERIFICATION_REQUIREMENTS)) {
      if (tradeValue <= requirements.maxValue) {
        return {
          level,
          ...requirements
        };
      }
    }
    return this.VERIFICATION_REQUIREMENTS.PREMIUM_VALUE;
  }

  // Check if users meet verification requirements for trade
  static async checkTradeVerificationEligibility(tradeId, tradeValue) {
    try {
      const requirements = this.getVerificationRequirements(tradeValue);
      const tradeDoc = await getDoc(doc(db, 'active_trades', tradeId));
      const trade = tradeDoc.data();

      const eligibilityResults = {};

      for (const userId of trade.participants) {
        const trustScore = await TrustScoreService.calculateTrustScore(userId);
        const meetsRequirements = trustScore.score >= requirements.trustRequired;
        
        eligibilityResults[userId] = {
          trustScore: trustScore.score,
          trustLevel: trustScore.level.name,
          meetsRequirements,
          requiredScore: requirements.trustRequired,
          shortfall: meetsRequirements ? 0 : requirements.trustRequired - trustScore.score
        };
      }

      return {
        requirements,
        eligibility: eligibilityResults,
        allEligible: Object.values(eligibilityResults).every(result => result.meetsRequirements)
      };

    } catch (error) {
      console.error('Error checking verification eligibility:', error);
      throw error;
    }
  }

  // Generate secure verification code
  static generateSecureCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Log verification events for audit trail
  static async logVerificationEvent(tradeId, eventType, eventData) {
    try {
      const logData = {
        tradeId,
        eventType,
        eventData,
        timestamp: serverTimestamp(),
        createdAt: new Date()
      };

      await addDoc(collection(db, 'verification_logs'), logData);
    } catch (error) {
      console.error('Error logging verification event:', error);
    }
  }

  // Get user's current location
  static async getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  // Calculate distance between two coordinates
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static toRadians(degrees) {
    return degrees * (Math.PI/180);
  }
}

export default QRVerificationService;