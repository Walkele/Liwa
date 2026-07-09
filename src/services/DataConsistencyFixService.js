import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export class DataConsistencyFixService {
  // Fix missing user documents
  static async ensureUserDocumentExists(userId, userEmail = null, displayName = null) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnapshot = await getDoc(userRef);
      
      if (!userSnapshot.exists()) {
        console.log(`Creating missing user document for: ${userId}`);
        
        const userData = {
          uid: userId,
          email: userEmail || `user${userId.substring(0, 8)}@example.com`,
          displayName: displayName || `User ${userId.substring(0, 8)}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          trustScore: 100, // Default trust score
          totalTrades: 0,
          successfulTrades: 0,
          totalViews: 0,
          totalLikes: 0,
          isActive: true,
          profileComplete: false,
          location: {
            city: 'Unknown',
            country: 'Unknown'
          }
        };
        
        await setDoc(userRef, userData);
        console.log(`✅ Created user document for: ${userId}`);
        return userData;
      }
      
      return userSnapshot.data();
    } catch (error) {
      console.error('Error ensuring user document exists:', error);
      throw error;
    }
  }

  // Fix orphaned offers (offers without valid users)
  static async fixOrphanedOffers() {
    try {
      console.log('🔧 Fixing orphaned offers...');
      
      const offersRef = collection(db, 'offers');
      const offersSnapshot = await getDocs(offersRef);
      
      const batch = writeBatch(db);
      let fixedCount = 0;
      
      for (const offerDoc of offersSnapshot.docs) {
        const offer = offerDoc.data();
        
        // Check if buyer exists
        if (offer.buyerId) {
          const buyerRef = doc(db, 'users', offer.buyerId);
          const buyerSnapshot = await getDoc(buyerRef);
          
          if (!buyerSnapshot.exists()) {
            console.log(`Creating missing buyer: ${offer.buyerId}`);
            await this.ensureUserDocumentExists(offer.buyerId);
            fixedCount++;
          }
        }
        
        // Check if seller exists
        if (offer.sellerId) {
          const sellerRef = doc(db, 'users', offer.sellerId);
          const sellerSnapshot = await getDoc(sellerRef);
          
          if (!sellerSnapshot.exists()) {
            console.log(`Creating missing seller: ${offer.sellerId}`);
            await this.ensureUserDocumentExists(offer.sellerId);
            fixedCount++;
          }
        }
      }
      
      if (fixedCount > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Fixed ${fixedCount} orphaned offers`);
      return { success: true, fixedCount };
    } catch (error) {
      console.error('Error fixing orphaned offers:', error);
      throw error;
    }
  }

  // Fix inconsistent offer states
  static async fixOfferStates() {
    try {
      console.log('🔧 Fixing inconsistent offer states...');
      
      const offersRef = collection(db, 'offers');
      const offersSnapshot = await getDocs(offersRef);
      
      const batch = writeBatch(db);
      let fixedCount = 0;
      
      for (const offerDoc of offersSnapshot.docs) {
        const offer = offerDoc.data();
        let needsUpdate = false;
        const updates = {};
        
        // Fix missing timestamps
        if (!offer.createdAt) {
          updates.createdAt = serverTimestamp();
          needsUpdate = true;
        }
        
        if (!offer.updatedAt) {
          updates.updatedAt = serverTimestamp();
          needsUpdate = true;
        }
        
        // Fix invalid status
        const validStatuses = ['pending', 'accepted', 'rejected', 'expired', 'withdrawn', 'voided', 'completed'];
        if (!validStatuses.includes(offer.status)) {
          updates.status = 'expired';
          updates.expiredAt = serverTimestamp();
          needsUpdate = true;
        }
        
        // Fix status-specific timestamps
        if (offer.status === 'accepted' && !offer.acceptedAt) {
          updates.acceptedAt = serverTimestamp();
          needsUpdate = true;
        }
        
        if (offer.status === 'rejected' && !offer.rejectedAt) {
          updates.rejectedAt = serverTimestamp();
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          batch.update(offerDoc.ref, updates);
          fixedCount++;
        }
      }
      
      if (fixedCount > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Fixed ${fixedCount} inconsistent offer states`);
      return { success: true, fixedCount };
    } catch (error) {
      console.error('Error fixing offer states:', error);
      throw error;
    }
  }

  // Fix specific user's offers
  static async fixUserOffers(userId) {
    try {
      console.log(`🔧 Fixing offers for user: ${userId}`);
      
      // First ensure user document exists
      await this.ensureUserDocumentExists(userId);
      
      // Fix offers where user is buyer
      const buyerOffersQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', userId)
      );
      const buyerOffersSnapshot = await getDocs(buyerOffersQuery);
      
      // Fix offers where user is seller
      const sellerOffersQuery = query(
        collection(db, 'offers'),
        where('sellerId', '==', userId)
      );
      const sellerOffersSnapshot = await getDocs(sellerOffersQuery);
      
      const batch = writeBatch(db);
      let fixedCount = 0;
      
      // Process buyer offers
      for (const offerDoc of buyerOffersSnapshot.docs) {
        const offer = offerDoc.data();
        
        // Ensure seller exists
        if (offer.sellerId) {
          await this.ensureUserDocumentExists(offer.sellerId);
        }
        
        // Fix any inconsistent states
        if (offer.status === 'pending' && offer.rejectedAt) {
          batch.update(offerDoc.ref, {
            status: 'rejected',
            updatedAt: serverTimestamp()
          });
          fixedCount++;
        }
      }
      
      // Process seller offers
      for (const offerDoc of sellerOffersSnapshot.docs) {
        const offer = offerDoc.data();
        
        // Ensure buyer exists
        if (offer.buyerId) {
          await this.ensureUserDocumentExists(offer.buyerId);
        }
        
        // Fix any inconsistent states
        if (offer.status === 'pending' && offer.rejectedAt) {
          batch.update(offerDoc.ref, {
            status: 'rejected',
            updatedAt: serverTimestamp()
          });
          fixedCount++;
        }
      }
      
      if (fixedCount > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Fixed ${fixedCount} offers for user: ${userId}`);
      return { success: true, fixedCount };
    } catch (error) {
      console.error(`Error fixing user offers for ${userId}:`, error);
      throw error;
    }
  }

  // Comprehensive data consistency check and fix
  static async performFullConsistencyCheck() {
    try {
      console.log('🔧 Starting comprehensive data consistency check...');
      
      const results = {
        usersFixed: 0,
        offersFixed: 0,
        statesFixed: 0,
        totalIssues: 0
      };
      
      // Step 1: Fix orphaned offers
      const orphanedResult = await this.fixOrphanedOffers();
      results.usersFixed = orphanedResult.fixedCount;
      
      // Step 2: Fix offer states
      const statesResult = await this.fixOfferStates();
      results.statesFixed = statesResult.fixedCount;
      
      // Step 3: Fix conversations without valid participants
      await this.fixOrphanedConversations();
      
      results.totalIssues = results.usersFixed + results.offersFixed + results.statesFixed;
      
      console.log('✅ Comprehensive data consistency check complete:', results);
      return results;
    } catch (error) {
      console.error('Error in comprehensive consistency check:', error);
      throw error;
    }
  }

  // Fix orphaned conversations
  static async fixOrphanedConversations() {
    try {
      console.log('🔧 Fixing orphaned conversations...');
      
      const conversationsRef = collection(db, 'conversations');
      const conversationsSnapshot = await getDocs(conversationsRef);
      
      const batch = writeBatch(db);
      let fixedCount = 0;
      
      for (const conversationDoc of conversationsSnapshot.docs) {
        const conversation = conversationDoc.data();
        
        if (conversation.participants && conversation.participants.length > 0) {
          let needsUpdate = false;
          
          // Ensure all participants exist
          for (const participantId of conversation.participants) {
            const userRef = doc(db, 'users', participantId);
            const userSnapshot = await getDoc(userRef);
            
            if (!userSnapshot.exists()) {
              await this.ensureUserDocumentExists(participantId);
              needsUpdate = true;
              fixedCount++;
            }
          }
          
          // Fix missing timestamps
          if (!conversation.createdAt) {
            batch.update(conversationDoc.ref, {
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            needsUpdate = true;
          }
        }
      }
      
      if (fixedCount > 0) {
        await batch.commit();
      }
      
      console.log(`✅ Fixed ${fixedCount} orphaned conversations`);
      return { success: true, fixedCount };
    } catch (error) {
      console.error('Error fixing orphaned conversations:', error);
      throw error;
    }
  }

  // Quick fix for current user
  static async quickFixCurrentUser(userId, userEmail = null, displayName = null) {
    try {
      console.log(`🚀 Quick fix for current user: ${userId}`);
      
      // Ensure user document exists
      await this.ensureUserDocumentExists(userId, userEmail, displayName);
      
      // Fix user's offers
      await this.fixUserOffers(userId);
      
      console.log(`✅ Quick fix complete for user: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error(`Error in quick fix for user ${userId}:`, error);
      throw error;
    }
  }
}