import { adminDb } from '@/config/firebase-admin';
import { Analytics } from '@/types';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export class AnalyticsService {
  // Get comprehensive analytics dashboard data
  static async getDashboardAnalytics(): Promise<Analytics> {
    try {
      const [
        totalUsers,
        activeUsers,
        totalItems,
        activeItems,
        totalTrades,
        completedTrades,
        userGrowth,
        tradeVolume,
        topCategories,
        topLocations,
      ] = await Promise.all([
        this.getTotalUsers(),
        this.getActiveUsers(),
        this.getTotalItems(),
        this.getActiveItems(),
        this.getTotalTrades(),
        this.getCompletedTrades(),
        this.getUserGrowthData(),
        this.getTradeVolumeData(),
        this.getTopCategories(),
        this.getTopLocations(),
      ]);

      // Calculate revenue (placeholder - implement based on your monetization model)
      const revenue = await this.calculateRevenue();

      return {
        totalUsers,
        activeUsers,
        totalItems,
        activeItems,
        totalTrades,
        completedTrades,
        revenue,
        userGrowth,
        tradeVolume,
        topCategories,
        topLocations,
      };
    } catch (error) {
      console.error('Get dashboard analytics error:', error);
      throw new Error('Failed to fetch analytics data');
    }
  }

  // Get total users count
  private static async getTotalUsers(): Promise<number> {
    const snapshot = await adminDb.collection('users').get();
    return snapshot.size;
  }

  // Get active users (logged in within last 30 days)
  private static async getActiveUsers(): Promise<number> {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const snapshot = await adminDb
      .collection('users')
      .where('lastLoginAt', '>=', thirtyDaysAgo)
      .get();
    return snapshot.size;
  }

  // Get total items count
  private static async getTotalItems(): Promise<number> {
    const snapshot = await adminDb.collection('items').get();
    return snapshot.size;
  }

  // Get active items count
  private static async getActiveItems(): Promise<number> {
    const snapshot = await adminDb
      .collection('items')
      .where('status', '==', 'active')
      .get();
    return snapshot.size;
  }

  // Get total trades count
  private static async getTotalTrades(): Promise<number> {
    const snapshot = await adminDb.collection('trades').get();
    return snapshot.size;
  }

  // Get completed trades count
  private static async getCompletedTrades(): Promise<number> {
    const snapshot = await adminDb
      .collection('trades')
      .where('status', '==', 'completed')
      .get();
    return snapshot.size;
  }

  // Get user growth data for charts
  private static async getUserGrowthData(): Promise<{
    daily: number[];
    weekly: number[];
    monthly: number[];
  }> {
    const daily = [];
    const weekly = [];
    const monthly = [];

    // Get daily data for last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      const snapshot = await adminDb
        .collection('users')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get();

      daily.push(snapshot.size);
    }

    // Get weekly data for last 12 weeks
    for (let i = 11; i >= 0; i--) {
      const endDate = subDays(new Date(), i * 7);
      const startDate = subDays(endDate, 6);

      const snapshot = await adminDb
        .collection('users')
        .where('createdAt', '>=', startOfDay(startDate))
        .where('createdAt', '<=', endOfDay(endDate))
        .get();

      weekly.push(snapshot.size);
    }

    // Get monthly data for last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const snapshot = await adminDb
        .collection('users')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get();

      monthly.push(snapshot.size);
    }

    return { daily, weekly, monthly };
  }

  // Get trade volume data for charts
  private static async getTradeVolumeData(): Promise<{
    daily: number[];
    weekly: number[];
    monthly: number[];
  }> {
    const daily = [];
    const weekly = [];
    const monthly = [];

    // Get daily data for last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      const snapshot = await adminDb
        .collection('trades')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get();

      daily.push(snapshot.size);
    }

    // Get weekly data for last 12 weeks
    for (let i = 11; i >= 0; i--) {
      const endDate = subDays(new Date(), i * 7);
      const startDate = subDays(endDate, 6);

      const snapshot = await adminDb
        .collection('trades')
        .where('createdAt', '>=', startOfDay(startDate))
        .where('createdAt', '<=', endOfDay(endDate))
        .get();

      weekly.push(snapshot.size);
    }

    // Get monthly data for last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const snapshot = await adminDb
        .collection('trades')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get();

      monthly.push(snapshot.size);
    }

    return { daily, weekly, monthly };
  }

  // Get top categories
  private static async getTopCategories(): Promise<{ category: string; count: number }[]> {
    const snapshot = await adminDb.collection('items').get();
    const categoryCount: { [key: string]: number } = {};

    snapshot.docs.forEach(doc => {
      const category = doc.data().category;
      if (category) {
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      }
    });

    return Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // Get top locations
  private static async getTopLocations(): Promise<{ location: string; count: number }[]> {
    const snapshot = await adminDb.collection('items').get();
    const locationCount: { [key: string]: number } = {};

    snapshot.docs.forEach(doc => {
      const location = doc.data().location;
      if (location?.city && location?.state) {
        const locationKey = `${location.city}, ${location.state}`;
        locationCount[locationKey] = (locationCount[locationKey] || 0) + 1;
      }
    });

    return Object.entries(locationCount)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // Calculate revenue (implement based on your monetization model)
  private static async calculateRevenue(): Promise<number> {
    // Placeholder implementation
    // This would depend on your monetization strategy:
    // - Premium subscriptions
    // - Promoted listings
    // - Transaction fees
    // - Advertisement revenue
    
    try {
      // Example: Count promoted items and calculate revenue
      const promotedItemsSnapshot = await adminDb
        .collection('items')
        .where('isPromoted', '==', true)
        .get();

      const promotedItemsRevenue = promotedItemsSnapshot.size * 5; // $5 per promoted item

      // Example: Count premium subscriptions
      const premiumUsersSnapshot = await adminDb
        .collection('users')
        .where('isPremium', '==', true)
        .get();

      const subscriptionRevenue = premiumUsersSnapshot.size * 9.99; // $9.99 per month

      return promotedItemsRevenue + subscriptionRevenue;
    } catch (error) {
      console.error('Calculate revenue error:', error);
      return 0;
    }
  }

  // Get detailed user analytics
  static async getUserAnalytics(timeRange: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{
    newUsers: number;
    activeUsers: number;
    retentionRate: number;
    averageSessionTime: number;
    topUserLocations: { location: string; count: number }[];
  }> {
    try {
      let startDate: Date;
      const endDate = new Date();

      switch (timeRange) {
        case 'day':
          startDate = subDays(endDate, 1);
          break;
        case 'week':
          startDate = subDays(endDate, 7);
          break;
        case 'month':
          startDate = subDays(endDate, 30);
          break;
        case 'year':
          startDate = subDays(endDate, 365);
          break;
        default:
          startDate = subDays(endDate, 30);
      }

      const [newUsersSnapshot, activeUsersSnapshot] = await Promise.all([
        adminDb
          .collection('users')
          .where('createdAt', '>=', startDate)
          .where('createdAt', '<=', endDate)
          .get(),
        adminDb
          .collection('users')
          .where('lastLoginAt', '>=', startDate)
          .where('lastLoginAt', '<=', endDate)
          .get(),
      ]);

      const newUsers = newUsersSnapshot.size;
      const activeUsers = activeUsersSnapshot.size;

      // Calculate retention rate (simplified)
      const retentionRate = newUsers > 0 ? (activeUsers / newUsers) * 100 : 0;

      // Calculate average session time (placeholder)
      const averageSessionTime = 25; // minutes - implement based on your tracking

      // Get top user locations
      const locationCount: { [key: string]: number } = {};
      activeUsersSnapshot.docs.forEach(doc => {
        const location = doc.data().location;
        if (location?.city && location?.state) {
          const locationKey = `${location.city}, ${location.state}`;
          locationCount[locationKey] = (locationCount[locationKey] || 0) + 1;
        }
      });

      const topUserLocations = Object.entries(locationCount)
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        newUsers,
        activeUsers,
        retentionRate,
        averageSessionTime,
        topUserLocations,
      };
    } catch (error) {
      console.error('Get user analytics error:', error);
      throw new Error('Failed to fetch user analytics');
    }
  }

  // Get trade analytics
  static async getTradeAnalytics(timeRange: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{
    totalTrades: number;
    completedTrades: number;
    successRate: number;
    averageTradeValue: number;
    tradesByType: { type: string; count: number }[];
    tradesByStatus: { status: string; count: number }[];
  }> {
    try {
      let startDate: Date;
      const endDate = new Date();

      switch (timeRange) {
        case 'day':
          startDate = subDays(endDate, 1);
          break;
        case 'week':
          startDate = subDays(endDate, 7);
          break;
        case 'month':
          startDate = subDays(endDate, 30);
          break;
        case 'year':
          startDate = subDays(endDate, 365);
          break;
        default:
          startDate = subDays(endDate, 30);
      }

      const tradesSnapshot = await adminDb
        .collection('trades')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get();

      const totalTrades = tradesSnapshot.size;
      const completedTrades = tradesSnapshot.docs.filter(doc => doc.data().status === 'completed').length;
      const successRate = totalTrades > 0 ? (completedTrades / totalTrades) * 100 : 0;

      // Calculate average trade value (for cash trades)
      const cashTrades = tradesSnapshot.docs.filter(doc => 
        doc.data().type === 'cash' && doc.data().offerDetails?.cashAmount
      );
      const totalCashValue = cashTrades.reduce((sum, doc) => 
        sum + (doc.data().offerDetails?.cashAmount || 0), 0
      );
      const averageTradeValue = cashTrades.length > 0 ? totalCashValue / cashTrades.length : 0;

      // Group by type
      const typeCount: { [key: string]: number } = {};
      const statusCount: { [key: string]: number } = {};

      tradesSnapshot.docs.forEach(doc => {
        const type = doc.data().type;
        const status = doc.data().status;

        if (type) {
          typeCount[type] = (typeCount[type] || 0) + 1;
        }
        if (status) {
          statusCount[status] = (statusCount[status] || 0) + 1;
        }
      });

      const tradesByType = Object.entries(typeCount)
        .map(([type, count]) => ({ type, count }));

      const tradesByStatus = Object.entries(statusCount)
        .map(([status, count]) => ({ status, count }));

      return {
        totalTrades,
        completedTrades,
        successRate,
        averageTradeValue,
        tradesByType,
        tradesByStatus,
      };
    } catch (error) {
      console.error('Get trade analytics error:', error);
      throw new Error('Failed to fetch trade analytics');
    }
  }

  // Export analytics data to CSV
  static async exportAnalyticsData(type: 'users' | 'items' | 'trades', timeRange: string): Promise<any[]> {
    try {
      let startDate: Date;
      const endDate = new Date();

      switch (timeRange) {
        case 'week':
          startDate = subDays(endDate, 7);
          break;
        case 'month':
          startDate = subDays(endDate, 30);
          break;
        case 'year':
          startDate = subDays(endDate, 365);
          break;
        default:
          startDate = subDays(endDate, 30);
      }

      let collection: string;
      let fields: string[];

      switch (type) {
        case 'users':
          collection = 'users';
          fields = ['id', 'email', 'displayName', 'createdAt', 'lastLoginAt', 'trustScore', 'totalTrades'];
          break;
        case 'items':
          collection = 'items';
          fields = ['id', 'title', 'category', 'status', 'createdAt', 'views', 'likes'];
          break;
        case 'trades':
          collection = 'trades';
          fields = ['id', 'type', 'status', 'createdAt', 'completedAt'];
          break;
        default:
          throw new Error('Invalid export type');
      }

      const snapshot = await adminDb
        .collection(collection)
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        const exportData: any = { id: doc.id };

        fields.forEach(field => {
          if (field === 'createdAt' || field === 'lastLoginAt' || field === 'completedAt') {
            exportData[field] = data[field]?.toDate()?.toISOString() || '';
          } else {
            exportData[field] = data[field] || '';
          }
        });

        return exportData;
      });
    } catch (error) {
      console.error('Export analytics data error:', error);
      throw new Error('Failed to export analytics data');
    }
  }
}