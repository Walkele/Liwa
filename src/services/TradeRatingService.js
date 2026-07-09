import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export class TradeRatingService {
  
  /**
   * Submit a trade rating
   */
  static async submitTradeRating(tradeId, ratingData) {
    try {
      console.log('⭐ Submitting trade rating:', ratingData);

      const ratingDoc = {
        tradeId,
        conversationId: ratingData.conversationId,
        ratedBy: ratingData.ratedBy,
        ratedUser: ratingData.ratedUser,
        rating: ratingData.rating, // 1-5 stars
        review: ratingData.review || '',
        categories: {
          communication: ratingData.categories?.communication || ratingData.rating,
          reliability: ratingData.categories?.reliability || ratingData.rating,
          itemCondition: ratingData.categories?.itemCondition || ratingData.rating,
          meetingExperience: ratingData.categories?.meetingExperience || ratingData.rating
        },
        tradeType: ratingData.tradeType || 'item_trade',
        itemTitle: ratingData.itemTitle || 'Item',
        tradeValue: ratingData.tradeValue || 0,
        wouldTradeAgain: ratingData.wouldTradeAgain || false,
        createdAt: serverTimestamp(),
        isPublic: ratingData.isPublic !== false, // Default to public
        reportedIssues: ratingData.reportedIssues || []
      };

      const docRef = await addDoc(collection(db, 'tradeRatings'), ratingDoc);

      // Update user's overall rating
      await this.updateUserRating(ratingData.ratedUser);

      // Create system message about the rating
      if (ratingData.conversationId) {
        await addDoc(collection(db, 'messages'), {
          conversationId: ratingData.conversationId,
          senderId: 'system',
          senderName: 'Liwa',
          text: `⭐ Trade rating submitted (${ratingData.rating}/5 stars)`,
          messageType: 'trade_rating_submitted',
          isSystemMessage: true,
          createdAt: serverTimestamp(),
          ratingId: docRef.id,
          rating: ratingData.rating
        });
      }

      return {
        success: true,
        ratingId: docRef.id,
        rating: ratingDoc
      };

    } catch (error) {
      console.error('❌ Error submitting trade rating:', error);
      throw error;
    }
  }

  /**
   * Update user's overall rating based on all their ratings
   */
  static async updateUserRating(userId) {
    try {
      const ratingsQuery = query(
        collection(db, 'tradeRatings'),
        where('ratedUser', '==', userId)
      );

      const snapshot = await getDocs(ratingsQuery);
      const ratings = snapshot.docs.map(doc => doc.data());

      if (ratings.length === 0) return;

      // Calculate overall rating
      const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
      const averageRating = totalRating / ratings.length;

      // Calculate category averages
      const categoryAverages = {
        communication: ratings.reduce((sum, r) => sum + r.categories.communication, 0) / ratings.length,
        reliability: ratings.reduce((sum, r) => sum + r.categories.reliability, 0) / ratings.length,
        itemCondition: ratings.reduce((sum, r) => sum + r.categories.itemCondition, 0) / ratings.length,
        meetingExperience: ratings.reduce((sum, r) => sum + r.categories.meetingExperience, 0) / ratings.length
      };

      // Update user document
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalRatings: ratings.length,
        categoryRatings: categoryAverages,
        lastRatingUpdate: serverTimestamp()
      });

      console.log(`✅ Updated user ${userId} rating to ${averageRating} (${ratings.length} ratings)`);

    } catch (error) {
      console.error('❌ Error updating user rating:', error);
    }
  }

  /**
   * Get ratings for a user
   */
  static async getUserRatings(userId, limit = 10) {
    try {
      const ratingsQuery = query(
        collection(db, 'tradeRatings'),
        where('ratedUser', '==', userId),
        where('isPublic', '==', true)
      );

      const snapshot = await getDocs(ratingsQuery);
      const ratings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by date and limit
      return ratings
        .sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.())
        .slice(0, limit);

    } catch (error) {
      console.error('❌ Error getting user ratings:', error);
      return [];
    }
  }

  /**
   * Check if user can rate this trade
   */
  static async canRateTrade(tradeId, userId) {
    try {
      // Check if user already rated this trade
      const existingRatingQuery = query(
        collection(db, 'tradeRatings'),
        where('tradeId', '==', tradeId),
        where('ratedBy', '==', userId)
      );

      const snapshot = await getDocs(existingRatingQuery);
      
      return {
        canRate: snapshot.empty,
        alreadyRated: !snapshot.empty,
        existingRating: snapshot.empty ? null : {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data()
        }
      };

    } catch (error) {
      console.error('❌ Error checking rating eligibility:', error);
      return { canRate: false, alreadyRated: false };
    }
  }

  /**
   * Get trade rating statistics
   */
  static async getTradeRatingStats(tradeId) {
    try {
      const ratingsQuery = query(
        collection(db, 'tradeRatings'),
        where('tradeId', '==', tradeId)
      );

      const snapshot = await getDocs(ratingsQuery);
      const ratings = snapshot.docs.map(doc => doc.data());

      if (ratings.length === 0) {
        return {
          totalRatings: 0,
          averageRating: 0,
          bothRated: false,
          ratings: []
        };
      }

      const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
      const averageRating = totalRating / ratings.length;

      return {
        totalRatings: ratings.length,
        averageRating: Math.round(averageRating * 10) / 10,
        bothRated: ratings.length >= 2,
        ratings: ratings.map(r => ({
          rating: r.rating,
          review: r.review,
          ratedBy: r.ratedBy,
          categories: r.categories,
          createdAt: r.createdAt
        }))
      };

    } catch (error) {
      console.error('❌ Error getting trade rating stats:', error);
      return { totalRatings: 0, averageRating: 0, bothRated: false, ratings: [] };
    }
  }

  /**
   * Generate rating prompts based on trade type
   */
  static generateRatingPrompts(tradeType = 'item_trade') {
    const basePrompts = {
      communication: "How was their communication throughout the trade?",
      reliability: "Did they follow through on their commitments?",
      meetingExperience: "How was the meeting and exchange experience?"
    };

    if (tradeType === 'item_trade') {
      return {
        ...basePrompts,
        itemCondition: "Was the item as described and in good condition?"
      };
    } else if (tradeType === 'service_trade') {
      return {
        ...basePrompts,
        serviceQuality: "How was the quality of the service provided?"
      };
    }

    return basePrompts;
  }

  /**
   * Get rating suggestions based on trade experience
   */
  static getRatingSuggestions(tradeExperience) {
    const suggestions = {
      excellent: {
        rating: 5,
        review: "Excellent trader! Highly recommended.",
        categories: { communication: 5, reliability: 5, itemCondition: 5, meetingExperience: 5 }
      },
      good: {
        rating: 4,
        review: "Good trading experience overall.",
        categories: { communication: 4, reliability: 4, itemCondition: 4, meetingExperience: 4 }
      },
      average: {
        rating: 3,
        review: "Average trading experience.",
        categories: { communication: 3, reliability: 3, itemCondition: 3, meetingExperience: 3 }
      },
      poor: {
        rating: 2,
        review: "Had some issues with this trade.",
        categories: { communication: 2, reliability: 2, itemCondition: 2, meetingExperience: 2 }
      },
      terrible: {
        rating: 1,
        review: "Would not recommend trading with this user.",
        categories: { communication: 1, reliability: 1, itemCondition: 1, meetingExperience: 1 }
      }
    };

    return suggestions[tradeExperience] || suggestions.average;
  }
}

export default TradeRatingService;