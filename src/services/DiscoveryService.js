import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Location from 'expo-location';
import { ItemArchiveService } from './ItemArchiveService';

export class DiscoveryService {
  
  // Get user's current location
  static async getCurrentLocation() {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return null;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  // Calculate distance between two points using Haversine formula
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Get items for discovery feed with availability checking
  static async getDiscoveryItems(userId, filters = {}) {
    try {
      const {
        maxDistance = 25,
        category = null,
        minValue = null,
        maxValue = null,
        userLocation = null
      } = filters;

      console.log('🔍 Getting discovery items for user:', userId);

      // Get user's swipe history to filter out already swiped items
      let swipedItemIds = [];
      try {
        const { MatchingService } = await import('./MatchingService');
        swipedItemIds = await MatchingService.getUserSwipeHistory(userId);
        console.log(`📱 User has swiped on ${swipedItemIds.length} items`);
      } catch (swipeError) {
        console.log('⚠️ Could not load swipe history:', swipeError.message);
      }

      // Simplified query to avoid index requirements
      let itemsQuery = query(
        collection(db, 'items'),
        where('status', '==', 'available'), // Only available items to avoid index
        limit(50) // Limit for performance
      );

      const snapshot = await getDocs(itemsQuery);
      let items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📦 Found ${items.length} potentially available items`);

      // Filter out user's own items
      items = items.filter(item => item.userId !== userId);
      console.log(`📦 After filtering user's items: ${items.length} items`);

      // Filter out already swiped items
      items = items.filter(item => !swipedItemIds.includes(item.id));
      console.log(`📦 After filtering swiped items: ${items.length} items`);

      // Check availability and add lock status for each item
      const { ItemLockingService } = await import('./ItemLockingService');
      const itemsWithAvailability = await Promise.all(
        items.map(async (item) => {
          try {
            const availability = await ItemLockingService.isItemAvailableForSwipe(item.id);
            return {
              ...item,
              availability,
              isAvailable: availability.available,
              lockStatus: availability.lockType || 'none',
              lockWarning: availability.warning || null
            };
          } catch (error) {
            console.log(`⚠️ Could not check availability for item ${item.id}:`, error.message);
            return {
              ...item,
              availability: { available: true },
              isAvailable: true,
              lockStatus: 'unknown'
            };
          }
        })
      );

      // Filter out hard-locked items, but keep soft-locked ones with warnings
      const availableItems = itemsWithAvailability.filter(item => {
        if (!item.isAvailable && item.lockStatus === 'hard') {
          console.log(`🚫 Filtering out hard-locked item: ${item.title}`);
          return false;
        }
        return true;
      });

      console.log(`📦 After availability filtering: ${availableItems.length} items`);

      // Filter out archived items explicitly
      const activeItems = ItemArchiveService.filterActiveItems(availableItems);
      console.log(`📦 After filtering archived items: ${activeItems.length} items`);

      // Apply other filters
      const filteredItems = this.applyFilters(activeItems, filters, userLocation);
      console.log(`📦 After applying filters: ${filteredItems.length} items`);

      // Calculate matching scores
      const scoredItems = this.calculateMatchingScores(filteredItems, userId);

      // Sort by matching score and distance
      scoredItems.sort((a, b) => {
        // Primary sort: matching score (higher is better)
        if (b.matchingScore !== a.matchingScore) {
          return b.matchingScore - a.matchingScore;
        }
        // Secondary sort: distance (closer is better)
        return (a.distance || 999) - (b.distance || 999);
      });

      console.log(`✅ Returning ${scoredItems.length} discovery items`);
      return scoredItems;
    } catch (error) {
      console.error('Error getting discovery items:', error);
      
      // Fallback: try even simpler query
      try {
        console.log('🔄 Trying fallback query...');
        const fallbackQuery = query(
          collection(db, 'items'),
          limit(20)
        );
        
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackItems = fallbackSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => 
            item.userId !== userId && 
            (item.status === 'available' || item.status === 'pending')
          );
        
        console.log(`📦 Fallback query returned ${fallbackItems.length} items`);
        return fallbackItems;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return [];
      }
    }
  }

  // Apply various filters to items
  static applyFilters(items, filters, userLocation) {
    const {
      maxDistance = 25,
      category = null,
      minValue = null,
      maxValue = null
    } = filters;

    return items.filter(item => {
      // Category filter
      if (category && item.category !== category) {
        return false;
      }

      // Value range filter
      if (minValue && item.estimatedValue < minValue) {
        return false;
      }
      if (maxValue && item.estimatedValue > maxValue) {
        return false;
      }

      // Distance filter
      if (userLocation && item.location) {
        const distance = this.calculateDistanceFromLocation(item.location, userLocation);
        item.distance = distance; // Add distance to item for sorting
        
        if (distance > maxDistance) {
          return false;
        }
      }

      return true;
    });
  }

  // Calculate distance from item location to user location
  static calculateDistanceFromLocation(itemLocation, userLocation) {
    // Handle different location formats
    let itemLat, itemLon;
    
    if (typeof itemLocation === 'string') {
      // Parse "lat,lon" string format
      const coords = itemLocation.split(',');
      if (coords.length === 2) {
        itemLat = parseFloat(coords[0]);
        itemLon = parseFloat(coords[1]);
      } else {
        return 999; // Unknown location, put at end
      }
    } else if (itemLocation.latitude && itemLocation.longitude) {
      // Object format
      itemLat = itemLocation.latitude;
      itemLon = itemLocation.longitude;
    } else {
      return 999; // Unknown location format
    }

    return this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      itemLat,
      itemLon
    );
  }

  // Calculate matching scores based on SwipeIt algorithm
  static calculateMatchingScores(items, userId) {
    return items.map(item => {
      let score = 0;

      // Base score for all items
      score += 10;

      // Boost for items with wanted items specified
      if (item.wantedItems && item.wantedItems.length > 0) {
        score += 15;
      }

      // Boost for items open to anything
      if (item.isOpenToAnything) {
        score += 10;
      }

      // Boost for items that accept multiple trade types
      if (item.tradePreferences) {
        const acceptedTypes = [
          item.tradePreferences.acceptsCash,
          item.tradePreferences.acceptsTrade,
          item.tradePreferences.acceptsBarter
        ].filter(Boolean).length;
        
        score += acceptedTypes * 5;
      }

      // Boost for newer items
      const daysSincePosted = (new Date() - new Date(item.createdAt?.toDate ? item.createdAt.toDate() : item.createdAt)) / (1000 * 60 * 60 * 24);
      if (daysSincePosted < 1) score += 20;
      else if (daysSincePosted < 7) score += 10;
      else if (daysSincePosted < 30) score += 5;

      // Boost for items with good engagement
      if (item.swipeRightCount > 0) {
        score += Math.min(item.swipeRightCount * 2, 20);
      }

      // Penalty for items with many left swipes
      if (item.swipeLeftCount > item.swipeRightCount * 2) {
        score -= 10;
      }

      // Distance bonus (closer items get higher scores)
      if (item.distance !== undefined) {
        if (item.distance < 5) score += 15;
        else if (item.distance < 10) score += 10;
        else if (item.distance < 25) score += 5;
      }

      item.matchingScore = Math.max(0, score);
      return item;
    });
  }

  // Record swipe action for algorithm improvement
  static async recordSwipe(userId, itemId, direction, itemOwnerId) {
    try {
      // This would typically update analytics/recommendations
      // For now, we'll just log it
      console.log(`User ${userId} swiped ${direction} on item ${itemId} by ${itemOwnerId}`);
      
      // In a full implementation, you might:
      // 1. Update item swipe counts
      // 2. Store user preferences
      // 3. Improve matching algorithm
      // 4. Create potential matches
      
      return { success: true };
    } catch (error) {
      console.error('Error recording swipe:', error);
      return { success: false, error: error.message };
    }
  }

  // Get items that user has shown interest in (swiped right)
  static async getInterestedItems(userId) {
    try {
      // In a full implementation, this would query a user_interests collection
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      console.error('Error getting interested items:', error);
      return [];
    }
  }

  // Check if two users have mutual interest (both swiped right)
  static async checkMutualInterest(user1Id, user2Id, item1Id, item2Id) {
    try {
      // In a full implementation, this would check mutual swipes
      // For now, return false as placeholder
      return false;
    } catch (error) {
      console.error('Error checking mutual interest:', error);
      return false;
    }
  }

  // Get recommended items based on user's swipe history
  static async getRecommendedItems(userId, userLocation = null) {
    try {
      // For now, use the same discovery algorithm
      // In a full implementation, this would use ML/AI recommendations
      return await this.getDiscoveryItems(userId, { userLocation });
    } catch (error) {
      console.error('Error getting recommended items:', error);
      return [];
    }
  }

  // Search for specific items with distance filtering
  static async searchItems(userId, searchQuery, filters = {}) {
    try {
      const { userLocation, maxDistance = 25 } = filters;

      console.log('🔍 Searching items for:', searchQuery);

      // Simplified query to avoid index requirements
      const itemsQuery = query(
        collection(db, 'items'),
        limit(100)
      );

      const snapshot = await getDocs(itemsQuery);
      let items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter out user's own items and only include available items
      items = items.filter(item => 
        item.userId !== userId && 
        (item.status === 'available' || item.status === 'pending')
      );

      // Filter by search query
      const searchLower = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.title?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower) ||
        (item.wantedItems && item.wantedItems.some(wanted => 
          wanted.toLowerCase().includes(searchLower)
        ))
      );

      // Apply distance filter
      if (userLocation) {
        items = items.filter(item => {
          if (!item.location) return true; // Include items without location
          
          const distance = this.calculateDistanceFromLocation(item.location, userLocation);
          item.distance = distance;
          return distance <= maxDistance;
        });

        // Sort by distance
        items.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      }

      console.log(`✅ Search returned ${items.length} items`);
      return items;
    } catch (error) {
      console.error('Error searching items:', error);
      return [];
    }
  }
}