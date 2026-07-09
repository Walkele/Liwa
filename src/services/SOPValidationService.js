import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export class SOPValidationService {
  
  // SOP Validation Rules
  static VALIDATION_RULES = {
    // Item Posting Validation
    ITEM_POSTING: {
      requiredFields: ['photos', 'title', 'category', 'estimatedValue'],
      prohibitedContent: ['weapons', 'drugs', 'adult_content'],
      minPhotos: 1,
      maxPhotos: 10,
      titleMinLength: 5,
      titleMaxLength: 100
    },
    
    // Proposal Validation
    PROPOSAL: {
      maxCashAmount: 10000,
      minItemValue: 1,
      maxActiveProposals: 5
    },
    
    // Meeting Validation
    MEETING: {
      maxDistanceForConfirmation: 0.1, // 100 meters in km
      minMeetingNotice: 1, // 1 hour minimum notice
      maxMeetingDelay: 24 // 24 hours maximum
    },
    
    // Trust Score Validation
    TRUST_SCORE: {
      minScoreForHighValueTrades: 70,
      penaltyForCancellation: -10,
      penaltyForNoShow: -20,
      penaltyForFalseItem: -50
    }
  };

  // Validate Item Posting (SOP Section 1)
  static async validateItemPosting(itemData) {
    const errors = [];
    const warnings = [];

    // Check required fields
    for (const field of this.VALIDATION_RULES.ITEM_POSTING.requiredFields) {
      if (!itemData[field] || (Array.isArray(itemData[field]) && itemData[field].length === 0)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate photos
    if (itemData.photos) {
      if (itemData.photos.length < this.VALIDATION_RULES.ITEM_POSTING.minPhotos) {
        errors.push(`Minimum ${this.VALIDATION_RULES.ITEM_POSTING.minPhotos} photo required`);
      }
      if (itemData.photos.length > this.VALIDATION_RULES.ITEM_POSTING.maxPhotos) {
        errors.push(`Maximum ${this.VALIDATION_RULES.ITEM_POSTING.maxPhotos} photos allowed`);
      }
    }

    // Validate title
    if (itemData.title) {
      if (itemData.title.length < this.VALIDATION_RULES.ITEM_POSTING.titleMinLength) {
        errors.push(`Title must be at least ${this.VALIDATION_RULES.ITEM_POSTING.titleMinLength} characters`);
      }
      if (itemData.title.length > this.VALIDATION_RULES.ITEM_POSTING.titleMaxLength) {
        errors.push(`Title must be less than ${this.VALIDATION_RULES.ITEM_POSTING.titleMaxLength} characters`);
      }
    }

    // AI Content Check (simulated)
    const contentCheck = await this.performAIContentCheck(itemData);
    if (!contentCheck.passed) {
      errors.push(`Policy Violation: ${contentCheck.reason}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      contentCheck
    };
  }

  // Validate Matching Logic (SOP Section 2)
  static async validateMatching(userA, userB, itemA, itemB) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      matchType: null
    };

    // Check if users have already interacted
    const existingMatch = await this.checkExistingMatch(userA, userB);
    if (existingMatch) {
      if (existingMatch.status === 'blocked') {
        validation.valid = false;
        validation.errors.push('Users have blocked each other');
        return validation;
      }
      validation.matchType = 'rematch';
      validation.warnings.push('Users have matched before');
    } else {
      validation.matchType = 'first_match';
    }

    // Check item availability
    const itemAAvailable = await this.checkItemAvailability(itemA);
    const itemBAvailable = await this.checkItemAvailability(itemB);

    if (!itemAAvailable.available) {
      validation.valid = false;
      validation.errors.push(`Item A is ${itemAAvailable.status}`);
    }

    if (!itemBAvailable.available) {
      validation.valid = false;
      validation.errors.push(`Item B is ${itemBAvailable.status}`);
    }

    return validation;
  }

  // Validate Proposal (SOP Section 3)
  static async validateProposal(proposalData, proposerUserId) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check item locks
    const itemsLocked = await this.checkItemsLocked([
      proposalData.proposerItemId,
      proposalData.targetItemId
    ]);

    if (itemsLocked.hasLockedItems) {
      validation.valid = false;
      validation.errors.push(`Items currently unavailable: ${itemsLocked.lockedItems.join(', ')}`);
      return validation;
    }

    // Validate cash amount
    if (proposalData.cashAmount > this.VALIDATION_RULES.PROPOSAL.maxCashAmount) {
      validation.valid = false;
      validation.errors.push(`Cash amount exceeds maximum of $${this.VALIDATION_RULES.PROPOSAL.maxCashAmount}`);
    }

    // Check user balance
    if (proposalData.cashAmount > 0) {
      const balanceCheck = await this.checkUserBalance(proposerUserId, proposalData.cashAmount);
      if (!balanceCheck.sufficient) {
        validation.valid = false;
        validation.errors.push('Insufficient balance. Please link payment method.');
      }
    }

    // Check active proposals limit
    const activeProposals = await this.getUserActiveProposals(proposerUserId);
    if (activeProposals >= this.VALIDATION_RULES.PROPOSAL.maxActiveProposals) {
      validation.valid = false;
      validation.errors.push(`Maximum ${this.VALIDATION_RULES.PROPOSAL.maxActiveProposals} active proposals allowed`);
    }

    // Value comparison warning
    if (proposalData.proposerItemValue && proposalData.targetItemValue) {
      const valueDifference = Math.abs(proposalData.proposerItemValue - proposalData.targetItemValue);
      const percentDifference = (valueDifference / Math.max(proposalData.proposerItemValue, proposalData.targetItemValue)) * 100;
      
      if (percentDifference > 50) {
        validation.warnings.push('Large value difference detected. Consider adjusting cash amount.');
      }
    }

    return validation;
  }

  // Validate Acceptance (SOP Section 4)
  static async validateAcceptance(conversationId, acceptingUserId) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check if trade is still valid
    const tradeDoc = await getDoc(doc(db, 'trades', conversationId));
    if (!tradeDoc.exists()) {
      validation.valid = false;
      validation.errors.push('Trade not found');
      return validation;
    }

    const tradeData = tradeDoc.data();

    // Check if proposal is still active
    if (tradeData.state !== 'proposed') {
      validation.valid = false;
      validation.errors.push('Proposal is no longer active');
      return validation;
    }

    // Check if items are still available
    const itemsAvailable = await this.checkItemsAvailable([
      tradeData.currentProposal.proposerItemId,
      tradeData.currentProposal.targetItemId
    ]);

    if (!itemsAvailable.allAvailable) {
      validation.valid = false;
      validation.errors.push('One or more items are no longer available');
      return validation;
    }

    // Check user's trust score for high-value trades
    const totalValue = (tradeData.currentProposal.proposerItemValue || 0) + 
                      (tradeData.currentProposal.targetItemValue || 0) + 
                      (tradeData.currentProposal.cashAmount || 0);

    if (totalValue > 500) {
      const trustScore = await this.getUserTrustScore(acceptingUserId);
      if (trustScore < this.VALIDATION_RULES.TRUST_SCORE.minScoreForHighValueTrades) {
        validation.warnings.push('Low trust score for high-value trade. Consider building trust with smaller trades first.');
      }
    }

    return validation;
  }

  // Validate Meeting Setup (SOP Section 5)
  static async validateMeetingSetup(conversationId, meetingData, schedulingUserId) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check meeting time
    const meetingTime = new Date(meetingData.scheduledTime);
    const now = new Date();
    const hoursUntilMeeting = (meetingTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilMeeting < this.VALIDATION_RULES.MEETING.minMeetingNotice) {
      validation.valid = false;
      validation.errors.push(`Meeting must be scheduled at least ${this.VALIDATION_RULES.MEETING.minMeetingNotice} hour(s) in advance`);
    }

    if (hoursUntilMeeting > this.VALIDATION_RULES.MEETING.maxMeetingDelay) {
      validation.warnings.push(`Meeting scheduled far in advance (${Math.round(hoursUntilMeeting)} hours). Consider scheduling closer to trade acceptance.`);
    }

    // Validate location
    if (!meetingData.location || !meetingData.location.latitude || !meetingData.location.longitude) {
      validation.valid = false;
      validation.errors.push('Valid meeting location required');
    }

    // Check if location is a safe zone
    const safeZoneCheck = await this.checkSafeZone(meetingData.location);
    if (!safeZoneCheck.isSafe) {
      validation.warnings.push('Consider meeting at a designated Safe Exchange Zone for added security.');
    }

    return validation;
  }

  // Validate Arrival (SOP Section 6)
  static async validateArrival(conversationId, userId, userLocation) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      distance: null,
      otherUserPresent: false
    };

    // Get trade data
    const tradeDoc = await getDoc(doc(db, 'trades', conversationId));
    if (!tradeDoc.exists()) {
      validation.valid = false;
      validation.errors.push('Trade not found');
      return validation;
    }

    const tradeData = tradeDoc.data();

    // Check if meeting location is set
    if (!tradeData.meetupLocation) {
      validation.valid = false;
      validation.errors.push('Meeting location not set');
      return validation;
    }

    // Calculate distance to meeting location
    const distance = this.calculateDistance(userLocation, tradeData.meetupLocation);
    validation.distance = distance;

    if (distance > this.VALIDATION_RULES.MEETING.maxDistanceForConfirmation) {
      validation.valid = false;
      validation.errors.push(`You must be within ${this.VALIDATION_RULES.MEETING.maxDistanceForConfirmation * 1000}m of the meeting location`);
      return validation;
    }

    // Check if other user is present
    const otherUserId = tradeData.userA === userId ? tradeData.userB : tradeData.userA;
    const otherUserLocation = await this.getUserCurrentLocation(otherUserId);
    
    if (otherUserLocation) {
      const distanceToOtherUser = this.calculateDistance(userLocation, otherUserLocation);
      validation.otherUserPresent = distanceToOtherUser <= this.VALIDATION_RULES.MEETING.maxDistanceForConfirmation;
      
      if (!validation.otherUserPresent) {
        validation.warnings.push("Your partner isn't at the location yet.");
      }
    }

    return validation;
  }

  // Validate QR Exchange (SOP Section 7)
  static async validateQRExchange(conversationId, scanningUserId, scannedUserId) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check if both users are present
    const arrivalValidation = await this.validateBothUsersPresent(conversationId);
    if (!arrivalValidation.bothPresent) {
      validation.valid = false;
      validation.errors.push('Both users must be present for QR exchange');
      return validation;
    }

    // Check if this is a valid scan sequence
    const tradeDoc = await getDoc(doc(db, 'trades', conversationId));
    const tradeData = tradeDoc.data();

    // Prevent double scanning
    const scanKey = `${scanningUserId}_scanned_${scannedUserId}`;
    if (tradeData[scanKey]) {
      validation.valid = false;
      validation.errors.push('This scan has already been completed');
      return validation;
    }

    // Check if users are scanning in correct order (if enforced)
    const otherScanKey = `${scannedUserId}_scanned_${scanningUserId}`;
    if (tradeData[otherScanKey] && !tradeData.allowSimultaneousScanning) {
      validation.warnings.push('Other user has already scanned. Complete your scan to finalize trade.');
    }

    return validation;
  }

  // Helper Methods
  static async performAIContentCheck(itemData) {
    // Simulated AI content check
    const prohibitedKeywords = ['weapon', 'gun', 'drug', 'illegal'];
    const title = (itemData.title || '').toLowerCase();
    const description = (itemData.description || '').toLowerCase();
    
    for (const keyword of prohibitedKeywords) {
      if (title.includes(keyword) || description.includes(keyword)) {
        return {
          passed: false,
          reason: `Prohibited content detected: ${keyword}`
        };
      }
    }
    
    return { passed: true };
  }

  static async checkExistingMatch(userA, userB) {
    const conversationId = [userA, userB].sort().join('_');
    const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
    return conversationDoc.exists() ? conversationDoc.data() : null;
  }

  static async checkItemAvailability(itemId) {
    const itemDoc = await getDoc(doc(db, 'items', itemId));
    if (!itemDoc.exists()) {
      return { available: false, status: 'not_found' };
    }
    
    const itemData = itemDoc.data();
    return {
      available: itemData.status === 'available',
      status: itemData.status
    };
  }

  static async checkItemsLocked(itemIds) {
    const lockedItems = [];
    
    for (const itemId of itemIds) {
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      if (itemDoc.exists()) {
        const itemData = itemDoc.data();
        if (itemData.status === 'locked_in_trade' || itemData.status === 'reserved') {
          lockedItems.push(itemId);
        }
      }
    }
    
    return {
      hasLockedItems: lockedItems.length > 0,
      lockedItems
    };
  }

  static async checkItemsAvailable(itemIds) {
    const unavailableItems = [];
    
    for (const itemId of itemIds) {
      const availability = await this.checkItemAvailability(itemId);
      if (!availability.available) {
        unavailableItems.push(itemId);
      }
    }
    
    return {
      allAvailable: unavailableItems.length === 0,
      unavailableItems
    };
  }

  static async checkUserBalance(userId, amount) {
    // Simulated balance check
    return {
      sufficient: true,
      balance: 1000 // Mock balance
    };
  }

  static async getUserActiveProposals(userId) {
    const proposalsQuery = query(
      collection(db, 'messages'),
      where('senderId', '==', userId),
      where('messageType', '==', 'formal_proposal'),
      where('status', '==', 'active')
    );
    
    const proposalsSnapshot = await getDocs(proposalsQuery);
    return proposalsSnapshot.size;
  }

  static async getUserTrustScore(userId) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? (userDoc.data().trustScore || 50) : 50;
  }

  static async checkSafeZone(location) {
    // Check if location is a designated safe exchange zone
    // This would integrate with a database of safe zones
    return {
      isSafe: false, // Default to false for safety
      nearestSafeZone: null
    };
  }

  static async getUserCurrentLocation(userId) {
    // Get user's current location from active session
    // This would integrate with real-time location tracking
    return null;
  }

  static async validateBothUsersPresent(conversationId) {
    const tradeDoc = await getDoc(doc(db, 'trades', conversationId));
    if (!tradeDoc.exists()) {
      return { bothPresent: false };
    }
    
    const tradeData = tradeDoc.data();
    return {
      bothPresent: tradeData.userAArrivedAt && tradeData.userBArrivedAt
    };
  }

  static calculateDistance(loc1, loc2) {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Comprehensive SOP Compliance Check
  static async validateFullTradeCompliance(conversationId) {
    const compliance = {
      overall: true,
      phases: {},
      errors: [],
      warnings: []
    };

    try {
      const tradeDoc = await getDoc(doc(db, 'trades', conversationId));
      if (!tradeDoc.exists()) {
        compliance.overall = false;
        compliance.errors.push('Trade not found');
        return compliance;
      }

      const tradeData = tradeDoc.data();

      // Phase A: Discovery Chat
      compliance.phases.discovery = {
        completed: tradeData.state !== 'matched',
        compliant: true
      };

      // Phase B: Formal Proposal
      compliance.phases.proposal = {
        completed: ['proposed', 'accepted', 'arrived', 'exchanged', 'finalized'].includes(tradeData.state),
        compliant: tradeData.currentProposal ? true : false
      };

      // Phase C: Acceptance/Lock
      compliance.phases.acceptance = {
        completed: ['accepted', 'arrived', 'exchanged', 'finalized'].includes(tradeData.state),
        compliant: tradeData.acceptedAt ? true : false
      };

      // Meeting Setup
      compliance.phases.meeting = {
        completed: tradeData.meetupLocation ? true : false,
        compliant: tradeData.swapKey ? true : false
      };

      // Arrival Confirmation
      compliance.phases.arrival = {
        completed: tradeData.userAArrivedAt && tradeData.userBArrivedAt,
        compliant: true
      };

      // QR Exchange
      compliance.phases.qrExchange = {
        completed: tradeData.state === 'finalized',
        compliant: tradeData.finalizedAt ? true : false
      };

      // Check overall compliance
      for (const phase of Object.values(compliance.phases)) {
        if (!phase.compliant) {
          compliance.overall = false;
          compliance.errors.push(`Phase ${phase} not compliant with SOP`);
        }
      }

      return compliance;

    } catch (error) {
      compliance.overall = false;
      compliance.errors.push(`Compliance check failed: ${error.message}`);
      return compliance;
    }
  }
}