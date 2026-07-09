import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export class TrustScoreService {
  
  // Trust score calculation weights
  static SCORE_WEIGHTS = {
    COMPLETED_SWAPS: 10,      // Points per completed swap
    VERIFICATION_LEVEL: 15,   // Points per verification type
    RESPONSE_TIME: 2,         // Points for fast response (24 - avgHours)
    USER_REVIEWS: 20,         // Points based on average rating (1-5 scale)
    ACCOUNT_AGE: 5,           // Points for account maturity (max 12 months)
    CANCELLATION_PENALTY: -5, // Penalty for cancelled trades
    REPORT_PENALTY: -10       // Penalty for user reports
  };

  // Verification types and their requirements
  static VERIFICATION_TYPES = {
    EMAIL: {
      name: 'Email Verified',
      icon: '✉️',
      description: 'Email address confirmed',
      points: 15,
      required: true
    },
    PHONE: {
      name: 'Phone Verified',
      icon: '📱',
      description: 'Phone number confirmed with SMS',
      points: 20,
      required: false
    },
    IDENTITY: {
      name: 'ID Verified',
      icon: '🆔',
      description: 'Government ID verified',
      points: 30,
      required: false
    },
    ADDRESS: {
      name: 'Address Verified',
      icon: '🏠',
      description: 'Home address confirmed',
      points: 25,
      required: false
    },
    SOCIAL: {
      name: 'Social Connected',
      icon: '🔗',
      description: 'Social media accounts linked',
      points: 10,
      required: false
    }
  };

  // Trust score levels and benefits
  static TRUST_LEVELS = {
    NEWCOMER: {
      name: 'Newcomer',
      minScore: 0,
      maxScore: 49,
      color: '#9E9E9E',
      icon: '🆕',
      benefits: ['Basic trading features']
    },
    TRUSTED: {
      name: 'Trusted',
      minScore: 50,
      maxScore: 79,
      color: '#4CAF50',
      icon: '✅',
      benefits: ['Priority in search', 'Extended trade time']
    },
    VERIFIED_PRO: {
      name: 'Verified Pro',
      minScore: 80,
      maxScore: 100,
      color: '#FF9800',
      icon: '⭐',
      benefits: ['Top search placement', 'Premium features', 'Verified badge']
    }
  };

  // Calculate comprehensive trust score
  static async calculateTrustScore(userId) {
    try {
      console.log(`🏆 Calculating trust score for user: ${userId}`);
      
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      let totalScore = 0;
      const scoreBreakdown = {};

      // 1. Completed Swaps Score
      const completedSwaps = await this.getCompletedSwapsCount(userId);
      const swapsScore = Math.min(completedSwaps * this.SCORE_WEIGHTS.COMPLETED_SWAPS, 50);
      totalScore += swapsScore;
      scoreBreakdown.completedSwaps = { count: completedSwaps, score: swapsScore };

      // 2. Verification Level Score
      const verifications = userData.verifications || {};
      const verificationScore = Object.keys(verifications).length * this.SCORE_WEIGHTS.VERIFICATION_LEVEL;
      totalScore += verificationScore;
      scoreBreakdown.verifications = { count: Object.keys(verifications).length, score: verificationScore };

      // 3. Response Time Score
      const avgResponseTime = userData.avgResponseHours || 24;
      const responseScore = Math.max(0, (24 - avgResponseTime) * this.SCORE_WEIGHTS.RESPONSE_TIME);
      totalScore += responseScore;
      scoreBreakdown.responseTime = { avgHours: avgResponseTime, score: responseScore };

      // 4. User Reviews Score
      const avgRating = userData.avgRating || 0;
      const reviewsScore = avgRating * this.SCORE_WEIGHTS.USER_REVIEWS;
      totalScore += reviewsScore;
      scoreBreakdown.reviews = { avgRating, score: reviewsScore };

      // 5. Account Age Score
      const accountAge = this.getAccountAgeInMonths(userData.createdAt);
      const ageScore = Math.min(accountAge, 12) * this.SCORE_WEIGHTS.ACCOUNT_AGE;
      totalScore += ageScore;
      scoreBreakdown.accountAge = { months: accountAge, score: ageScore };

      // 6. Penalties
      const cancelledTrades = await this.getCancelledTradesCount(userId);
      const cancellationPenalty = cancelledTrades * this.SCORE_WEIGHTS.CANCELLATION_PENALTY;
      totalScore += cancellationPenalty;
      scoreBreakdown.cancellations = { count: cancelledTrades, penalty: cancellationPenalty };

      const reportCount = userData.reportCount || 0;
      const reportPenalty = reportCount * this.SCORE_WEIGHTS.REPORT_PENALTY;
      totalScore += reportPenalty;
      scoreBreakdown.reports = { count: reportCount, penalty: reportPenalty };

      // Ensure score is between 0 and 100
      const finalScore = Math.max(0, Math.min(100, Math.round(totalScore)));
      
      // Get trust level
      const trustLevel = this.getTrustLevel(finalScore);
      
      // Update user document with new score
      await updateDoc(doc(db, 'users', userId), {
        trustScore: finalScore,
        trustLevel: trustLevel.name,
        trustScoreUpdatedAt: serverTimestamp(),
        scoreBreakdown
      });

      console.log(`✅ Trust score calculated: ${finalScore} (${trustLevel.name})`);
      
      return {
        score: finalScore,
        level: trustLevel,
        breakdown: scoreBreakdown,
        updatedAt: new Date()
      };

    } catch (error) {
      console.error('Error calculating trust score:', error);
      throw error;
    }
  }

  // Get completed swaps count for user
  static async getCompletedSwapsCount(userId) {
    try {
      const completedQuery = query(
        collection(db, 'trades'),
        where('participants', 'array-contains', userId),
        where('status', '==', 'completed')
      );
      
      const snapshot = await getDocs(completedQuery);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Error getting completed swaps count:', error);
      return 0;
    }
  }

  // Get cancelled trades count for user
  static async getCancelledTradesCount(userId) {
    try {
      const cancelledQuery = query(
        collection(db, 'trades'),
        where('participants', 'array-contains', userId),
        where('status', '==', 'cancelled'),
        where('cancelledBy', '==', userId)
      );
      
      const snapshot = await getDocs(cancelledQuery);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Error getting cancelled trades count:', error);
      return 0;
    }
  }

  // Calculate account age in months
  static getAccountAgeInMonths(createdAt) {
    if (!createdAt) return 0;
    
    const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    
    return diffMonths;
  }

  // Get trust level based on score
  static getTrustLevel(score) {
    for (const level of Object.values(this.TRUST_LEVELS)) {
      if (score >= level.minScore && score <= level.maxScore) {
        return level;
      }
    }
    return this.TRUST_LEVELS.NEWCOMER;
  }

  // Add verification for user
  static async addVerification(userId, verificationType, verificationData = {}) {
    try {
      console.log(`🔐 Adding ${verificationType} verification for user: ${userId}`);
      
      const userRef = doc(db, 'users', userId);
      const verificationPath = `verifications.${verificationType}`;
      
      const verificationRecord = {
        type: verificationType,
        verifiedAt: serverTimestamp(),
        status: 'verified',
        ...verificationData
      };

      await updateDoc(userRef, {
        [verificationPath]: verificationRecord
      });

      // Recalculate trust score
      await this.calculateTrustScore(userId);

      console.log(`✅ ${verificationType} verification added successfully`);
      
      return verificationRecord;

    } catch (error) {
      console.error(`Error adding ${verificationType} verification:`, error);
      throw error;
    }
  }

  // Get user verifications
  static async getUserVerifications(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return {};
      }
      
      return userDoc.data().verifications || {};
    } catch (error) {
      console.error('Error getting user verifications:', error);
      return {};
    }
  }

  // Check if user has specific verification
  static async hasVerification(userId, verificationType) {
    const verifications = await this.getUserVerifications(userId);
    return verifications[verificationType]?.status === 'verified';
  }

  // Get verification badges for display
  static getVerificationBadges(verifications = {}) {
    return Object.keys(verifications)
      .filter(type => verifications[type]?.status === 'verified')
      .map(type => ({
        type,
        ...this.VERIFICATION_TYPES[type.toUpperCase()],
        verifiedAt: verifications[type].verifiedAt
      }));
  }

  // Update user response time (called when user responds to messages)
  static async updateResponseTime(userId, responseTimeHours) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentAvg = userData.avgResponseHours || 24;
        const responseCount = userData.responseCount || 0;
        
        // Calculate new average response time
        const newAvg = ((currentAvg * responseCount) + responseTimeHours) / (responseCount + 1);
        
        await updateDoc(userRef, {
          avgResponseHours: Math.round(newAvg * 100) / 100, // Round to 2 decimals
          responseCount: responseCount + 1,
          lastResponseAt: serverTimestamp()
        });

        // Recalculate trust score if response time significantly changed
        if (Math.abs(newAvg - currentAvg) > 1) {
          await this.calculateTrustScore(userId);
        }
      }
    } catch (error) {
      console.error('Error updating response time:', error);
    }
  }

  // Add user review/rating (called after completed trade)
  static async addUserReview(reviewedUserId, reviewerUserId, rating, comment = '') {
    try {
      console.log(`⭐ Adding review for user: ${reviewedUserId}, rating: ${rating}`);
      
      const reviewData = {
        reviewedUserId,
        reviewerUserId,
        rating: Math.max(1, Math.min(5, rating)), // Ensure rating is 1-5
        comment,
        createdAt: serverTimestamp()
      };

      // Add review document
      await addDoc(collection(db, 'user_reviews'), reviewData);

      // Update user's average rating
      await this.updateUserAverageRating(reviewedUserId);

      // Recalculate trust score
      await this.calculateTrustScore(reviewedUserId);

      console.log(`✅ Review added successfully`);
      
      return reviewData;

    } catch (error) {
      console.error('Error adding user review:', error);
      throw error;
    }
  }

  // Update user's average rating
  static async updateUserAverageRating(userId) {
    try {
      const reviewsQuery = query(
        collection(db, 'user_reviews'),
        where('reviewedUserId', '==', userId)
      );
      
      const snapshot = await getDocs(reviewsQuery);
      const reviews = snapshot.docs.map(doc => doc.data());
      
      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const avgRating = totalRating / reviews.length;
        
        await updateDoc(doc(db, 'users', userId), {
          avgRating: Math.round(avgRating * 100) / 100, // Round to 2 decimals
          reviewCount: reviews.length
        });
      }
    } catch (error) {
      console.error('Error updating average rating:', error);
    }
  }

  // Get trust score display info
  static getTrustScoreDisplay(score, level) {
    return {
      score,
      level,
      color: level.color,
      icon: level.icon,
      name: level.name,
      benefits: level.benefits,
      nextLevel: this.getNextLevel(score),
      progressPercentage: this.getProgressPercentage(score, level)
    };
  }

  // Get next trust level
  static getNextLevel(currentScore) {
    const levels = Object.values(this.TRUST_LEVELS);
    for (const level of levels) {
      if (currentScore < level.minScore) {
        return {
          ...level,
          pointsNeeded: level.minScore - currentScore
        };
      }
    }
    return null; // Already at max level
  }

  // Get progress percentage within current level
  static getProgressPercentage(score, level) {
    const levelRange = level.maxScore - level.minScore;
    const scoreInLevel = score - level.minScore;
    return Math.round((scoreInLevel / levelRange) * 100);
  }

  // Bulk recalculate trust scores (admin function)
  static async recalculateAllTrustScores() {
    try {
      console.log('🔄 Starting bulk trust score recalculation...');
      
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let processed = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        try {
          await this.calculateTrustScore(userDoc.id);
          processed++;
          
          if (processed % 10 === 0) {
            console.log(`📊 Processed ${processed}/${usersSnapshot.docs.length} users`);
          }
        } catch (error) {
          console.error(`Error processing user ${userDoc.id}:`, error);
        }
      }
      
      console.log(`✅ Bulk recalculation complete. Processed ${processed} users.`);
      return processed;
      
    } catch (error) {
      console.error('Error in bulk recalculation:', error);
      throw error;
    }
  }
}

export default TrustScoreService;