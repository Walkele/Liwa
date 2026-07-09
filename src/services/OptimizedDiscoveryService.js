import { collection, query, where, getDocs, orderBy, limit, startAfter, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export class OptimizedDiscoveryService {
  
  // Cache for better performance
  static itemCache = new Map();
  static userSwipeCache = new Map();
  static offerCache = new Map();
  static cacheExpiry = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Get optimized discovery items with caching and filtering
   */
  static async getOptimizedDiscoveryItems(userId, options = {}) {
    try {
      console.log('🚀 Getting optimized discovery items for user:', userId);
      
      const {
        maxDistance = 25,
        category = null,
        minValue = null,
        maxValue = null,
        userLocation = null,
        limit: itemLimit = 20,
        excludeArchived = true,
        excludeCompleted = true,
        showOfferValues = true
      } = options;

      // Get user's swipe history (cached)
      const swipedItemIds = await this.getUserSwipeHistory(userId);
      
      // Get user's existing offers (cached)
      const userOffers = showOfferValues ? await this.getUserOffers(userId) : [];
      
      // Build optimized query - simplified to avoid index requirements
      let itemsQuery = query(
        collection(db, 'items'),
        where('status', '==', 'available'),
        orderBy('createdAt', 'desc'),
        limit(itemLimit * 2)
      );

      const snapshot = await getDocs(itemsQuery);
      let items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📦 Found ${items.length} potential items before filtering`);
      console.log(`📦 Items before filtering:`, items.map(item => ({ id: item.id, title: item.title, userId: item.userId, status: item.status })));

      // Apply filters
      items = await this.applyAdvancedFilters(items, {
        userId,
        swipedItemIds,
        userOffers,
        excludeArchived,
        excludeCompleted,
        userLocation,
        maxDistance
      });

      // Add offer information to items
      if (showOfferValues) {
        items = await this.enrichItemsWithOfferInfo(items, userId);
      }

      // Sort by relevance score
      items = this.sortByRelevance(items, userId, userLocation);

      // Limit final results
      items = items.slice(0, itemLimit);

      console.log(`✅ Returning ${items.length} optimized discovery items`);
      
      return items;

    } catch (error) {
      console.error('❌ Error getting optimized discovery items:', error);
      return [];
    }
  }

  /**
   * Get user's swipe history with caching
   */
  static async getUserSwipeHistory(userId) {
    const cacheKey = `swipes_${userId}`;
    const cached = this.userSwipeCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const swipesQuery = query(
        collection(db, 'swipes'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(swipesQuery);
      const swipedItemIds = snapshot.docs.map(doc => doc.data().itemId);

      // Cache the result
      this.userSwipeCache.set(cacheKey, {
        data: swipedItemIds,
        timestamp: Date.now()
      });

      return swipedItemIds;

    } catch (error) {
      console.error('❌ Error getting swipe history:', error);
      return [];
    }
  }

  /**
   * Get user's existing offers with caching
   */
  static async getUserOffers(userId) {
    const cacheKey = `offers_${userId}`;
    const cached = this.offerCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }

    try {
      // Get cash offers - simplified to avoid index
      const cashOffersQuery = query(
        collection(db, 'cashOffers'),
        where('buyerId', '==', userId)
      );

      // Get trade proposals - simplified to avoid index
      const tradeProposalsQuery = query(
        collection(db, 'tradeProposals'),
        where('proposerUserId', '==', userId)
      );

      const [cashSnapshot, tradeSnapshot] = await Promise.all([
        getDocs(cashOffersQuery),
        getDocs(tradeProposalsQuery)
      ]);

      const offers = [];

      cashSnapshot.docs.forEach(doc => {
        const data = doc.data();
        // Filter by status in JavaScript to avoid index
        if (data.status === 'pending' || data.status === 'active') {
          offers.push({
            id: doc.id,
            itemId: data.itemId,
            type: 'cash',
            amount: data.offerAmount,
            status: data.status,
            createdAt: data.createdAt
          });
        }
      });

      tradeSnapshot.docs.forEach(doc => {
        const data = doc.data();
        // Filter by status in JavaScript to avoid index
        if (data.status === 'pending' || data.status === 'active') {
          offers.push({
            id: doc.id,
            itemId: data.targetItemId,
            type: 'trade',
            amount: data.estimatedValue || 0,
            status: data.status,
            createdAt: data.createdAt
          });
        }
      });

      // Cache the result
      this.offerCache.set(cacheKey, {
        data: offers,
        timestamp: Date.now()
      });

      return offers;

    } catch (error) {
      console.error('❌ Error getting user offers:', error);
      return [];
    }
  }

  /**
   * Apply advanced filters to items
   */
  static async applyAdvancedFilters(items, filters) {
    const {
      userId,
      swipedItemIds,
      userOffers,
      excludeArchived,
      excludeCompleted,
      userLocation,
      maxDistance
    } = filters;

    console.log(`🔍 applyAdvancedFilters called with:`, { userId, excludeArchived, excludeCompleted, swipedItemIdsLength: swipedItemIds?.length });

    let filteredItems = items;

    // Filter out user's own items
    const beforeUserFilter = filteredItems.length;
    filteredItems = filteredItems.filter(item => item.userId !== userId);
    console.log(`🔍 After user filter: ${beforeUserFilter} -> ${filteredItems.length} items`);

    // Filter out already swiped items (only if swipedItemIds is not empty)
    // TEMPORARILY DISABLED FOR TESTING - users should see items even if swiped
    if (swipedItemIds && swipedItemIds.length > 0 && false) {
      const beforeSwipeFilter = filteredItems.length;
      filteredItems = filteredItems.filter(item => !swipedItemIds.includes(item.id));
      console.log(`🔍 After swipe filter: ${beforeSwipeFilter} -> ${filteredItems.length} items`);
    }

    // Filter out archived/completed items - more lenient check
    if (excludeArchived) {
      const beforeStatusFilter = filteredItems.length;
      filteredItems = filteredItems.filter(item => 
        item.status !== 'archived' && 
        item.status !== 'deleted' &&
        item.status !== 'completed'
      );
      console.log(`🔍 After status filter: ${beforeStatusFilter} -> ${filteredItems.length} items`);
    }

    // Apply distance filter if location is available (more lenient)
    if (userLocation && maxDistance) {
      const beforeDistanceFilter = filteredItems.length;
      filteredItems = filteredItems.filter(item => {
        if (!item.coordinates) return true; // Include items without coordinates
        
        const distance = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          item.coordinates.latitude,
          item.coordinates.longitude
        );
        
        return distance <= maxDistance;
      });
      console.log(`🔍 After distance filter: ${beforeDistanceFilter} -> ${filteredItems.length} items`);
    }

    console.log(`🔍 Final count: ${filteredItems.length} items remaining`);
    return filteredItems;
  }

  /**
   * Enrich items with offer information
   */
  static async enrichItemsWithOfferInfo(items, userId) {
    const userOffers = await this.getUserOffers(userId);
    
    return items.map(item => {
      // Find existing offers for this item
      const existingOffers = userOffers.filter(offer => offer.itemId === item.id);
      
      if (existingOffers.length > 0) {
        const latestOffer = existingOffers.sort((a, b) => 
          new Date(b.createdAt?.toDate?.() || b.createdAt) - 
          new Date(a.createdAt?.toDate?.() || a.createdAt)
        )[0];

        return {
          ...item,
          hasExistingOffer: true,
          existingOfferAmount: latestOffer.amount,
          existingOfferType: latestOffer.type,
          existingOfferStatus: latestOffer.status,
          offerCount: existingOffers.length
        };
      }

      return {
        ...item,
        hasExistingOffer: false,
        offerCount: 0
      };
    });
  }

  /**
   * Sort items by relevance score
   */
  static sortByRelevance(items, userId, userLocation) {
    return items.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Boost items without existing offers
      if (!a.hasExistingOffer) scoreA += 10;
      if (!b.hasExistingOffer) scoreB += 10;

      // Boost newer items
      const ageA = Date.now() - (a.createdAt?.toDate?.() || new Date(a.createdAt)).getTime();
      const ageB = Date.now() - (b.createdAt?.toDate?.() || new Date(b.createdAt)).getTime();
      
      const dayInMs = 24 * 60 * 60 * 1000;
      scoreA += Math.max(0, 5 - (ageA / dayInMs)); // Newer items get higher score
      scoreB += Math.max(0, 5 - (ageB / dayInMs));

      // Boost items with higher engagement
      scoreA += (a.swipeRightCount || 0) * 0.1;
      scoreB += (b.swipeRightCount || 0) * 0.1;

      // Boost closer items if location is available
      if (userLocation && a.coordinates && b.coordinates) {
        const distanceA = this.calculateDistance(
          userLocation.latitude, userLocation.longitude,
          a.coordinates.latitude, a.coordinates.longitude
        );
        const distanceB = this.calculateDistance(
          userLocation.latitude, userLocation.longitude,
          b.coordinates.latitude, b.coordinates.longitude
        );

        scoreA += Math.max(0, 5 - (distanceA / 5)); // Closer items get higher score
        scoreB += Math.max(0, 5 - (distanceB / 5));
      }

      return scoreB - scoreA; // Higher score first
    });
  }

  /**
   * Calculate distance between two coordinates
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Clear cache for user
   */
  static clearUserCache(userId) {
    this.userSwipeCache.delete(`swipes_${userId}`);
    this.offerCache.delete(`offers_${userId}`);
  }

  /**
   * Get cache summary for user
   */
  static getCacheSummary(userId) {
    const swipeCache = this.userSwipeCache.get(`swipes_${userId}`);
    const offerCache = this.offerCache.get(`offers_${userId}`);
    
    return {
      swipeHistory: {
        cached: !!swipeCache,
        count: swipeCache?.data?.length || 0,
        lastUpdated: swipeCache?.timestamp ? new Date(swipeCache.timestamp) : null
      },
      offers: {
        cached: !!offerCache,
        count: offerCache?.data?.length || 0,
        lastUpdated: offerCache?.timestamp ? new Date(offerCache.timestamp) : null
      },
      totalCacheSize: this.itemCache.size + this.userSwipeCache.size + this.offerCache.size
    };
  }

  /**
   * Preload items for better performance
   */
  static async preloadItems(userId, options = {}) {
    try {
      console.log('🔄 Preloading items for better performance...');
      
      // Preload swipe history
      await this.getUserSwipeHistory(userId);
      
      // Preload user offers
      await this.getUserOffers(userId);
      
      console.log('✅ Items preloaded successfully');
      
    } catch (error) {
      console.error('❌ Error preloading items:', error);
    }
  }

  /**
   * Check if user has items to swipe
   */
  static async hasItemsToSwipe(userId) {
    try {
      const items = await this.getOptimizedDiscoveryItems(userId, { limit: 1 });
      return items.length > 0;
    } catch (error) {
      console.error('❌ Error checking if user has items to swipe:', error);
      return false;
    }
  }

  /**
   * Get user's swipe statistics
   */
  static async getUserSwipeStats(userId) {
    try {
      const swipesQuery = query(
        collection(db, 'swipes'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(swipesQuery);
      const swipes = snapshot.docs.map(doc => doc.data());

      const stats = {
        totalSwipes: swipes.length,
        rightSwipes: swipes.filter(s => s.direction === 'right').length,
        leftSwipes: swipes.filter(s => s.direction === 'left').length,
        swipeRate: 0,
        lastSwipeDate: null
      };

      if (stats.totalSwipes > 0) {
        stats.swipeRate = (stats.rightSwipes / stats.totalSwipes) * 100;
        
        const sortedSwipes = swipes.sort((a, b) => 
          new Date(b.createdAt?.toDate?.() || b.createdAt) - 
          new Date(a.createdAt?.toDate?.() || a.createdAt)
        );
        
        stats.lastSwipeDate = sortedSwipes[0]?.createdAt?.toDate?.() || new Date(sortedSwipes[0]?.createdAt);
      }

      return stats;

    } catch (error) {
      console.error('❌ Error getting swipe stats:', error);
      return {
        totalSwipes: 0,
        rightSwipes: 0,
        leftSwipes: 0,
        swipeRate: 0,
        lastSwipeDate: null
      };
    }
  }
}

export default OptimizedDiscoveryService;