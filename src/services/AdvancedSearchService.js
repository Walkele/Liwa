import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

export class AdvancedSearchService {
  
  // Common brand detection patterns
  static BRAND_PATTERNS = {
    apple: ['apple', 'iphone', 'ipad', 'macbook', 'imac', 'mac', 'ios'],
    samsung: ['samsung', 'galaxy', 'note', 's series'],
    sony: ['sony', 'playstation', 'ps', 'xperia', 'bravia'],
    nintendo: ['nintendo', 'switch', 'wii', 'ds', 'gameboy'],
    microsoft: ['microsoft', 'xbox', 'surface', 'windows'],
    google: ['google', 'pixel', 'chromebook', 'android'],
    nike: ['nike', 'jordan', 'air max', 'dunk'],
    adidas: ['adidas', 'yeezy', 'ultra boost', 'stan smith'],
    puma: ['puma', 'suede', 'cali'],
    lululemon: ['lululemon', 'yoga', 'athleta'],
    patagonia: ['patagonia', 'fleece', 'down jacket'],
    north_face: ['north face', 'tnf', 'fleece'],
    dyson: ['dyson', 'vacuum', 'hair dryer', 'fan'],
    shark: ['shark', 'vacuum', 'ninja'],
    keurig: ['keurig', 'coffee maker'],
    nespresso: ['nespresso', 'coffee'],
    kitchenaid: ['kitchenaid', 'mixer', 'blender'],
    cuisinart: ['cuisinart', 'food processor', 'toaster'],
    lego: ['lego', 'legos', 'building blocks'],
    barbie: ['barbie', 'doll', 'matel'],
    hot_wheels: ['hot wheels', 'matchbox', 'toy cars'],
    fitbit: ['fitbit', 'tracker', 'smartwatch'],
    garmin: ['garmin', 'gps', 'watch', 'fitness'],
    rolex: ['rolex', 'submariner', 'datejust'],
    omega: ['omega', 'seamaster', 'speedmaster'],
    coach: ['coach', 'handbag', 'purse', 'leather'],
    louis_vuitton: ['louis vuitton', 'lv', 'handbag', 'purse'],
    gucci: ['gucci', 'handbag', 'purse', 'luxury'],
    prada: ['prada', 'handbag', 'purse'],
    hermes: ['hermes', 'birkin', 'kelly', 'scarf'],
    tiffany: ['tiffany', 'jewelry', 'co', 'necklace'],
    cartier: ['cartier', 'jewelry', 'watch', 'ring'],
    canon: ['canon', 'camera', 'dslr', 'eos'],
    nikon: ['nikon', 'camera', 'dslr', 'lens'],
    sony_camera: ['sony', 'camera', 'alpha', 'mirrorless'],
    fujifilm: ['fujifilm', 'fuji', 'camera', 'x series'],
    go_pro: ['gopro', 'action camera', 'hero'],
    dji: ['dji', 'drone', 'mavic', 'phantom'],
    dell: ['dell', 'laptop', 'xps', 'inspiron'],
    hp: ['hp', 'laptop', 'pavilion', 'omen'],
    lenovo: ['lenovo', 'thinkpad', 'yoga', 'legion'],
    asus: ['asus', 'rog', 'zenbook', 'laptop'],
    acer: ['acer', 'aspire', 'predator', 'laptop'],
    razer: ['razer', 'blade', 'gaming laptop'],
    msi: ['msi', 'gaming', 'laptop'],
    lg: ['lg', 'tv', 'monitor', 'phone', 'appliance'],
    vizio: ['vizio', 'tv', 'smart tv'],
    tcl: ['tcl', 'tv', 'roku'],
    hisense: ['hisense', 'tv'],
    bose: ['bose', 'speaker', 'headphones', 'soundbar'],
    sonos: ['sonos', 'speaker', 'sound system'],
    jbl: ['jbl', 'speaker', 'headphones', 'audio'],
    sennheiser: ['sennheiser', 'headphones', 'audio'],
    audio_technica: ['audio technica', 'headphones', 'microphone'],
    shure: ['shure', 'microphone', 'audio'],
   marshall: ['marshall', 'speaker', 'headphones', 'amp']
  };

  // Detect brand from item title/description
  static detectBrand(text) {
    if (!text) return null;
    
    const lowerText = text.toLowerCase();
    
    for (const [brand, patterns] of Object.entries(this.BRAND_PATTERNS)) {
      for (const pattern of patterns) {
        if (lowerText.includes(pattern)) {
          return brand;
        }
      }
    }
    
    return null;
  }

  // Advanced search with multiple filters
  static async advancedSearch(filters) {
    try {
      console.log('🔍 Performing advanced search:', filters);

      let baseQuery = query(collection(db, 'items'), orderBy('createdAt', 'desc'));

      // Apply text search filter
      if (filters.searchText && filters.searchText.trim()) {
        // For full-text search, we'd typically use a search service like Algolia
        // For now, we'll do a basic filter after fetching
      }

      // Apply category filter
      if (filters.category && filters.category !== 'All') {
        baseQuery = query(baseQuery, where('category', '==', filters.category));
      }

      // Apply condition filter
      if (filters.condition && filters.condition !== 'All') {
        baseQuery = query(baseQuery, where('condition', '==', filters.condition));
      }

      // Apply price range filter
      if (filters.minPrice !== undefined && filters.minPrice !== null) {
        baseQuery = query(baseQuery, where('price', '>=', filters.minPrice));
      }
      if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
        baseQuery = query(baseQuery, where('price', '<=', filters.maxPrice));
      }

      // Apply location filter
      if (filters.location && filters.location.trim()) {
        baseQuery = query(baseQuery, where('location', '==', filters.location));
      }

      // Apply time filter (just posted)
      if (filters.timePosted === '24h') {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        baseQuery = query(baseQuery, where('createdAt', '>=', yesterday));
      } else if (filters.timePosted === '7d') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        baseQuery = query(baseQuery, where('createdAt', '>=', weekAgo));
      } else if (filters.timePosted === '30d') {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        baseQuery = query(baseQuery, where('createdAt', '>=', monthAgo));
      }

      // Execute query
      const snapshot = await getDocs(baseQuery);
      let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Apply text search filtering (post-query)
      if (filters.searchText && filters.searchText.trim()) {
        const searchLower = filters.searchText.toLowerCase();
        results = results.filter(item =>
          item.title?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.category?.toLowerCase().includes(searchLower)
        );
      }

      // Apply brand filter
      if (filters.brand && filters.brand !== 'All') {
        results = results.filter(item => {
          const itemBrand = this.detectBrand(item.title + ' ' + item.description);
          return itemBrand === filters.brand;
        });
      }

      // Apply brand detection to results
      results = results.map(item => ({
        ...item,
        detectedBrand: this.detectBrand(item.title + ' ' + item.description)
      }));

      console.log(`✅ Advanced search returned ${results.length} results`);
      return results;

    } catch (error) {
      console.error('❌ Error in advanced search:', error);
      throw error;
    }
  }

  // Save search for user
  static async saveSearch(userId, searchFilters, name = null) {
    try {
      console.log('💾 Saving search for user:', userId);

      const searchName = name || this.generateSearchName(searchFilters);

      const savedSearchRef = await addDoc(collection(db, 'savedSearches'), {
        userId,
        name: searchName,
        filters: searchFilters,
        resultCount: 0, // Will be updated when search is run
        createdAt: serverTimestamp(),
        lastUsedAt: serverTimestamp(),
        notificationEnabled: false
      });

      console.log('✅ Search saved successfully:', savedSearchRef.id);
      return { success: true, searchId: savedSearchRef.id, name: searchName };

    } catch (error) {
      console.error('❌ Error saving search:', error);
      throw error;
    }
  }

  // Get saved searches for user
  static async getSavedSearches(userId) {
    try {
      const searchesQuery = query(
        collection(db, 'savedSearches'),
        where('userId', '==', userId),
        orderBy('lastUsedAt', 'desc')
      );

      const snapshot = await getDocs(searchesQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
      console.error('❌ Error getting saved searches:', error);
      return [];
    }
  }

  // Delete saved search
  static async deleteSavedSearch(searchId) {
    try {
      await deleteDoc(doc(db, 'savedSearches', searchId));
      console.log('✅ Saved search deleted');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting saved search:', error);
      throw error;
    }
  }

  // Update saved search
  static async updateSavedSearch(searchId, updates) {
    try {
      const searchRef = doc(db, 'savedSearches', searchId);
      await updateDoc(searchRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Saved search updated');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating saved search:', error);
      throw error;
    }
  }

  // Enable/disable notifications for saved search
  static async toggleSearchNotifications(searchId, enabled) {
    try {
      const searchRef = doc(db, 'savedSearches', searchId);
      await updateDoc(searchRef, {
        notificationEnabled: enabled,
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Search notifications ${enabled ? 'enabled' : 'disabled'}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error toggling search notifications:', error);
      throw error;
    }
  }

  // Get search suggestions based on user behavior
  static async getSearchSuggestions(userId, partialQuery) {
    try {
      // Get user's recent searches
      const recentSearchesQuery = query(
        collection(db, 'savedSearches'),
        where('userId', '==', userId),
        orderBy('lastUsedAt', 'desc'),
        limit(5)
      );

      const snapshot = await getDocs(recentSearchesQuery);
      const recentSearches = snapshot.docs.map(doc => doc.data());

      // Filter recent searches that match partial query
      const matchingSearches = recentSearches.filter(search => 
        search.name?.toLowerCase().includes(partialQuery.toLowerCase()) ||
        search.filters?.searchText?.toLowerCase().includes(partialQuery.toLowerCase())
      );

      // Get popular categories
      const popularCategories = ['Electronics', 'Clothing', 'Books', 'Sports', 'Home', 'Other'];
      const matchingCategories = popularCategories.filter(category =>
        category.toLowerCase().includes(partialQuery.toLowerCase())
      );

      // Get popular brands
      const popularBrands = Object.keys(this.BRAND_PATTERNS).slice(0, 10);
      const matchingBrands = popularBrands.filter(brand =>
        brand.toLowerCase().includes(partialQuery.toLowerCase())
      );

      return {
        recentSearches: matchingSearches.map(s => s.name || s.filters.searchText),
        categories: matchingCategories,
        brands: matchingBrands
      };

    } catch (error) {
      console.error('❌ Error getting search suggestions:', error);
      return { recentSearches: [], categories: [], brands: [] };
    }
  }

  // Generate a name for saved search based on filters
  static generateSearchName(filters) {
    const parts = [];

    if (filters.searchText) {
      parts.push(filters.searchText);
    }

    if (filters.category && filters.category !== 'All') {
      parts.push(filters.category);
    }

    if (filters.brand && filters.brand !== 'All') {
      parts.push(filters.brand);
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceRange = `$${filters.minPrice || 0} - $${filters.maxPrice || '∞'}`;
      parts.push(priceRange);
    }

    if (filters.condition && filters.condition !== 'All') {
      parts.push(filters.condition);
    }

    return parts.length > 0 ? parts.join(' • ') : 'Untitled Search';
  }

  // Get filter recommendations based on current search
  static getFilterRecommendations(currentFilters, allResults) {
    const recommendations = {
      brands: {},
      priceRanges: {},
      conditions: {}
    };

    // Analyze results to recommend filters
    allResults.forEach(item => {
      // Brand recommendations
      const brand = this.detectBrand(item.title + ' ' + item.description);
      if (brand) {
        recommendations.brands[brand] = (recommendations.brands[brand] || 0) + 1;
      }

      // Price range recommendations
      const price = item.price || 0;
      if (price < 25) {
        recommendations.priceRanges['0-25'] = (recommendations.priceRanges['0-25'] || 0) + 1;
      } else if (price < 50) {
        recommendations.priceRanges['25-50'] = (recommendations.priceRanges['25-50'] || 0) + 1;
      } else if (price < 100) {
        recommendations.priceRanges['50-100'] = (recommendations.priceRanges['50-100'] || 0) + 1;
      } else if (price < 250) {
        recommendations.priceRanges['100-250'] = (recommendations.priceRanges['100-250'] || 0) + 1;
      } else {
        recommendations.priceRanges['250+'] = (recommendations.priceRanges['250+'] || 0) + 1;
      }

      // Condition recommendations
      if (item.condition) {
        recommendations.conditions[item.condition] = (recommendations.conditions[item.condition] || 0) + 1;
      }
    });

    // Sort by count and return top recommendations
    return {
      brands: Object.entries(recommendations.brands)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([brand, count]) => ({ brand, count })),
      priceRanges: Object.entries(recommendations.priceRanges)
        .sort((a, b) => b[1] - a[1])
        .map(([range, count]) => ({ range, count })),
      conditions: Object.entries(recommendations.conditions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([condition, count]) => ({ condition, count }))
    };
  }

  // Get similar items based on brand and category
  static async getSimilarItems(itemId, limit = 10) {
    try {
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);

      if (!itemDoc.exists()) {
        return [];
      }

      const item = itemDoc.data();
      const brand = this.detectBrand(item.title + ' ' + item.description);

      let similarQuery = query(
        collection(db, 'items'),
        where('category', '==', item.category),
        where('status', '==', 'available'),
        orderBy('createdAt', 'desc'),
        limit(limit * 2) // Get more to filter
      );

      const snapshot = await getDocs(similarQuery);
      let similarItems = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(i => i.id !== itemId);

      // Prioritize items with same brand
      if (brand) {
        similarItems.sort((a, b) => {
          const aBrand = this.detectBrand(a.title + ' ' + a.description);
          const bBrand = this.detectBrand(b.title + ' ' + b.description);
          
          if (aBrand === brand && bBrand !== brand) return -1;
          if (aBrand !== brand && bBrand === brand) return 1;
          return 0;
        });
      }

      return similarItems.slice(0, limit);

    } catch (error) {
      console.error('❌ Error getting similar items:', error);
      return [];
    }
  }

  // Get trending searches platform-wide
  static async getTrendingSearches(limit = 10) {
    try {
      // This would typically come from analytics data
      // For now, return placeholder data
      const trendingSearches = [
        { query: 'iPhone 13', count: 1500 },
        { query: 'Nintendo Switch', count: 1200 },
        { query: 'Nike Air Max', count: 1000 },
        { query: 'MacBook Pro', count: 900 },
        { query: 'PlayStation 5', count: 850 },
        { query: 'Samsung Galaxy', count: 800 },
        { query: 'AirPods Pro', count: 750 },
        { query: 'iPad Air', count: 700 },
        { query: 'Sony TV', count: 650 },
        { query: 'Fitbit', count: 600 }
      ];

      return trendingSearches.slice(0, limit);

    } catch (error) {
      console.error('❌ Error getting trending searches:', error);
      return [];
    }
  }
}

export default AdvancedSearchService;