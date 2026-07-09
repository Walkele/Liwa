import { 
  doc, 
  updateDoc, 
  getDoc, 
  addDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { TrustScoreService } from './TrustScoreService';
import { NotificationService } from './notificationService';

export class BoostAndPremiumService {
  
  // Subscription tiers with features and pricing
  static SUBSCRIPTION_TIERS = {
    FREE: {
      name: 'Free',
      price: 0,
      duration: 'forever',
      features: {
        swipesPerDay: 50,
        searchRadius: 25, // km
        boostsPerMonth: 0,
        premiumSupport: false,
        advancedFilters: false,
        globalSearch: false,
        priorityListing: false,
        verificationBadge: false,
        analyticsAccess: false
      },
      limits: {
        activeItems: 10,
        savedSearches: 3,
        messageHistory: 30 // days
      }
    },
    PREMIUM: {
      name: 'Premium',
      price: 9.99,
      duration: 'monthly',
      features: {
        swipesPerDay: -1, // unlimited
        searchRadius: -1, // global
        boostsPerMonth: 5,
        premiumSupport: true,
        advancedFilters: true,
        globalSearch: true,
        priorityListing: true,
        verificationBadge: true,
        analyticsAccess: true
      },
      limits: {
        activeItems: 50,
        savedSearches: 20,
        messageHistory: -1 // unlimited
      }
    },
    PRO: {
      name: 'Pro',
      price: 19.99,
      duration: 'monthly',
      features: {
        swipesPerDay: -1,
        searchRadius: -1,
        boostsPerMonth: 15,
        premiumSupport: true,
        advancedFilters: true,
        globalSearch: true,
        priorityListing: true,
        verificationBadge: true,
        analyticsAccess: true,
        bulkOperations: true,
        apiAccess: true
      },
      limits: {
        activeItems: -1, // unlimited
        savedSearches: -1,
        messageHistory: -1
      }
    }
  };

  // Boost types and pricing
  static BOOST_TYPES = {
    ITEM_BOOST: {
      name: 'Item Boost',
      description: 'Pin your item at the top of search results',
      basePrice: 2.99,
      duration: 24, // hours
      multiplier: 1.0,
      icon: '📌'
    },
    PROFILE_BOOST: {
      name: 'Profile Boost',
      description: 'Increase your profile visibility',
      basePrice: 4.99,
      duration: 48, // hours
      multiplier: 1.5,
      icon: '⭐'
    },
    SEARCH_BOOST: {
      name: 'Search Boost',
      description: 'Appear higher in all search results',
      basePrice: 7.99,
      duration: 72, // hours
      multiplier: 2.0,
      icon: '🚀'
    },
    PREMIUM_BOOST: {
      name: 'Premium Boost',
      description: 'Maximum visibility across the platform',
      basePrice: 12.99,
      duration: 168, // 7 days
      multiplier: 3.0,
      icon: '💎'
    }
  };

  // Trust-based pricing discounts
  static TRUST_DISCOUNTS = {
    NEWCOMER: 0,     // 0-49 trust score
    TRUSTED: 0.1,    // 50-79 trust score (10% discount)
    VERIFIED_PRO: 0.2 // 80+ trust score (20% discount)
  };

  // Purchase item boost
  static async purchaseItemBoost(userId, itemId, boostType, duration = null) {
    try {
      console.log('🚀 Purchasing item boost:', { userId, itemId, boostType });
      
      // Validate boost type
      const boost = this.BOOST_TYPES[boostType];
      if (!boost) {
        throw new Error('Invalid boost type');
      }

      // Get user's trust score for discount calculation
      const trustData = await TrustScoreService.calculateTrustScore(userId);
      const discount = this.getTrustDiscount(trustData.score);
      
      // Calculate final price
      const baseDuration = duration || boost.duration;
      const finalPrice = this.calculateBoostPrice(boost.basePrice, baseDuration, discount);
      
      // Check if user can afford boost (in real app, integrate with payment system)
      const canAfford = await this.checkUserCanAffordBoost(userId, finalPrice);
      if (!canAfford) {
        throw new Error('Insufficient funds for boost purchase');
      }

      // Create boost record
      const boostData = {
        userId,
        itemId,
        boostType,
        duration: baseDuration,
        price: finalPrice,
        discount,
        trustScore: trustData.score,
        
        startTime: serverTimestamp(),
        endTime: new Date(Date.now() + baseDuration * 60 * 60 * 1000),
        
        status: 'active',
        createdAt: serverTimestamp(),
        
        // Analytics
        impressions: 0,
        clicks: 0,
        conversions: 0
      };

      const boostRef = await addDoc(collection(db, 'item_boosts'), boostData);

      // Update item with boost status
      await updateDoc(doc(db, 'items', itemId), {
        isBoosted: true,
        boostType,
        boostEndTime: boostData.endTime,
        boostId: boostRef.id,
        boostMultiplier: boost.multiplier
      });

      // Process payment (simulate for demo)
      await this.processBoostPayment(userId, finalPrice, boostRef.id);

      // Send confirmation notification
      await NotificationService.notifyBoostActivated(userId, itemId, boostType, baseDuration);

      // Log boost purchase for analytics
      await this.logBoostPurchase(userId, itemId, boostType, finalPrice, discount);

      console.log('✅ Item boost purchased successfully:', boostRef.id);
      
      return {
        boostId: boostRef.id,
        price: finalPrice,
        discount,
        duration: baseDuration,
        endTime: boostData.endTime
      };

    } catch (error) {
      console.error('Error purchasing item boost:', error);
      throw error;
    }
  }

  // Upgrade user subscription
  static async upgradeSubscription(userId, newTier, paymentMethod = null) {
    try {
      console.log('⭐ Upgrading subscription:', { userId, newTier });
      
      // Validate subscription tier
      const tier = this.SUBSCRIPTION_TIERS[newTier];
      if (!tier) {
        throw new Error('Invalid subscription tier');
      }

      // Get current subscription
      const currentSub = await this.getUserSubscription(userId);
      
      // Calculate prorated pricing if upgrading mid-cycle
      const proratedPrice = await this.calculateProratedPrice(currentSub, tier);
      
      // Process payment (integrate with Stripe/PayPal in production)
      const paymentResult = await this.processSubscriptionPayment(
        userId, 
        proratedPrice, 
        newTier, 
        paymentMethod
      );

      // Create new subscription record
      const subscriptionData = {
        userId,
        tier: newTier,
        price: tier.price,
        proratedPrice,
        paymentMethod,
        paymentId: paymentResult.paymentId,
        
        startDate: serverTimestamp(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        
        status: 'active',
        autoRenew: true,
        
        features: tier.features,
        limits: tier.limits,
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const subscriptionRef = await addDoc(collection(db, 'subscriptions'), subscriptionData);

      // Update user document with subscription info
      await updateDoc(doc(db, 'users', userId), {
        subscriptionTier: newTier,
        subscriptionId: subscriptionRef.id,
        subscriptionEndDate: subscriptionData.endDate,
        premiumFeatures: tier.features,
        subscriptionLimits: tier.limits,
        updatedAt: serverTimestamp()
      });

      // Cancel previous subscription if exists
      if (currentSub && currentSub.id !== subscriptionRef.id) {
        await this.cancelSubscription(currentSub.id, 'upgraded');
      }

      // Send welcome notification
      await NotificationService.notifySubscriptionUpgrade(userId, newTier, tier.features);

      // Log subscription change for analytics
      await this.logSubscriptionChange(userId, currentSub?.tier || 'FREE', newTier, proratedPrice);

      console.log('✅ Subscription upgraded successfully:', subscriptionRef.id);
      
      return {
        subscriptionId: subscriptionRef.id,
        tier: newTier,
        features: tier.features,
        price: proratedPrice,
        endDate: subscriptionData.endDate
      };

    } catch (error) {
      console.error('Error upgrading subscription:', error);
      throw error;
    }
  }

  // Check user's current usage against limits
  static async checkUserLimits(userId, action, additionalData = {}) {
    try {
      const subscription = await this.getUserSubscription(userId);
      const limits = subscription?.limits || this.SUBSCRIPTION_TIERS.FREE.limits;
      const features = subscription?.features || this.SUBSCRIPTION_TIERS.FREE.features;

      switch (action) {
        case 'swipe':
          return await this.checkSwipeLimit(userId, features.swipesPerDay);
          
        case 'post_item':
          return await this.checkActiveItemsLimit(userId, limits.activeItems);
          
        case 'save_search':
          return await this.checkSavedSearchesLimit(userId, limits.savedSearches);
          
        case 'global_search':
          return features.globalSearch;
          
        case 'advanced_filters':
          return features.advancedFilters;
          
        case 'boost_item':
          const boostsUsed = await this.getMonthlyBoostsUsed(userId);
          return features.boostsPerMonth === -1 || boostsUsed < features.boostsPerMonth;
          
        default:
          return true;
      }
    } catch (error) {
      console.error('Error checking user limits:', error);
      return false;
    }
  }

  // Get user's current subscription
  static async getUserSubscription(userId) {
    try {
      const subscriptionQuery = query(
        collection(db, 'subscriptions'),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(subscriptionQuery);
      
      if (snapshot.empty) {
        return {
          tier: 'FREE',
          features: this.SUBSCRIPTION_TIERS.FREE.features,
          limits: this.SUBSCRIPTION_TIERS.FREE.limits
        };
      }

      const subscription = snapshot.docs[0].data();
      return {
        id: snapshot.docs[0].id,
        ...subscription
      };
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return null;
    }
  }

  // Get active boosts for user
  static async getUserActiveBoosts(userId) {
    try {
      const now = new Date();
      const boostsQuery = query(
        collection(db, 'item_boosts'),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        where('endTime', '>', now),
        orderBy('endTime', 'desc')
      );

      const snapshot = await getDocs(boostsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user active boosts:', error);
      return [];
    }
  }

  // Get boosted items for display priority
  static async getBoostedItems(category = null, location = null, limit = 20) {
    try {
      const now = new Date();
      let itemsQuery = query(
        collection(db, 'items'),
        where('isBoosted', '==', true),
        where('boostEndTime', '>', now),
        where('status', '==', 'available'),
        orderBy('boostMultiplier', 'desc'),
        orderBy('boostEndTime', 'desc')
      );

      // Add category filter if specified
      if (category) {
        itemsQuery = query(
          collection(db, 'items'),
          where('isBoosted', '==', true),
          where('boostEndTime', '>', now),
          where('status', '==', 'available'),
          where('category', '==', category),
          orderBy('boostMultiplier', 'desc')
        );
      }

      const snapshot = await getDocs(itemsQuery);
      let boostedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply location filtering if specified
      if (location) {
        boostedItems = boostedItems.filter(item => {
          // In production, implement proper geolocation filtering
          return item.location && item.location.includes(location);
        });
      }

      return boostedItems.slice(0, limit);
    } catch (error) {
      console.error('Error getting boosted items:', error);
      return [];
    }
  }

  // Calculate boost price with trust discount
  static calculateBoostPrice(basePrice, duration, discount = 0) {
    const durationMultiplier = duration / 24; // Base duration is 24 hours
    const priceBeforeDiscount = basePrice * durationMultiplier;
    return Math.round((priceBeforeDiscount * (1 - discount)) * 100) / 100;
  }

  // Get trust-based discount
  static getTrustDiscount(trustScore) {
    if (trustScore >= 80) return this.TRUST_DISCOUNTS.VERIFIED_PRO;
    if (trustScore >= 50) return this.TRUST_DISCOUNTS.TRUSTED;
    return this.TRUST_DISCOUNTS.NEWCOMER;
  }

  // Check daily swipe limit
  static async checkSwipeLimit(userId, dailyLimit) {
    if (dailyLimit === -1) return true; // Unlimited

    try {
      const today = new Date().toISOString().split('T')[0];
      const swipesQuery = query(
        collection(db, 'swipes'),
        where('userId', '==', userId),
        where('date', '==', today)
      );

      const snapshot = await getDocs(swipesQuery);
      return snapshot.docs.length < dailyLimit;
    } catch (error) {
      console.error('Error checking swipe limit:', error);
      return false;
    }
  }

  // Check active items limit
  static async checkActiveItemsLimit(userId, limit) {
    if (limit === -1) return true; // Unlimited

    try {
      const activeItemsQuery = query(
        collection(db, 'items'),
        where('userId', '==', userId),
        where('status', '==', 'available')
      );

      const snapshot = await getDocs(activeItemsQuery);
      return snapshot.docs.length < limit;
    } catch (error) {
      console.error('Error checking active items limit:', error);
      return false;
    }
  }

  // Get monthly boosts used
  static async getMonthlyBoostsUsed(userId) {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const boostsQuery = query(
        collection(db, 'item_boosts'),
        where('userId', '==', userId),
        where('createdAt', '>=', startOfMonth)
      );

      const snapshot = await getDocs(boostsQuery);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Error getting monthly boosts used:', error);
      return 0;
    }
  }

  // Simulate payment processing (integrate with real payment provider)
  static async processBoostPayment(userId, amount, boostId) {
    // In production, integrate with Stripe, PayPal, or other payment processor
    console.log(`💳 Processing boost payment: $${amount} for user ${userId}`);
    
    // Simulate payment processing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          paymentId: `pay_boost_${Date.now()}`,
          amount,
          currency: 'USD'
        });
      }, 1000);
    });
  }

  // Simulate subscription payment processing
  static async processSubscriptionPayment(userId, amount, tier, paymentMethod) {
    console.log(`💳 Processing subscription payment: $${amount} for ${tier}`);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          paymentId: `pay_sub_${Date.now()}`,
          amount,
          currency: 'USD',
          tier
        });
      }, 1500);
    });
  }

  // Calculate prorated pricing for subscription upgrades
  static async calculateProratedPrice(currentSub, newTier) {
    if (!currentSub || currentSub.tier === 'FREE') {
      return newTier.price;
    }

    // Simple proration calculation (in production, use more sophisticated logic)
    const daysRemaining = Math.max(0, Math.ceil((currentSub.endDate - new Date()) / (1000 * 60 * 60 * 24)));
    const dailyRate = newTier.price / 30;
    
    return Math.round(dailyRate * Math.max(daysRemaining, 1) * 100) / 100;
  }

  // Check if user can afford boost (simulate wallet/payment method check)
  static async checkUserCanAffordBoost(userId, amount) {
    // In production, check user's payment methods, wallet balance, etc.
    console.log(`💰 Checking if user ${userId} can afford $${amount}`);
    return true; // Simulate successful check
  }

  // Cancel subscription
  static async cancelSubscription(subscriptionId, reason = 'user_requested') {
    try {
      await updateDoc(doc(db, 'subscriptions', subscriptionId), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelReason: reason,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Subscription cancelled:', subscriptionId);
      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Log boost purchase for analytics
  static async logBoostPurchase(userId, itemId, boostType, price, discount) {
    try {
      await addDoc(collection(db, 'analytics_events'), {
        eventType: 'boost_purchase',
        userId,
        itemId,
        boostType,
        price,
        discount,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging boost purchase:', error);
    }
  }

  // Log subscription change for analytics
  static async logSubscriptionChange(userId, fromTier, toTier, price) {
    try {
      await addDoc(collection(db, 'analytics_events'), {
        eventType: 'subscription_change',
        userId,
        fromTier,
        toTier,
        price,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging subscription change:', error);
    }
  }

  // Subscribe to user's subscription changes
  static subscribeToUserSubscription(userId, callback) {
    const subscriptionQuery = query(
      collection(db, 'subscriptions'),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(subscriptionQuery, (snapshot) => {
      const subscription = snapshot.empty ? null : {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      };
      callback(subscription);
    });
  }
}

export default BoostAndPremiumService;