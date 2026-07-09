import { doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UnifiedMessageService } from './UnifiedMessageService';
import { BilateralTradeConfirmationService } from './BilateralTradeConfirmationService';

export class SOPCompliantTradeService {
  
  // Trade States according to SOP
  static TRADE_STATES = {
    MATCHED: 'matched',           // "We like each other's stuff"
    PROPOSED: 'proposed',         // "Here is my specific offer (Items + Cash)"
    ACCEPTED: 'accepted',         // "I agree. Let's meet" (Items are now Locked)
    ARRIVED: 'arrived',           // "I am at the GPS location"
    EXCHANGED: 'exchanged',       // "QR codes scanned. Both parties satisfied"
    FINALIZED: 'finalized',       // "Funds released and inventories updated"
    CANCELLED: 'cancelled',       // Trade cancelled
    DISPUTED: 'disputed',         // Issue during exchange
    EXPIRED: 'expired'            // 24-hour timer expired
  };

  // Item Lock States
  static ITEM_STATES = {
    AVAILABLE: 'available',
    RESERVED: 'reserved',         // Soft lock during proposal
    LOCKED_IN_TRADE: 'locked_in_trade', // Hard lock after acceptance
    TRADED: 'traded',
    DISPUTED: 'disputed'
  };

  // SOP Phase A: Discovery Chat (Pre-Proposal)
  static async initializeDiscoveryChat(conversationId, userA, userB, itemA, itemB) {
    try {
      console.log('🔄 Initializing discovery chat per SOP');
      
      // Create system message per SOP
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        "🎉 You matched! Discuss the items or send a formal Swap Proposal to lock the deal.",
        'discovery_chat',
        'matched',
        {
          phase: 'discovery',
          userA,
          userB,
          itemA: itemA.id,
          itemB: itemB.id,
          hasActionButtons: true,
          actionButtonText: 'Propose Swap'
        }
      );

      // Create trade record
      await setDoc(doc(db, 'trades', conversationId), {
        conversationId,
        userA,
        userB,
        itemA: itemA.id,
        itemB: itemB.id,
        state: this.TRADE_STATES.MATCHED,
        phase: 'discovery',
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        chatSnapshot: null,
        expiresAt: null
      });

      return { success: true, state: this.TRADE_STATES.MATCHED };
      
    } catch (error) {
      console.error('❌ Error initializing discovery chat:', error);
      throw error;
    }
  }

  // SOP Phase B: Formal Proposal (The "Handshake")
  static async createFormalProposal(conversationId, proposerUserId, proposalData) {
    try {
      console.log('🔄 Creating formal proposal per SOP');
      
      // Validate items are available
      const itemsAvailable = await this.validateItemsAvailable([
        proposalData.proposerItemId,
        proposalData.targetItemId
      ]);
      
      if (!itemsAvailable.valid) {
        throw new Error(`Item Currently Unavailable: ${itemsAvailable.unavailableItems.join(', ')}`);
      }

      // Validate cash balance if top-up involved
      if (proposalData.cashAmount > 0) {
        const balanceValid = await this.validateUserBalance(proposerUserId, proposalData.cashAmount);
        if (!balanceValid) {
          throw new Error('Insufficient balance. Please link payment method.');
        }
      }

      // Soft lock items (RESERVED state)
      await this.updateItemStates([
        proposalData.proposerItemId,
        proposalData.targetItemId
      ], this.ITEM_STATES.RESERVED);

      // Create proposal message
      const proposalMessage = await UnifiedMessageService.createSystemMessage(
        conversationId,
        this.formatProposalMessage(proposalData),
        'formal_proposal',
        'proposed',
        {
          ...proposalData,
          phase: 'proposal',
          hasActionButtons: true,
          actionButtons: ['Accept', 'Counter', 'Decline']
        }
      );

      // Update trade state
      await updateDoc(doc(db, 'trades', conversationId), {
        state: this.TRADE_STATES.PROPOSED,
        phase: 'proposal',
        currentProposal: proposalData,
        proposalMessageId: proposalMessage.id,
        lastUpdated: serverTimestamp()
      });

      return { success: true, state: this.TRADE_STATES.PROPOSED, messageId: proposalMessage.id };
      
    } catch (error) {
      console.error('❌ Error creating formal proposal:', error);
      throw error;
    }
  }

  // SOP Phase C: Modification Flow (Counter/Accept)
  static async handleProposalResponse(conversationId, responseType, responseData, respondingUserId) {
    try {
      console.log(`🔄 Handling proposal response: ${responseType}`);
      
      const tradeDoc = await getDoc(doc(db, 'trades', conversationId));
      if (!tradeDoc.exists()) {
        throw new Error('Trade not found');
      }

      const tradeData = tradeDoc.data();

      switch (responseType) {
        case 'ACCEPT':
          return await this.handleAcceptance(conversationId, tradeData, respondingUserId);
          
        case 'COUNTER':
          return await this.handleCounterOffer(conversationId, responseData, respondingUserId);
          
        case 'DECLINE':
          return await this.handleDecline(conversationId, tradeData, respondingUserId);
          
        default:
          throw new Error('Invalid response type');
      }
      
    } catch (error) {
      console.error('❌ Error handling proposal response:', error);
      throw error;
    }
  }

  // Handle Acceptance - Move to "Trade Mode"
  static async handleAcceptance(conversationId, tradeData, respondingUserId) {
    try {
      // Create chat snapshot hash per SOP
      const chatSnapshot = await this.createChatSnapshot(conversationId);
      
      // Hard lock items (LOCKED_IN_TRADE state)
      await this.updateItemStates([
        tradeData.currentProposal.proposerItemId,
        tradeData.currentProposal.targetItemId
      ], this.ITEM_STATES.LOCKED_IN_TRADE);

      // Start 24-hour countdown timer
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Update trade state
      await updateDoc(doc(db, 'trades', conversationId), {
        state: this.TRADE_STATES.ACCEPTED,
        phase: 'trade_mode',
        acceptedAt: serverTimestamp(),
        acceptedBy: respondingUserId,
        chatSnapshot,
        expiresAt,
        lastUpdated: serverTimestamp()
      });

      // Send acceptance message
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        "✅ Proposal accepted! Trade is now locked. You have 24 hours to complete the exchange.",
        'proposal_accepted',
        'accepted',
        {
          acceptedBy: respondingUserId,
          expiresAt,
          hasActionButtons: true,
          actionButtonText: 'Set Meetup Location'
        }
      );

      // Initialize bilateral confirmation system
      await BilateralTradeConfirmationService.confirmTradeStep(
        conversationId,
        'contact_exchange',
        respondingUserId,
        { acceptedProposal: true }
      );

      return { success: true, state: this.TRADE_STATES.ACCEPTED };
      
    } catch (error) {
      console.error('❌ Error handling acceptance:', error);
      throw error;
    }
  }

  // Handle Counter Offer - Void previous and create new
  static async handleCounterOffer(conversationId, counterData, respondingUserId) {
    try {
      // Void previous proposal
      await this.voidPreviousProposal(conversationId);
      
      // Create new proposal
      return await this.createFormalProposal(conversationId, respondingUserId, counterData);
      
    } catch (error) {
      console.error('❌ Error handling counter offer:', error);
      throw error;
    }
  }

  // Handle Decline
  static async handleDecline(conversationId, tradeData, respondingUserId) {
    try {
      // Release item locks
      if (tradeData.currentProposal) {
        await this.updateItemStates([
          tradeData.currentProposal.proposerItemId,
          tradeData.currentProposal.targetItemId
        ], this.ITEM_STATES.AVAILABLE);
      }

      // Update trade state
      await updateDoc(doc(db, 'trades', conversationId), {
        state: this.TRADE_STATES.CANCELLED,
        cancelledBy: respondingUserId,
        cancelledAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });

      // Send decline message
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        "❌ Proposal declined. Items are now available again.",
        'proposal_declined',
        'declined',
        {
          declinedBy: respondingUserId,
          hasActionButtons: true,
          actionButtonText: 'Try New Offer'
        }
      );

      return { success: true, state: this.TRADE_STATES.CANCELLED };
      
    } catch (error) {
      console.error('❌ Error handling decline:', error);
      throw error;
    }
  }

  // SOP Step 1: Meetup Scheduling
  static async scheduleMeetup(conversationId, locationData, schedulingUserId) {
    try {
      console.log('🔄 Scheduling meetup per SOP');
      
      // Generate Dynamic Swap Key (QR Code)
      const swapKey = this.generateSwapKey(conversationId);
      
      // Update trade with meetup details
      await updateDoc(doc(db, 'trades', conversationId), {
        meetupLocation: locationData,
        swapKey,
        scheduledBy: schedulingUserId,
        scheduledAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });

      // Send meetup message
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        `📍 Meetup scheduled at ${locationData.name}\n\n🔑 Your swap key has been generated. Both parties must be present to complete the exchange.`,
        'meetup_scheduled',
        'scheduled',
        {
          location: locationData,
          swapKey,
          hasActionButtons: true,
          actionButtonText: "I'm Here"
        }
      );

      return { success: true, swapKey };
      
    } catch (error) {
      console.error('❌ Error scheduling meetup:', error);
      throw error;
    }
  }

  // SOP Step 2: Arrival Check
  static async confirmArrival(conversationId, userId, userLocation) {
    try {
      console.log('🔄 Confirming arrival per SOP');
      
      const tradeDoc = await getDoc(doc(db, 'trades', conversationId));
      const tradeData = tradeDoc.data();
      
      // Check if other user is within 100m (per SOP)
      const otherUserId = tradeData.userA === userId ? tradeData.userB : tradeData.userA;
      const otherUserLocation = await this.getUserLocation(otherUserId);
      
      if (otherUserLocation) {
        const distance = this.calculateDistance(userLocation, otherUserLocation);
        if (distance > 0.1) { // 100 meters = 0.1 km
          await UnifiedMessageService.createSystemMessage(
            conversationId,
            "⚠️ Your partner isn't at the location yet. Please wait for them to arrive.",
            'arrival_waiting',
            'waiting',
            { distance, hasActionButtons: false }
          );
          return { success: false, reason: 'partner_not_present', distance };
        }
      }

      // Update arrival status
      const arrivalField = tradeData.userA === userId ? 'userAArrivedAt' : 'userBArrivedAt';
      await updateDoc(doc(db, 'trades', conversationId), {
        [arrivalField]: serverTimestamp(),
        [`${userId}_location`]: userLocation,
        lastUpdated: serverTimestamp()
      });

      // Check if both arrived
      const bothArrived = tradeData.userAArrivedAt && tradeData.userBArrivedAt;
      if (bothArrived) {
        await this.initiateMutualQRExchange(conversationId);
      }

      return { success: true, bothArrived };
      
    } catch (error) {
      console.error('❌ Error confirming arrival:', error);
      throw error;
    }
  }

  // SOP Step 3: Double-Handshake (Mutual QR Exchange)
  static async initiateMutualQRExchange(conversationId) {
    try {
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        "🤝 Both parties have arrived! Time for the mutual QR exchange.\n\n1. First person scans the other's QR code\n2. Confirm item condition\n3. Second person scans and confirms\n4. Trade complete!",
        'mutual_qr_ready',
        'ready_for_exchange',
        {
          hasActionButtons: true,
          actionButtonText: 'Start QR Exchange'
        }
      );

      await updateDoc(doc(db, 'trades', conversationId), {
        state: this.TRADE_STATES.ARRIVED,
        readyForExchange: true,
        lastUpdated: serverTimestamp()
      });
      
    } catch (error) {
      console.error('❌ Error initiating mutual QR exchange:', error);
      throw error;
    }
  }

  // Handle QR Scan and Confirmation
  static async handleQRScan(conversationId, scanningUserId, scannedUserId, itemConditionConfirmed) {
    try {
      console.log('🔄 Handling QR scan per SOP');
      
      const tradeDoc = await getDoc(doc(db, 'trades', conversationId));
      const tradeData = tradeDoc.data();

      if (!itemConditionConfirmed) {
        // Handle "Item Not as Described" scenario
        return await this.handleItemIssue(conversationId, scanningUserId, 'item_not_as_described');
      }

      // Record the scan
      const scanField = `${scanningUserId}_scanned_${scannedUserId}`;
      await updateDoc(doc(db, 'trades', conversationId), {
        [scanField]: serverTimestamp(),
        [`${scanField}_confirmed`]: itemConditionConfirmed,
        lastUpdated: serverTimestamp()
      });

      // Check if both scans are complete
      const userAScannedB = tradeData[`${tradeData.userA}_scanned_${tradeData.userB}`];
      const userBScannedA = tradeData[`${tradeData.userB}_scanned_${tradeData.userA}`];
      
      if (userAScannedB && userBScannedA) {
        return await this.finalizeTrade(conversationId);
      } else {
        await UnifiedMessageService.createSystemMessage(
          conversationId,
          "✅ First scan complete! Waiting for second person to scan and confirm.",
          'partial_scan_complete',
          'partially_confirmed',
          { hasActionButtons: false }
        );
        
        return { success: true, bothScanned: false };
      }
      
    } catch (error) {
      console.error('❌ Error handling QR scan:', error);
      throw error;
    }
  }

  // Finalize Trade (Both QR scans complete)
  static async finalizeTrade(conversationId) {
    try {
      console.log('🎉 Finalizing trade per SOP');
      
      const tradeDoc = await getDoc(doc(db, 'trades', conversationId));
      const tradeData = tradeDoc.data();

      // Transfer item ownership
      await this.transferItemOwnership(
        tradeData.currentProposal.proposerItemId,
        tradeData.currentProposal.targetUserId
      );
      
      await this.transferItemOwnership(
        tradeData.currentProposal.targetItemId,
        tradeData.currentProposal.proposerUserId
      );

      // Release escrow funds if cash involved
      if (tradeData.currentProposal.cashAmount > 0) {
        await this.releaseEscrowFunds(conversationId, tradeData.currentProposal);
      }

      // Update trade state
      await updateDoc(doc(db, 'trades', conversationId), {
        state: this.TRADE_STATES.FINALIZED,
        finalizedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });

      // Generate receipt
      await this.generateTradeReceipt(conversationId, tradeData);

      // Send completion message
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        "🎉 Trade completed successfully! Items have been transferred and funds released. Thank you for using SwipeIt!",
        'trade_finalized',
        'completed',
        {
          finalizedAt: serverTimestamp(),
          hasActionButtons: false
        }
      );

      return { success: true, state: this.TRADE_STATES.FINALIZED };
      
    } catch (error) {
      console.error('❌ Error finalizing trade:', error);
      throw error;
    }
  }

  // Exception Handling: Item Not as Described
  static async handleItemIssue(conversationId, reportingUserId, issueType) {
    try {
      console.log('⚠️ Handling item issue per SOP');
      
      // Update trade state to disputed
      await updateDoc(doc(db, 'trades', conversationId), {
        state: this.TRADE_STATES.DISPUTED,
        disputedBy: reportingUserId,
        disputeReason: issueType,
        disputedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });

      // Keep items locked and notify support
      await UnifiedMessageService.createSystemMessage(
        conversationId,
        "⚠️ Trade disputed due to item condition. Support has been notified. Items remain locked pending resolution.",
        'trade_disputed',
        'disputed',
        {
          disputedBy: reportingUserId,
          reason: issueType,
          hasActionButtons: true,
          actionButtonText: 'Contact Support'
        }
      );

      // Flag user's trust score for review
      await this.flagTrustScore(conversationId, issueType);

      return { success: true, state: this.TRADE_STATES.DISPUTED };
      
    } catch (error) {
      console.error('❌ Error handling item issue:', error);
      throw error;
    }
  }

  // Handle 24-hour expiration
  static async handleTradeExpiration(conversationId) {
    try {
      console.log('⏰ Handling trade expiration per SOP');
      
      const tradeDoc = await getDoc(doc(db, 'trades', conversationId));
      const tradeData = tradeDoc.data();

      // Release item locks
      if (tradeData.currentProposal) {
        await this.updateItemStates([
          tradeData.currentProposal.proposerItemId,
          tradeData.currentProposal.targetItemId
        ], this.ITEM_STATES.AVAILABLE);
      }

      // Check for backup offers
      const backupOffers = await this.getBackupOffers(conversationId);
      
      if (backupOffers.length > 0) {
        // Notify highest-ranked backup offer
        await this.notifyBackupOffer(backupOffers[0]);
      }

      // Update trade state
      await updateDoc(doc(db, 'trades', conversationId), {
        state: this.TRADE_STATES.EXPIRED,
        expiredAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });

      await UnifiedMessageService.createSystemMessage(
        conversationId,
        "⏰ Trade expired after 24 hours. Items are now available again.",
        'trade_expired',
        'expired',
        {
          expiredAt: serverTimestamp(),
          hasActionButtons: true,
          actionButtonText: 'Start New Trade'
        }
      );

      return { success: true, state: this.TRADE_STATES.EXPIRED };
      
    } catch (error) {
      console.error('❌ Error handling trade expiration:', error);
      throw error;
    }
  }

  // Helper Methods
  static async validateItemsAvailable(itemIds) {
    const unavailableItems = [];
    
    for (const itemId of itemIds) {
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      if (!itemDoc.exists() || itemDoc.data().status !== this.ITEM_STATES.AVAILABLE) {
        unavailableItems.push(itemId);
      }
    }
    
    return {
      valid: unavailableItems.length === 0,
      unavailableItems
    };
  }

  static async validateUserBalance(userId, amount) {
    // Implementation depends on payment system
    // For now, return true
    return true;
  }

  static async updateItemStates(itemIds, newState) {
    const promises = itemIds.map(itemId => 
      updateDoc(doc(db, 'items', itemId), {
        status: newState,
        lastUpdated: serverTimestamp()
      })
    );
    
    await Promise.all(promises);
  }

  static formatProposalMessage(proposalData) {
    let message = `💼 Formal Swap Proposal:\n\n`;
    message += `📦 Offering: ${proposalData.proposerItemTitle}\n`;
    message += `🎯 For: ${proposalData.targetItemTitle}\n`;
    
    if (proposalData.cashAmount > 0) {
      message += `💰 Plus: $${proposalData.cashAmount}\n`;
    }
    
    message += `\n⏰ This proposal locks both items if accepted.`;
    
    return message;
  }

  static async createChatSnapshot(conversationId) {
    // Create hash of current chat for SOP compliance
    const messages = await getDocs(
      query(collection(db, 'messages'), where('conversationId', '==', conversationId))
    );
    
    const chatData = messages.docs.map(doc => doc.data());
    return btoa(JSON.stringify(chatData)); // Simple base64 hash
  }

  static generateSwapKey(conversationId) {
    return `SWAP_${conversationId}_${Date.now()}`;
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

  static async voidPreviousProposal(conversationId) {
    // Mark previous proposal as void
    const messages = await getDocs(
      query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('messageType', '==', 'formal_proposal')
      )
    );
    
    const promises = messages.docs.map(doc => 
      updateDoc(doc.ref, {
        status: 'voided',
        voidedAt: serverTimestamp()
      })
    );
    
    await Promise.all(promises);
  }

  static async transferItemOwnership(itemId, newOwnerId) {
    await updateDoc(doc(db, 'items', itemId), {
      ownerId: newOwnerId,
      status: this.ITEM_STATES.TRADED,
      tradedAt: serverTimestamp()
    });
  }

  static async releaseEscrowFunds(conversationId, proposalData) {
    // Implementation depends on payment system
    console.log(`💰 Releasing escrow funds: $${proposalData.cashAmount}`);
  }

  static async generateTradeReceipt(conversationId, tradeData) {
    const receipt = {
      conversationId,
      who: `${tradeData.userA} ↔ ${tradeData.userB}`,
      what: `${tradeData.currentProposal.proposerItemTitle} ↔ ${tradeData.currentProposal.targetItemTitle}`,
      when: serverTimestamp(),
      where: tradeData.meetupLocation,
      condition: 'Both parties confirmed satisfactory condition'
    };
    
    await setDoc(doc(db, 'tradeReceipts', conversationId), receipt);
  }

  static async flagTrustScore(conversationId, issueType) {
    // Implementation for trust score system
    console.log(`🚩 Flagging trust score for issue: ${issueType}`);
  }

  static async getBackupOffers(conversationId) {
    // Implementation for backup offers system
    return [];
  }

  static async notifyBackupOffer(backupOffer) {
    // Implementation for backup offer notifications
    console.log('📢 Notifying backup offer');
  }

  static async getUserLocation(userId) {
    // Implementation to get user's current location
    return null;
  }
}