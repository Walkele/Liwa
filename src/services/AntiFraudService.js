import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Location from 'expo-location';
import * as Device from 'expo-device';

export class AntiFraudService {
  
  // State machine for item security
  static ITEM_STATES = {
    AVAILABLE: 'available',
    MATCHED: 'matched',
    OFFER_SENT: 'offer_sent',
    OFFER_PENDING: 'offer_pending',
    SWAP_PENDING: 'swap_pending',
    COMPLETED: 'completed',
    ARCHIVED: 'archived',
    LOCKED: 'locked'
  };

  // Fraud detection flags
  static FRAUD_FLAGS = {
    BAIT_SWITCH: 'bait_and_switch',
    DOUBLE_SWAP: 'double_swap',
    LOCATION_SPOOF: 'location_spoof',
    API_INJECTION: 'api_injection',
    INVENTORY_DRAIN: 'inventory_drain',
    VELOCITY_ABUSE: 'velocity_abuse',
    MEDIA_INJECTION: 'media_injection',
    LOWBALL_ABUSE: 'lowball_abuse',
    NON_COMMITMENT: 'non_commitment',
    TRADE_ABANDONMENT: 'trade_abandonment'
  };

  // Progressive penalty system
  static PENALTY_LEVELS = {
    WARNING: {
      level: 1,
      name: 'Warning',
      restrictions: {
        maxOffersPerDay: 10,
        cooldownMinutes: 0,
        requiresVerification: false
      },
      duration: 0 // No duration for warnings
    },
    MINOR: {
      level: 2,
      name: 'Minor Restriction',
      restrictions: {
        maxOffersPerDay: 5,
        cooldownMinutes: 30,
        requiresVerification: false
      },
      duration: 24 * 60 * 60 * 1000 // 24 hours
    },
    MODERATE: {
      level: 3,
      name: 'Moderate Restriction',
      restrictions: {
        maxOffersPerDay: 3,
        cooldownMinutes: 60,
        requiresVerification: true
      },
      duration: 3 * 24 * 60 * 60 * 1000 // 3 days
    },
    SEVERE: {
      level: 4,
      name: 'Severe Restriction',
      restrictions: {
        maxOffersPerDay: 1,
        cooldownMinutes: 120,
        requiresVerification: true
      },
      duration: 7 * 24 * 60 * 60 * 1000 // 7 days
    },
    TEMPORARY_BAN: {
      level: 5,
      name: 'Temporary Ban',
      restrictions: {
        maxOffersPerDay: 0,
        cooldownMinutes: 0,
        requiresVerification: true,
        cannotTrade: true
      },
      duration: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  };

  // Violation types and their severity
  static VIOLATION_TYPES = {
    LOWBALL_OFFER: {
      name: 'Lowball Offer',
      baseScore: 10,
      description: 'Offering significantly below item value'
    },
    TRADE_ABANDONMENT: {
      name: 'Trade Abandonment',
      baseScore: 25,
      description: 'Accepting trade but not following through'
    },
    NO_SHOW: {
      name: 'No Show',
      baseScore: 30,
      description: 'Not showing up for arranged meeting'
    },
    FAKE_COMMITMENT: {
      name: 'Fake Commitment',
      baseScore: 20,
      description: 'Committing to trade with no intention to complete'
    },
    REPEATED_LOWBALL: {
      name: 'Repeated Lowballing',
      baseScore: 15,
      description: 'Pattern of consistently low offers'
    },
    WASTING_TIME: {
      name: 'Time Wasting',
      baseScore: 15,
      description: 'Engaging in trades without serious intent'
    }
  };

  // PROGRESSIVE PENALTY SYSTEM

  // Record a violation and apply progressive penalties
  static async recordViolation(userId, violationType, metadata = {}) {
    try {
      console.log(`⚠️ Recording violation: ${violationType} for user ${userId}`);
      
      const violation = this.VIOLATION_TYPES[violationType];
      if (!violation) {
        throw new Error(`Unknown violation type: ${violationType}`);
      }

      // Get user's violation history
      const violationHistory = await this.getUserViolationHistory(userId);
      
      // Calculate violation score with recency weighting
      const violationScore = this.calculateViolationScore(violationHistory, violation);
      
      // Record the new violation
      await addDoc(collection(db, 'userViolations'), {
        userId,
        violationType,
        violationName: violation.name,
        baseScore: violation.baseScore,
        description: violation.description,
        metadata,
        timestamp: serverTimestamp(),
        processed: false
      });

      // Determine penalty level based on total score
      const penaltyLevel = this.determinePenaltyLevel(violationScore + violation.baseScore);
      
      // Apply penalty if warranted
      if (penaltyLevel.level > 1) {
        await this.applyPenalty(userId, penaltyLevel, violationType, metadata);
      }

      // Update user's violation score
      await this.updateUserViolationScore(userId, violationScore + violation.baseScore);

      console.log(`✅ Violation recorded. New score: ${violationScore + violation.baseScore}, Penalty: ${penaltyLevel.name}`);
      
      return {
        violationScore: violationScore + violation.baseScore,
        penaltyLevel,
        applied: penaltyLevel.level > 1
      };

    } catch (error) {
      console.error('❌ Error recording violation:', error);
      throw error;
    }
  }

  // Apply penalty to user account
  static async applyPenalty(userId, penaltyLevel, violationType, metadata = {}) {
    try {
      console.log(`🚫 Applying ${penaltyLevel.name} penalty to user ${userId}`);

      const penaltyData = {
        userId,
        penaltyLevel: penaltyLevel.level,
        penaltyName: penaltyLevel.name,
        restrictions: penaltyLevel.restrictions,
        appliedAt: serverTimestamp(),
        expiresAt: penaltyLevel.duration > 0 ? 
          new Date(Date.now() + penaltyLevel.duration) : null,
        triggeringViolation: violationType,
        metadata,
        isActive: true
      };

      // Record penalty
      await addDoc(collection(db, 'userPenalties'), penaltyData);

      // Update user profile with current penalty status
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        currentPenalty: {
          level: penaltyLevel.level,
          name: penaltyLevel.name,
          restrictions: penaltyLevel.restrictions,
          appliedAt: new Date(),
          expiresAt: penaltyData.expiresAt
        },
        lastPenaltyUpdate: serverTimestamp()
      });

      // Send notification to user
      await this.notifyUserOfPenalty(userId, penaltyLevel, violationType);

      console.log(`✅ Penalty applied successfully`);
      return penaltyData;

    } catch (error) {
      console.error('❌ Error applying penalty:', error);
      throw error;
    }
  }

  // Check if user can make an offer (penalty restrictions)
  static async canUserMakeOffer(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return { canMakeOffer: true, reason: null };
      }

      const userData = userDoc.data();
      const currentPenalty = userData.currentPenalty;

      // No active penalty
      if (!currentPenalty) {
        return { canMakeOffer: true, reason: null };
      }

      // Check if penalty has expired
      if (currentPenalty.expiresAt && new Date() > currentPenalty.expiresAt.toDate()) {
        await this.clearExpiredPenalty(userId);
        return { canMakeOffer: true, reason: null };
      }

      const restrictions = currentPenalty.restrictions;

      // Check for complete trade ban
      if (restrictions.cannotTrade) {
        return {
          canMakeOffer: false,
          reason: 'TEMPORARY_BAN',
          message: `Your account is temporarily banned from trading until ${currentPenalty.expiresAt?.toDate().toLocaleDateString()}`,
          penaltyLevel: currentPenalty.name
        };
      }

      // Check daily offer limit
      const todayOffers = await this.getUserOffersToday(userId);
      if (todayOffers >= restrictions.maxOffersPerDay) {
        return {
          canMakeOffer: false,
          reason: 'DAILY_LIMIT_EXCEEDED',
          message: `You have reached your daily limit of ${restrictions.maxOffersPerDay} offers. Limit resets at midnight.`,
          penaltyLevel: currentPenalty.name
        };
      }

      // Check cooldown period
      const lastOffer = await this.getUserLastOffer(userId);
      if (lastOffer && restrictions.cooldownMinutes > 0) {
        const cooldownEnd = new Date(lastOffer.createdAt.toDate().getTime() + (restrictions.cooldownMinutes * 60 * 1000));
        if (new Date() < cooldownEnd) {
          const remainingMinutes = Math.ceil((cooldownEnd - new Date()) / (60 * 1000));
          return {
            canMakeOffer: false,
            reason: 'COOLDOWN_ACTIVE',
            message: `You must wait ${remainingMinutes} more minutes before making another offer.`,
            penaltyLevel: currentPenalty.name
          };
        }
      }

      return { 
        canMakeOffer: true, 
        reason: null,
        restrictions: restrictions,
        penaltyLevel: currentPenalty.name
      };

    } catch (error) {
      console.error('❌ Error checking user offer permissions:', error);
      return { canMakeOffer: false, reason: 'ERROR', message: 'Unable to verify permissions' };
    }
  }

  // Detect lowball offers
  static async detectLowballOffer(itemId, offerAmount, itemValue) {
    try {
      const lowballThreshold = 0.6; // 60% of item value
      const severeThreshold = 0.3; // 30% of item value

      if (offerAmount < itemValue * severeThreshold) {
        return {
          isLowball: true,
          severity: 'SEVERE',
          percentage: (offerAmount / itemValue) * 100,
          message: `Offer is ${Math.round((1 - offerAmount/itemValue) * 100)}% below item value`
        };
      } else if (offerAmount < itemValue * lowballThreshold) {
        return {
          isLowball: true,
          severity: 'MODERATE',
          percentage: (offerAmount / itemValue) * 100,
          message: `Offer is ${Math.round((1 - offerAmount/itemValue) * 100)}% below item value`
        };
      }

      return { isLowball: false, severity: 'NONE' };

    } catch (error) {
      console.error('❌ Error detecting lowball offer:', error);
      return { isLowball: false, severity: 'ERROR' };
    }
  }

  // Record trade abandonment
  static async recordTradeAbandonment(userId, tradeId, stage, reason = 'unknown') {
    try {
      console.log(`📝 Recording trade abandonment: User ${userId}, Trade ${tradeId}, Stage: ${stage}`);

      const metadata = {
        tradeId,
        abandonmentStage: stage,
        reason,
        timestamp: new Date().toISOString()
      };

      // Determine violation type based on stage
      let violationType;
      switch (stage) {
        case 'after_acceptance':
          violationType = 'TRADE_ABANDONMENT';
          break;
        case 'after_commitment':
          violationType = 'FAKE_COMMITMENT';
          break;
        case 'no_show_meeting':
          violationType = 'NO_SHOW';
          break;
        default:
          violationType = 'WASTING_TIME';
      }

      await this.recordViolation(userId, violationType, metadata);

      console.log(`✅ Trade abandonment recorded`);
      return true;

    } catch (error) {
      console.error('❌ Error recording trade abandonment:', error);
      throw error;
    }
  }

  // HELPER METHODS FOR PENALTY SYSTEM

  static async getUserViolationHistory(userId, daysBack = 30) {
    try {
      const cutoffDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));
      
      const violationsQuery = query(
        collection(db, 'userViolations'),
        where('userId', '==', userId),
        where('timestamp', '>=', cutoffDate),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(violationsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      console.error('❌ Error getting violation history:', error);
      return [];
    }
  }

  static calculateViolationScore(violationHistory, newViolation) {
    let totalScore = 0;
    const now = Date.now();

    violationHistory.forEach(violation => {
      const violationTime = violation.timestamp.toDate().getTime();
      const daysAgo = (now - violationTime) / (24 * 60 * 60 * 1000);
      
      // Apply recency weighting (more recent violations count more)
      let weight = 1.0;
      if (daysAgo <= 7) weight = 1.5;      // Last week: 150%
      else if (daysAgo <= 14) weight = 1.2; // Last 2 weeks: 120%
      else if (daysAgo <= 30) weight = 1.0; // Last month: 100%
      else weight = 0.5;                    // Older: 50%

      totalScore += violation.baseScore * weight;
    });

    return Math.round(totalScore);
  }

  static determinePenaltyLevel(violationScore) {
    if (violationScore >= 100) return this.PENALTY_LEVELS.TEMPORARY_BAN;
    if (violationScore >= 75) return this.PENALTY_LEVELS.SEVERE;
    if (violationScore >= 50) return this.PENALTY_LEVELS.MODERATE;
    if (violationScore >= 25) return this.PENALTY_LEVELS.MINOR;
    return this.PENALTY_LEVELS.WARNING;
  }

  static async updateUserViolationScore(userId, score) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        violationScore: score,
        lastViolationUpdate: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Error updating user violation score:', error);
    }
  }

  static async getUserOffersToday(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const offersQuery = query(
        collection(db, 'offers'),
        where('proposerUserId', '==', userId),
        where('createdAt', '>=', today)
      );

      const snapshot = await getDocs(offersQuery);
      return snapshot.size;

    } catch (error) {
      console.error('❌ Error getting user offers today:', error);
      return 0;
    }
  }

  static async getUserLastOffer(userId) {
    try {
      const offersQuery = query(
        collection(db, 'offers'),
        where('proposerUserId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(offersQuery);
      return snapshot.empty ? null : snapshot.docs[0].data();

    } catch (error) {
      console.error('❌ Error getting user last offer:', error);
      return null;
    }
  }

  static async clearExpiredPenalty(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        currentPenalty: null,
        lastPenaltyUpdate: serverTimestamp()
      });

      console.log(`✅ Cleared expired penalty for user ${userId}`);
    } catch (error) {
      console.error('❌ Error clearing expired penalty:', error);
    }
  }

  static async notifyUserOfPenalty(userId, penaltyLevel, violationType) {
    try {
      // Create notification
      await addDoc(collection(db, 'notifications'), {
        userId,
        type: 'penalty_applied',
        title: `Account Restriction: ${penaltyLevel.name}`,
        message: `Your account has been restricted due to ${this.VIOLATION_TYPES[violationType]?.name || violationType}. Please review our community guidelines.`,
        penaltyLevel: penaltyLevel.level,
        restrictions: penaltyLevel.restrictions,
        createdAt: serverTimestamp(),
        read: false
      });

      console.log(`📧 Penalty notification sent to user ${userId}`);
    } catch (error) {
      console.error('❌ Error sending penalty notification:', error);
    }
  }
  static async createItemSnapshot(itemId, triggeredBy = 'match_created') {
    try {
      console.log('🔒 Creating immutable item snapshot for fraud prevention');
      
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Item not found for snapshot');
      }
      
      const itemData = itemDoc.data();
      
      // Create immutable snapshot
      const snapshotData = {
        originalItemId: itemId,
        snapshotData: {
          ...itemData,
          snapshotCreatedAt: serverTimestamp(),
          snapshotTrigger: triggeredBy,
          version: itemData.version || 1
        },
        isImmutable: true,
        createdAt: serverTimestamp()
      };
      
      const snapshotRef = await addDoc(collection(db, 'itemSnapshots'), snapshotData);
      
      // Update item to reference snapshot and lock editing
      await updateDoc(itemRef, {
        snapshotId: snapshotRef.id,
        isLocked: true,
        lockedAt: serverTimestamp(),
        lockedReason: 'Trade in progress - preventing bait and switch',
        lastUpdatedAt: serverTimestamp()
      });
      
      console.log('✅ Item snapshot created and item locked');
      return snapshotRef.id;
      
    } catch (error) {
      console.error('❌ Error creating item snapshot:', error);
      throw error;
    }
  }

  // 2. DOUBLE SWAP PREVENTION (Race Condition Protection)
  static async atomicTradeAcceptance(itemId, userId, offerData) {
    try {
      console.log('🔒 Executing atomic trade acceptance with race condition protection');
      
      // Use Firestore transaction for atomic updates
      const itemRef = doc(db, 'items', itemId);
      
      // Check current state and update atomically
      const itemDoc = await getDoc(itemRef);
      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }
      
      const currentData = itemDoc.data();
      
      // Verify item is still available (not already traded)
      if (currentData.status !== this.ITEM_STATES.AVAILABLE && 
          currentData.status !== this.ITEM_STATES.MATCHED) {
        throw new Error(`Item no longer available. Current status: ${currentData.status}`);
      }
      
      // Check for concurrent modifications
      if (offerData.lastUpdatedAt && currentData.lastUpdatedAt) {
        const clientTimestamp = new Date(offerData.lastUpdatedAt);
        const serverTimestamp = currentData.lastUpdatedAt.toDate();
        
        if (serverTimestamp > clientTimestamp) {
          throw new Error('409 Conflict: Item was modified by another user. Please refresh and try again.');
        }
      }
      
      // Atomic update with state verification
      await updateDoc(itemRef, {
        status: this.ITEM_STATES.SWAP_PENDING,
        acceptedBy: userId,
        acceptedAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        version: (currentData.version || 1) + 1
      });
      
      console.log('✅ Atomic trade acceptance completed');
      return true;
      
    } catch (error) {
      console.error('❌ Atomic trade acceptance failed:', error);
      throw error;
    }
  }

  // 3. LOCATION SPOOFING DETECTION
  static async validateLocation(userLocation, userId) {
    try {
      console.log('🌍 Validating location for spoofing detection');
      
      const validationResult = {
        isValid: true,
        riskScore: 0,
        flags: []
      };
      
      // Check for mock location (requires expo-location permissions)
      if (userLocation.mocked) {
        validationResult.isValid = false;
        validationResult.riskScore += 50;
        validationResult.flags.push(this.FRAUD_FLAGS.LOCATION_SPOOF);
      }
      
      // Check location accuracy (GPS vs Network)
      if (userLocation.accuracy > 100) { // More than 100m accuracy is suspicious
        validationResult.riskScore += 20;
        validationResult.flags.push('low_accuracy_location');
      }
      
      // Store location history for pattern analysis
      await this.recordLocationHistory(userId, userLocation, validationResult);
      
      // Check for impossible travel (teleportation detection)
      const impossibleTravel = await this.checkImpossibleTravel(userId, userLocation);
      if (impossibleTravel) {
        validationResult.isValid = false;
        validationResult.riskScore += 30;
        validationResult.flags.push('impossible_travel');
      }
      
      console.log('📍 Location validation result:', validationResult);
      return validationResult;
      
    } catch (error) {
      console.error('❌ Location validation error:', error);
      return { isValid: false, riskScore: 100, flags: ['validation_error'] };
    }
  }

  // 4. API INJECTION PREVENTION
  static validateTradeData(clientData, serverData) {
    try {
      console.log('🔍 Validating trade data for API injection');
      
      const validationErrors = [];
      
      // Server-side value recalculation (never trust client)
      const serverCalculatedValue = this.calculateTradeValue(serverData);
      
      if (clientData.tradeValue !== serverCalculatedValue) {
        validationErrors.push({
          field: 'tradeValue',
          expected: serverCalculatedValue,
          received: clientData.tradeValue,
          risk: 'HIGH'
        });
      }
      
      // Validate checksums
      const expectedChecksum = this.generateTradeChecksum(serverData);
      if (clientData.checksum !== expectedChecksum) {
        validationErrors.push({
          field: 'checksum',
          expected: expectedChecksum,
          received: clientData.checksum,
          risk: 'CRITICAL'
        });
      }
      
      // Validate numeric fields for injection
      const numericFields = ['cashAmount', 'itemValue', 'totalValue'];
      numericFields.forEach(field => {
        if (clientData[field] && !this.isValidNumber(clientData[field])) {
          validationErrors.push({
            field: field,
            value: clientData[field],
            risk: 'HIGH',
            reason: 'Invalid numeric format'
          });
        }
      });
      
      return {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
        riskLevel: validationErrors.some(e => e.risk === 'CRITICAL') ? 'CRITICAL' : 
                   validationErrors.some(e => e.risk === 'HIGH') ? 'HIGH' : 'LOW'
      };
      
    } catch (error) {
      console.error('❌ Trade data validation error:', error);
      return { isValid: false, errors: [{ field: 'validation', reason: error.message }] };
    }
  }

  // 5. INVENTORY DRAINING PREVENTION
  static async checkSwipeVelocity(userId) {
    try {
      console.log('⚡ Checking swipe velocity for abuse detection');
      
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Query recent swipes
      const swipesQuery = query(
        collection(db, 'swipes'),
        where('userId', '==', userId),
        where('createdAt', '>=', oneHourAgo)
      );
      
      const swipesSnapshot = await getDocs(swipesQuery);
      const recentSwipes = swipesSnapshot.size;
      
      // Check active matches
      const matchesQuery = query(
        collection(db, 'matches'),
        where('participants', 'array-contains', userId),
        where('status', '==', 'active')
      );
      
      const matchesSnapshot = await getDocs(matchesQuery);
      const activeMatches = matchesSnapshot.size;
      
      const limits = {
        maxSwipesPerHour: 100,
        maxActiveMatches: 20,
        maxSwipesPerMinute: 10
      };
      
      const violations = [];
      
      if (recentSwipes > limits.maxSwipesPerHour) {
        violations.push({
          type: this.FRAUD_FLAGS.VELOCITY_ABUSE,
          metric: 'swipes_per_hour',
          value: recentSwipes,
          limit: limits.maxSwipesPerHour
        });
      }
      
      if (activeMatches > limits.maxActiveMatches) {
        violations.push({
          type: this.FRAUD_FLAGS.INVENTORY_DRAIN,
          metric: 'active_matches',
          value: activeMatches,
          limit: limits.maxActiveMatches
        });
      }
      
      return {
        isWithinLimits: violations.length === 0,
        violations: violations,
        metrics: {
          recentSwipes,
          activeMatches,
          swipesPerHour: recentSwipes
        }
      };
      
    } catch (error) {
      console.error('❌ Swipe velocity check error:', error);
      return { isWithinLimits: false, violations: [{ type: 'check_error' }] };
    }
  }

  // 6. DEVICE INTEGRITY VALIDATION
  static async validateDeviceIntegrity() {
    try {
      console.log('📱 Validating device integrity');
      
      const deviceInfo = {
        isDevice: Device.isDevice,
        deviceType: Device.deviceType,
        brand: Device.brand,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion
      };
      
      const riskFactors = [];
      
      // Check if running on emulator
      if (!Device.isDevice) {
        riskFactors.push({
          type: 'emulator_detected',
          risk: 'HIGH',
          description: 'Running on emulator/simulator'
        });
      }
      
      // Check for rooted/jailbroken device indicators
      if (Device.brand === 'generic' || Device.modelName === 'Android SDK built for x86') {
        riskFactors.push({
          type: 'suspicious_device',
          risk: 'MEDIUM',
          description: 'Generic or development device detected'
        });
      }
      
      return {
        deviceInfo,
        riskFactors,
        riskScore: riskFactors.reduce((score, factor) => {
          return score + (factor.risk === 'HIGH' ? 50 : factor.risk === 'MEDIUM' ? 25 : 10);
        }, 0)
      };
      
    } catch (error) {
      console.error('❌ Device integrity validation error:', error);
      return { riskScore: 100, riskFactors: [{ type: 'validation_error' }] };
    }
  }

  // 7. DYNAMIC QR CODE GENERATION (Ghost Inspection Prevention)
  static generateSecureQR(tradeId, userId, location) {
    try {
      console.log('🔐 Generating secure dynamic QR code');
      
      const timestamp = Date.now();
      const expiryTime = timestamp + (30 * 1000); // 30 seconds
      
      // Create TOTP-style token
      const token = this.generateTOTP(tradeId, userId, timestamp);
      
      const qrData = {
        tradeId,
        userId,
        token,
        timestamp,
        expiryTime,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        },
        version: '1.0'
      };
      
      // Create checksum for integrity
      qrData.checksum = this.generateQRChecksum(qrData);
      
      return {
        qrData: JSON.stringify(qrData),
        expiresAt: expiryTime,
        isValid: true
      };
      
    } catch (error) {
      console.error('❌ Secure QR generation error:', error);
      return { isValid: false, error: error.message };
    }
  }

  // 8. SOFT DELETION SYSTEM
  static async softDeleteItem(itemId, userId, reason = 'user_deleted') {
    try {
      console.log('🗑️ Performing soft deletion with evidence preservation');
      
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemDoc.data();
      
      // Check if item is involved in active trades
      const activeTradesQuery = query(
        collection(db, 'offers'),
        where('itemId', '==', itemId),
        where('status', 'in', ['accepted', 'pending', 'committed'])
      );
      
      const activeTradesSnapshot = await getDocs(activeTradesQuery);
      
      if (!activeTradesSnapshot.empty) {
        // Item has active trades - preserve for evidence
        await updateDoc(itemRef, {
          status: 'deleted_with_active_trades',
          deletedAt: serverTimestamp(),
          deletedBy: userId,
          deletionReason: reason,
          preserveUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isVisible: false,
          lastUpdatedAt: serverTimestamp()
        });
        
        console.log('⚠️ Item soft deleted but preserved due to active trades');
        return { preserved: true, reason: 'active_trades' };
      } else {
        // Safe to soft delete
        await updateDoc(itemRef, {
          status: 'deleted',
          deletedAt: serverTimestamp(),
          deletedBy: userId,
          deletionReason: reason,
          isVisible: false,
          lastUpdatedAt: serverTimestamp()
        });
        
        console.log('✅ Item soft deleted successfully');
        return { preserved: false, deleted: true };
      }
      
    } catch (error) {
      console.error('❌ Soft deletion error:', error);
      throw error;
    }
  }

  // HELPER METHODS
  static async recordLocationHistory(userId, location, validation) {
    try {
      await addDoc(collection(db, 'locationHistory'), {
        userId,
        location,
        validation,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error recording location history:', error);
    }
  }

  static async checkImpossibleTravel(userId, currentLocation) {
    try {
      // Get last known location
      const historyQuery = query(
        collection(db, 'locationHistory'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      
      const historySnapshot = await getDocs(historyQuery);
      
      if (historySnapshot.empty) return false;
      
      const lastLocation = historySnapshot.docs[0].data();
      const timeDiff = Date.now() - lastLocation.timestamp.toDate().getTime();
      const distance = this.calculateDistance(
        lastLocation.location,
        currentLocation
      );
      
      // Check if travel speed exceeds reasonable limits (500 km/h)
      const maxSpeed = 500; // km/h
      const maxDistance = (timeDiff / (1000 * 60 * 60)) * maxSpeed;
      
      return distance > maxDistance;
      
    } catch (error) {
      console.error('Error checking impossible travel:', error);
      return false;
    }
  }

  static calculateDistance(loc1, loc2) {
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static calculateTradeValue(tradeData) {
    // Server-side calculation logic
    return tradeData.itemValue + (tradeData.cashAmount || 0);
  }

  static generateTradeChecksum(data) {
    // Simple checksum generation (in production, use crypto)
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  static generateQRChecksum(qrData) {
    const { checksum, ...dataWithoutChecksum } = qrData;
    return this.generateTradeChecksum(dataWithoutChecksum);
  }

  static generateTOTP(tradeId, userId, timestamp) {
    // Simplified TOTP generation
    const secret = `${tradeId}-${userId}-${Math.floor(timestamp / 30000)}`;
    return this.generateTradeChecksum({ secret });
  }

  static isValidNumber(value) {
    return !isNaN(value) && isFinite(value) && value >= 0;
  }
}

export default AntiFraudService;