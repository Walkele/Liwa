import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { SellerAnalyticsService } from '../services/SellerAnalyticsService';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

export default function SellerAnalyticsScreen({ navigation }) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await SellerAnalyticsService.getSellerAnalytics(user.uid, timeRange);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      {['7d', '30d', '90d', '1y'].map(range => (
        <TouchableOpacity
          key={range}
          style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange(range)}
        >
          <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>
            {range === '1y' ? '1Y' : range.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabSelector = () => (
    <View style={styles.tabContainer}>
      {['overview', 'sales', 'inventory', 'engagement'].map(tab => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabButton, selectedTab === tab && styles.tabButtonActive]}
          onPress={() => setSelectedTab(tab)}
        >
          <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverview = () => {
    if (!analytics?.overview) return null;

    const metrics = [
      { label: 'Total Items', value: analytics.overview.totalItems, icon: 'cube-outline', color: '#FF6B6B' },
      { label: 'Active Items', value: analytics.overview.activeItems, icon: 'list-outline', color: '#4CAF50' },
      { label: 'Sold Items', value: analytics.overview.soldItems, icon: 'checkmark-circle-outline', color: '#2196F3' },
      { label: 'Total Revenue', value: `$${analytics.overview.totalRevenue}`, icon: 'cash-outline', color: '#FF9500' },
      { label: 'Total Offers', value: analytics.overview.totalOffers, icon: 'chatbubble-outline', color: '#9C27B0' },
      { label: 'Sell Through Rate', value: `${analytics.overview.sellThroughRate}%`, icon: 'trending-up-outline', color: '#00BCD4' },
    ];

    return (
      <View style={styles.metricsContainer}>
        {metrics.map((metric, index) => (
          <View key={index} style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: `${metric.color}20` }]}>
              <Ionicons name={metric.icon} size={24} color={metric.color} />
            </View>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderSales = () => {
    if (!analytics?.sales) return null;

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Sales Performance</Text>
        
        <View style={styles.salesSummary}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Sales</Text>
            <Text style={styles.summaryValue}>${analytics.sales.totalSales}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Trades</Text>
            <Text style={styles.summaryValue}>{analytics.sales.totalTrades}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Avg Order Value</Text>
            <Text style={styles.summaryValue}>${analytics.sales.averageSaleValue}</Text>
          </View>
        </View>

        {Object.keys(analytics.sales.salesByCategory).length > 0 && (
          <View style={styles.breakdownContainer}>
            <Text style={styles.breakdownTitle}>Sales by Category</Text>
            {Object.entries(analytics.sales.salesByCategory).map(([category, value]) => (
              <View key={category} style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>{category}</Text>
                <Text style={styles.breakdownValue}>${value}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderInventory = () => {
    if (!analytics?.inventory) return null;

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Inventory Analysis</Text>
        
        <View style={styles.inventorySummary}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Active Items</Text>
            <Text style={styles.summaryValue}>{analytics.inventory.totalActiveItems}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={styles.summaryValue}>${analytics.inventory.totalInventoryValue}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Avg Days Listed</Text>
            <Text style={styles.summaryValue}>{analytics.inventory.averageDaysListed}d</Text>
          </View>
        </View>

        {Object.keys(analytics.inventory.categoryBreakdown).length > 0 && (
          <View style={styles.breakdownContainer}>
            <Text style={styles.breakdownTitle}>Items by Category</Text>
            {Object.entries(analytics.inventory.categoryBreakdown).map(([category, count]) => (
              <View key={category} style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>{category}</Text>
                <Text style={styles.breakdownValue}>{count} items</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderEngagement = () => {
    if (!analytics?.engagement) return null;

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Engagement Metrics</Text>
        
        <View style={styles.engagementGrid}>
          <View style={styles.engagementCard}>
            <Ionicons name="eye-outline" size={32} color="#FF6B6B" />
            <Text style={styles.engagementValue}>{analytics.engagement.totalViews}</Text>
            <Text style={styles.engagementLabel}>Total Views</Text>
          </View>
          <View style={styles.engagementCard}>
            <Ionicons name="heart-outline" size={32} color="#E91E63" />
            <Text style={styles.engagementValue}>{analytics.engagement.totalLikes}</Text>
            <Text style={styles.engagementLabel}>Total Likes</Text>
          </View>
          <View style={styles.engagementCard}>
            <Ionicons name="chatbubble-outline" size={32} color="#2196F3" />
            <Text style={styles.engagementValue}>{analytics.engagement.totalOffersReceived}</Text>
            <Text style={styles.engagementLabel}>Offers Received</Text>
          </View>
          <View style={styles.engagementCard}>
            <Ionicons name="time-outline" size={32} color="#FF9500" />
            <Text style={styles.engagementValue}>{analytics.engagement.averageResponseTime || 'N/A'}</Text>
            <Text style={styles.engagementLabel}>Avg Response Time</Text>
          </View>
        </View>

        <View style={styles.responseRateContainer}>
          <Text style={styles.responseRateLabel}>Response Rate</Text>
          <Text style={styles.responseRateValue}>{analytics.engagement.responseRate}%</Text>
        </View>
      </View>
    );
  };

  const renderPricingInsights = () => {
    if (!analytics?.pricing?.pricingSuggestions || analytics.pricing.pricingSuggestions.length === 0) {
      return (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Pricing Insights</Text>
          <Text style={styles.noDataText}>No pricing suggestions at this time</Text>
        </View>
      );
    }

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Pricing Suggestions</Text>
        {analytics.pricing.pricingSuggestions.map((suggestion, index) => (
          <View key={index} style={styles.suggestionCard}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionTitle}>{suggestion.itemTitle}</Text>
              <View style={styles.priceComparison}>
                <Text style={styles.currentPrice}>${suggestion.currentPrice}</Text>
                <Ionicons name="arrow-forward" size={16} color="#666" />
                <Text style={styles.suggestedPrice}>${suggestion.suggestedPrice}</Text>
              </View>
            </View>
            <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
            <Text style={styles.suggestionImpact}>{suggestion.potentialImpact}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seller Analytics</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Analytics</Text>
        <TouchableOpacity onPress={loadAnalytics}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {renderTimeRangeSelector()}
      {renderTabSelector()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'sales' && renderSales()}
        {selectedTab === 'inventory' && renderInventory()}
        {selectedTab === 'engagement' && renderEngagement()}
        {renderPricingInsights()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    justifyContent: 'space-around',
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  timeRangeButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  timeRangeTextActive: {
    color: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FF6B6B',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  salesSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  breakdownContainer: {
    marginTop: 16,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  inventorySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  engagementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  engagementCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  engagementValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  engagementLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  responseRateContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  responseRateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  responseRateValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  suggestionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  priceComparison: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 4,
  },
  suggestedPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 4,
  },
  suggestionReason: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  suggestionImpact: {
    fontSize: 12,
    color: '#FF6B6B',
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
});