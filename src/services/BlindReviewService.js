import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TradeStateMachine } from './TradeStateMachine';

export class BlindReviewService {
  
  // Review states
  static REVIEW_STATES = {
    PENDING: 'pending',
    SUBMITTED: 'submitted',
    REVEALED: 'revealed',
    EXPIRED: 'expired'
  };

  // Review types
  static REVIEW_TYPES = {
    TRADE_COMPLETION: 'trade_completion',
    USER_BEHAVIOR: 'user_behavior',
    ITEM_ACCURACY: 'item_accuracy'
  };

  // 1. SUBMIT BLIND REVIEW (Airbnb Model)
  static async submitBlindReview(tradeId, reviewerId, revieweeId, reviewData) {
    try {
      console.log('📝 Submitting blind review for trade:', tradeId);
      
      // Verify trade is completed
      const tradeVerification = await this.verifyTradeCompletion(tradeId, reviewerId);
      if (!tradeVerification.isValid) {
        throw new Error(tradeVerification.reason);
      }
      
      // Check if review already exists
      const existingReview = await this.getExistingReview(tradeId, reviewerId);
      if (existingReview) {
        throw new Error('Review already submitted for this trade');
      }
      
      // Validate review data
      const validation = this.validateReviewData(reviewData);
      if (!validation.isValid) {
        throw new Error(`Invalid review data: ${validation.errors.join(', ')}`);
      }
      
      // Create blind review record
      const reviewRecord = {
        tradeId,
        reviewerId,
        revieweeId,
        
        // Review content (hidden until both submit)
        rating: reviewData.rating,
        comments: reviewData.comments,
        categories: reviewData.categories || {},
        
        // Review metadata
        reviewType: this.REVIEW_TYPES.TRADE_COMPLETION,
        state: this.REVIEW_STATES.SUBMITTED,
        isVisible: false, // Hidden until mutual revelation
        
        // Verification data
        tradeVerified: tradeVerification.verified,
        qrVerified: tradeVerification.qrVerified,
        locationVerified: tradeVerification.locationVerified,
        
        // Timestamps
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };
      
      // Store review
      const reviewRef = await addDoc(collection(db, 'blindReviews'), reviewRecord);
      
      // Check if both parties have now submitted reviews
      const mutualSubmission = await this.checkMutualSubmission(tradeId);
      
      if (mutualSubmission.bothSubmitted) {
        // Reveal both reviews simultaneously
        await this.revealMutualReviews(tradeId, mutualSubmission.reviews);
      }
      
      console.log('✅ Blind review submitted successfully');
      return {
        success: true,
        reviewId: reviewRef.id,
        bothSubmitted: mutualSubmission.bothSubmitted,
        canReveal: mutualSubmission.bothSubmitted
      };
      
    } catch (error) {
      console.error('❌ Error submitting blind review:', error);
      throw error;
    }
  }

  // 2. VERIFY TRADE COMPLETION (Only allow reviews after verified completion)
  static async verifyTradeCompletion(tradeId, userId) {
    try {
      console.log('🔍 Verifying trade completion for review eligibility');
      
      // Get trade record
      const tradeQuery = query(
        collection(db, 'offers'),
        where('id', '==', tradeId),
        where('participants', 'array-contains', userId)
      );
      
      const tradeSnapshot = await getDocs(tradeQuery);
      
      if (tradeSnapshot.empty) {
        return {
          isValid: false,
          reason: 'Trade not found or user not authorized'
        };
      }
      
      const tradeData = tradeSnapshot.docs[0].data();
      
      // Verify trade is completed
      if (tradeData.sopState !== 'trade_completed') {
        return {
          isValid: false,
          reason: 'Trade must be completed before submitting reviews'
        };
      }
      
      // Verify QR completion (prevents fake completions)
      const qrVerified = tradeData.qrVerified || false;
      const locationVerified = tradeData.exchangeLocation ? true : false;
      
      // Check completion method
      const completionMethod = tradeData.completionMethod || 'manual';
      const verified = completionMethod === 'qr_verified' || qrVerified;
      
      return {
        isValid: true,
        verified: verified,
        qrVerified: qrVerified,
        locationVerified: locationVerified,
        completionMethod: completionMethod
      };
      
    } catch (error) {
      console.error('❌ Error verifying trade completion:', error);
      return {
        isValid: false,
        reason: 'Error verifying trade completion'
      };
    }
  }

  // 3. CHECK MUTUAL SUBMISSION
  static async checkMutualSubmission(tradeId) {
    try {
      console.log('🔍 Checking for mutual review submission');
      
      // Get all reviews for this trade
      const reviewsQuery = query(
        collection(db, 'blindReviews'),
        where('tradeId', '==', tradeId),
        where('state', '==', this.REVIEW_STATES.SUBMITTED)
      );
      
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviews = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Check if we have exactly 2 reviews (one from each party)
      const bothSubmitted = reviews.length === 2;
      
      return {
        bothSubmitted,
        reviews,
        count: reviews.length
      };
      
    } catch (error) {
      console.error('❌ Error checking mutual submission:', error);
      return {
        bothSubmitted: false,
        reviews: [],
        count: 0
      };
    }
  }

  // 4. REVEAL MUTUAL REVIEWS (Airbnb Model)
  static async revealMutualReviews(tradeId, reviews) {
    try {
      console.log('🎭 Revealing mutual reviews simultaneously');
      
      if (reviews.length !== 2) {
        throw new Error('Cannot reveal reviews: both parties must submit first');
      }
      
      // Update both reviews to be visible
      const updatePromises = reviews.map(review => 
        updateDoc(doc(db, 'blindReviews', review.id), {
          state: this.REVIEW_STATES.REVEALED,
          isVisible: true,
          revealedAt: serverTimestamp(),
          lastUpdatedAt: serverTimestamp()
        })
      );
      
      await Promise.all(updatePromises);
      
      // Update trade record with review completion
      await this.updateTradeWithReviews(tradeId, reviews);
      
      // Calculate and update user ratings
      await this.updateUserRatings(reviews);
      
      console.log('✅ Mutual reviews revealed successfully');
      return {
        success: true,
        reviewsRevealed: reviews.length,
        tradeId: tradeId
      };
      
    } catch (error) {
      console.error('❌ Error revealing mutual reviews:', error);
      throw error;
    }
  }

  // 5. GET REVIEWS FOR TRADE
  static async getReviewsForTrade(tradeId, userId) {
    try {
      console.log('📖 Getting reviews for trade:', tradeId);
      
      // Get all revealed reviews for this trade
      const reviewsQuery = query(
        collection(db, 'blindReviews'),
        where('tradeId', '==', tradeId),
        where('state', '==', this.REVIEW_STATES.REVEALED)
      );
      
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviews = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Separate reviews by reviewer/reviewee
      const userReview = reviews.find(r => r.reviewerId === userId);
      const otherReview = reviews.find(r => r.revieweeId === userId);
      
      return {
        userReview: userReview || null,
        receivedReview: otherReview || null,
        allReviews: reviews,
        bothRevealed: reviews.length === 2
      };
      
    } catch (error) {
      console.error('❌ Error getting reviews for trade:', error);
      return {
        userReview: null,
        receivedReview: null,
        allReviews: [],
        bothRevealed: false
      };
    }
  }

  // 6. GET USER'S REVIEW SUMMARY
  static async getUserReviewSummary(userId) {
    try {
      console.log('📊 Getting user review summary for:', userId);
      
      // Get all reviews received by this user
      const receivedReviewsQuery = query(
        collection(db, 'blindReviews'),
        where('revieweeId', '==', userId),
        where('state', '==', this.REVIEW_STATES.REVEALED)
      );
      
      const receivedSnapshot = await getDocs(receivedReviewsQuery);
      const receivedReviews = receivedSnapshot.docs.map(doc => doc.data());
      
      // Calculate summary statistics
      const totalReviews = receivedReviews.length;
      const averageRating = totalReviews > 0 ? 
        receivedReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews : 0;
      
      // Rating distribution
      const ratingDistribution = {
        5: receivedReviews.filter(r => r.rating === 5).length,
        4: receivedReviews.filter(r => r.rating === 4).length,
        3: receivedReviews.filter(r => r.rating === 3).length,
        2: receivedReviews.filter(r => r.rating === 2).length,
        1: receivedReviews.filter(r => r.rating === 1).length
      };
      
      // Recent reviews (last 10)
      const recentReviews = receivedReviews
        .sort((a, b) => b.submittedAt?.toDate() - a.submittedAt?.toDate())
        .slice(0, 10);
      
      return {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution,
        recentReviews,
        trustScore: this.calculateTrustScore(receivedReviews)
      };
      
    } catch (error) {
      console.error('❌ Error getting user review summary:', error);
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        recentReviews: [],
        trustScore: 0
      };
    }
  }

  // HELPER METHODS
  static async getExistingReview(tradeId, reviewerId) {
    try {
      const reviewQuery = query(
        collection(db, 'blindReviews'),
        where('tradeId', '==', tradeId),
        where('reviewerId', '==', reviewerId)
      );
      
      const reviewSnapshot = await getDocs(reviewQuery);
      return reviewSnapshot.empty ? null : reviewSnapshot.docs[0].data();
      
    } catch (error) {
      console.error('Error checking existing review:', error);
      return null;
    }
  }

  static validateReviewData(reviewData) {
    const errors = [];
    
    // Validate rating
    if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
      errors.push('Rating must be between 1 and 5');
    }
    
    // Validate comments
    if (!reviewData.comments || reviewData.comments.trim().length < 10) {
      errors.push('Comments must be at least 10 characters');
    }
    
    if (reviewData.comments && reviewData.comments.length > 500) {
      errors.push('Comments must be less than 500 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static async updateTradeWithReviews(tradeId, reviews) {
    try {
      // Find the trade record and update with review completion
      const tradeQuery = query(
        collection(db, 'offers'),
        where('id', '==', tradeId)
      );
      
      const tradeSnapshot = await getDocs(tradeQuery);
      
      if (!tradeSnapshot.empty) {
        const tradeRef = tradeSnapshot.docs[0].ref;
        await updateDoc(tradeRef, {
          reviewsCompleted: true,
          reviewsRevealedAt: serverTimestamp(),
          reviewCount: reviews.length,
          lastUpdatedAt: serverTimestamp()
        });
      }
      
    } catch (error) {
      console.error('Error updating trade with reviews:', error);
    }
  }

  static async updateUserRatings(reviews) {
    try {
      // Update each user's rating based on received review
      const updatePromises = reviews.map(async (review) => {
        const userRef = doc(db, 'users', review.revieweeId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const currentRating = userData.averageRating || 0;
          const currentCount = userData.reviewCount || 0;
          
          // Calculate new average rating
          const newCount = currentCount + 1;
          const newRating = ((currentRating * currentCount) + review.rating) / newCount;
          
          await updateDoc(userRef, {
            averageRating: Math.round(newRating * 10) / 10,
            reviewCount: newCount,
            lastReviewAt: serverTimestamp()
          });
        }
      });
      
      await Promise.all(updatePromises);
      
    } catch (error) {
      console.error('Error updating user ratings:', error);
    }
  }

  static calculateTrustScore(reviews) {
    if (reviews.length === 0) return 0;
    
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    const reviewCount = reviews.length;
    
    // Trust score formula: (average rating * 20) + (review count bonus up to 10)
    const ratingScore = averageRating * 20;
    const countBonus = Math.min(reviewCount * 2, 10);
    
    return Math.min(ratingScore + countBonus, 100);
  }
}

export default BlindReviewService;