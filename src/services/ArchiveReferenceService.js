import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

export class ArchiveReferenceService {
  
  /**
   * Get archived items with full reference information
   */
  static async getArchivedItemsWithReferences(userId) {
    try {
      console.log('📦 Getting archived items with references for user:', userId);

      // Get archived items
      const archivedItemsQuery = query(
        collection(db, 'archivedItems'),
        where('originalOwnerId', '==', userId),
        orderBy('archivedAt', 'desc')
      );

      const snapshot = await getDocs(archivedItemsQuery);
      const archivedItems = [];

      for (const docSnapshot of snapshot.docs) {
        const itemData = docSnapshot.data();
        
        // Get additional reference information
        const references = await this.getItemReferences(itemData);
        
        archivedItems.push({
          id: docSnapshot.id,
          ...itemData,
          references
        });
      }

      return archivedItems;

    } catch (error) {
      console.error('❌ Error getting archived items with references:', error);
      return [];
    }
  }

  /**
   * Get reference information for an archived item
   */
  static async getItemReferences(archivedItem) {
    try {
      const references = {
        tradeDetails: null,
        conversationId: null,
        tradePartner: null,
        tradeDate: null,
        tradeValue: null,
        tradeType: null,
        ratings: [],
        originalListing: null
      };

      // Get trade details if available
      if (archivedItem.tradeDetails) {
        references.tradeDetails = archivedItem.tradeDetails;
        references.conversationId = archivedItem.tradeDetails.conversationId;
        references.tradeDate = archivedItem.tradeDetails.completedAt;
        references.tradeValue = archivedItem.tradeDetails.cashAmount || archivedItem.tradeDetails.tradeValue;
        references.tradeType = archivedItem.tradeDetails.tradeType || 'item_trade';

        // Get trade partner information
        if (archivedItem.tradeDetails.participants) {
          const partnerId = archivedItem.tradeDetails.participants.find(id => id !== archivedItem.originalOwnerId);
          if (partnerId) {
            references.tradePartner = await this.getUserInfo(partnerId);
          }
        }

        // Get ratings for this trade
        if (archivedItem.tradeDetails.tradeId) {
          references.ratings = await this.getTradeRatings(archivedItem.tradeDetails.tradeId);
        }
      }

      // Get original listing information if available
      if (archivedItem.originalItemId) {
        references.originalListing = await this.getOriginalListingInfo(archivedItem.originalItemId);
      }

      return references;

    } catch (error) {
      console.error('❌ Error getting item references:', error);
      return {};
    }
  }

  /**
   * Get user information for trade partner
   */
  static async getUserInfo(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          id: userId,
          name: userData.name || 'Unknown User',
          rating: userData.rating || 0,
          totalTrades: userData.totalTrades || 0,
          location: userData.location || 'Unknown'
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting user info:', error);
      return null;
    }
  }

  /**
   * Get ratings for a specific trade
   */
  static async getTradeRatings(tradeId) {
    try {
      const ratingsQuery = query(
        collection(db, 'tradeRatings'),
        where('tradeId', '==', tradeId)
      );

      const snapshot = await getDocs(ratingsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      console.error('❌ Error getting trade ratings:', error);
      return [];
    }
  }

  /**
   * Get original listing information
   */
  static async getOriginalListingInfo(itemId) {
    try {
      // Try to get from items collection first
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      if (itemDoc.exists()) {
        return {
          id: itemId,
          ...itemDoc.data(),
          source: 'active_listing'
        };
      }

      // If not found in active items, check archived items
      const archivedQuery = query(
        collection(db, 'archivedItems'),
        where('originalItemId', '==', itemId)
      );

      const snapshot = await getDocs(archivedQuery);
      if (!snapshot.empty) {
        return {
          id: itemId,
          ...snapshot.docs[0].data(),
          source: 'archived_listing'
        };
      }

      return null;

    } catch (error) {
      console.error('❌ Error getting original listing info:', error);
      return null;
    }
  }

  /**
   * Search archived items by various criteria
   */
  static async searchArchivedItems(userId, searchCriteria) {
    try {
      const archivedItems = await this.getArchivedItemsWithReferences(userId);
      
      let filteredItems = archivedItems;

      // Filter by search term
      if (searchCriteria.searchTerm) {
        const term = searchCriteria.searchTerm.toLowerCase();
        filteredItems = filteredItems.filter(item => 
          item.title?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term) ||
          item.references?.tradePartner?.name?.toLowerCase().includes(term)
        );
      }

      // Filter by date range
      if (searchCriteria.dateFrom || searchCriteria.dateTo) {
        filteredItems = filteredItems.filter(item => {
          const itemDate = item.archivedAt?.toDate?.() || new Date(item.archivedAt);
          const fromDate = searchCriteria.dateFrom ? new Date(searchCriteria.dateFrom) : new Date('1900-01-01');
          const toDate = searchCriteria.dateTo ? new Date(searchCriteria.dateTo) : new Date();
          
          return itemDate >= fromDate && itemDate <= toDate;
        });
      }

      // Filter by trade type
      if (searchCriteria.tradeType) {
        filteredItems = filteredItems.filter(item => 
          item.references?.tradeType === searchCriteria.tradeType
        );
      }

      // Filter by value range
      if (searchCriteria.minValue || searchCriteria.maxValue) {
        filteredItems = filteredItems.filter(item => {
          const value = item.references?.tradeValue || item.price || 0;
          const minValue = searchCriteria.minValue || 0;
          const maxValue = searchCriteria.maxValue || Infinity;
          
          return value >= minValue && value <= maxValue;
        });
      }

      return filteredItems;

    } catch (error) {
      console.error('❌ Error searching archived items:', error);
      return [];
    }
  }

  /**
   * Get archive statistics for user
   */
  static async getArchiveStatistics(userId) {
    try {
      const archivedItems = await this.getArchivedItemsWithReferences(userId);
      
      const stats = {
        totalItems: archivedItems.length,
        totalValue: 0,
        tradeTypes: {},
        monthlyArchives: {},
        topTradePartners: {},
        averageRating: 0,
        totalRatings: 0
      };

      archivedItems.forEach(item => {
        // Calculate total value
        const value = item.references?.tradeValue || item.price || 0;
        stats.totalValue += value;

        // Count trade types
        const tradeType = item.references?.tradeType || 'unknown';
        stats.tradeTypes[tradeType] = (stats.tradeTypes[tradeType] || 0) + 1;

        // Count monthly archives
        const archiveDate = item.archivedAt?.toDate?.() || new Date(item.archivedAt);
        const monthKey = `${archiveDate.getFullYear()}-${archiveDate.getMonth() + 1}`;
        stats.monthlyArchives[monthKey] = (stats.monthlyArchives[monthKey] || 0) + 1;

        // Count trade partners
        if (item.references?.tradePartner) {
          const partnerName = item.references.tradePartner.name;
          stats.topTradePartners[partnerName] = (stats.topTradePartners[partnerName] || 0) + 1;
        }

        // Calculate ratings
        if (item.references?.ratings) {
          item.references.ratings.forEach(rating => {
            if (rating.ratedUser === userId) {
              stats.totalRatings++;
              stats.averageRating += rating.rating;
            }
          });
        }
      });

      // Calculate average rating
      if (stats.totalRatings > 0) {
        stats.averageRating = Math.round((stats.averageRating / stats.totalRatings) * 10) / 10;
      }

      return stats;

    } catch (error) {
      console.error('❌ Error getting archive statistics:', error);
      return {
        totalItems: 0,
        totalValue: 0,
        tradeTypes: {},
        monthlyArchives: {},
        topTradePartners: {},
        averageRating: 0,
        totalRatings: 0
      };
    }
  }

  /**
   * Export archive data for user
   */
  static async exportArchiveData(userId, format = 'json') {
    try {
      const archivedItems = await this.getArchivedItemsWithReferences(userId);
      const stats = await this.getArchiveStatistics(userId);

      const exportData = {
        exportDate: new Date().toISOString(),
        userId,
        statistics: stats,
        items: archivedItems.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          originalPrice: item.price,
          archivedDate: item.archivedAt,
          archiveReason: item.archiveReason,
          tradePartner: item.references?.tradePartner?.name,
          tradeValue: item.references?.tradeValue,
          tradeType: item.references?.tradeType,
          tradeDate: item.references?.tradeDate,
          ratings: item.references?.ratings?.map(r => ({
            rating: r.rating,
            review: r.review,
            date: r.createdAt
          }))
        }))
      };

      if (format === 'csv') {
        return this.convertToCSV(exportData.items);
      }

      return exportData;

    } catch (error) {
      console.error('❌ Error exporting archive data:', error);
      throw error;
    }
  }

  /**
   * Convert archive data to CSV format
   */
  static convertToCSV(items) {
    const headers = [
      'Title', 'Description', 'Original Price', 'Archived Date', 
      'Archive Reason', 'Trade Partner', 'Trade Value', 'Trade Type', 
      'Trade Date', 'Average Rating'
    ];

    const csvRows = [headers.join(',')];

    items.forEach(item => {
      const row = [
        `"${item.title || ''}"`,
        `"${item.description || ''}"`,
        item.originalPrice || 0,
        item.archivedDate || '',
        `"${item.archiveReason || ''}"`,
        `"${item.tradePartner || ''}"`,
        item.tradeValue || 0,
        item.tradeType || '',
        item.tradeDate || '',
        item.ratings?.length > 0 ? 
          (item.ratings.reduce((sum, r) => sum + r.rating, 0) / item.ratings.length).toFixed(1) : 
          'N/A'
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}

export default ArchiveReferenceService;