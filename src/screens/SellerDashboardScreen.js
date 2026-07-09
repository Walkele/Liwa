import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

export default function SellerDashboardScreen({ navigation }) {
  const [timeRange, setTimeRange] = useState('week');
  const [analytics, setAnalytics] = useState({
    totalSales: 2450,
    totalOrders: 34,
    averageOrderValue: 72,
    conversionRate: 12.5,
    views: 1250,
    favorites: 89,
    responseRate: 95,
    averageResponseTime: '2h',
  });

  const salesData = {
    week: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: [120, 190, 150, 220, 180, 250, 310],
    },
    month: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      data: [450, 520, 380, 600],
    },
    year: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      data: [1200, 1450, 1100, 1800, 1650, 2100],
    },
  };

  const topItems = [
    { id: 1, title: 'iPhone 12 Pro Max', price: 850, views: 234, sales: 3, image: '📱' },
    { id: 2, title: 'Nike Air Jordan 1', price: 180, views: 189, sales: 5, image: '👟' },
    { id: 3, title: 'MacBook Pro 13"', price: 1200, views: 156, sales: 2, image: '💻' },
  ];

  const recentActivity = [
    { id: 1, type: 'sale', item: 'iPhone 12 Pro Max', amount: 850, time: '2 hours ago' },
    { id: 2, type: 'offer', item: 'Nike Air Jordan 1', amount: 165, time: '5 hours ago' },
    { id: 3, type: 'question', item: 'MacBook Pro 13"', message: 'Is this still available?', time: '1 day ago' },
    { id: 4, type: 'sale', item: 'Sony PlayStation 5', amount: 450, time: '2 days ago' },
  ];

  const StatCard = ({ icon, label, value, trend, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {trend && (
        <View style={styles.trendContainer}>
          <Ionicons 
            name={trend > 0 ? 'trending-up' : 'trending-down'} 
            size={14} 
            color={trend > 0 ? '#4CAF50' : '#F44336'} 
          />
          <Text style={[styles.trendText, { color: trend > 0 ? '#4CAF50' : '#F44336' }]}>
            {Math.abs(trend)}%
          </Text>
        </View>
      )}
    </View>
  );

  const renderActivityItem = (activity) => {
    const getActivityIcon = () => {
      switch (activity.type) {
        case 'sale': return 'checkmark-circle';
        case 'offer': return 'cash-outline';
        case 'question': return 'chatbubble-outline';
        default: return 'notifications-outline';
      }
    };

    const getActivityColor = () => {
      switch (activity.type) {
        case 'sale': return '#4CAF50';
        case 'offer': return '#FF9800';
        case 'question': return '#2196F3';
        default: return '#666';
      }
    };

    return (
      <View key={activity.id} style={styles.activityItem}>
        <View style={[styles.activityIcon, { backgroundColor: `${getActivityColor()}20` }]}>
          <Ionicons name={getActivityIcon()} size={20} color={getActivityColor()} />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityTitle}>{activity.item}</Text>
          <Text style={styles.activitySubtitle}>
            {activity.type === 'sale' && `Sold for $${activity.amount}`}
            {activity.type === 'offer' && `Offer of $${activity.amount}`}
            {activity.type === 'question' && activity.message}
          </Text>
          <Text style={styles.activityTime}>{activity.time}</Text>
        </View>
        {activity.amount && (
          <Text style={styles.activityAmount}>${activity.amount}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Seller Dashboard</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="settings-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {['week', 'month', 'year'].map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range && styles.timeRangeButtonActive
              ]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[
                styles.timeRangeText,
                timeRange === range && styles.timeRangeTextActive
              ]}>
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard 
            icon="cash-outline" 
            label="Total Sales" 
            value={`$${analytics.totalSales}`} 
            trend={15} 
            color="#4CAF50" 
          />
          <StatCard 
            icon="cart-outline" 
            label="Total Orders" 
            value={analytics.totalOrders} 
            trend={8} 
            color="#2196F3" 
          />
          <StatCard 
            icon="pricetag-outline" 
            label="Avg. Order" 
            value={`$${analytics.averageOrderValue}`} 
            trend={-3} 
            color="#FF9800" 
          />
          <StatCard 
            icon="people-outline" 
            label="Conversion" 
            value={`${analytics.conversionRate}%`} 
            trend={12} 
            color="#9C27B0" 
          />
        </View>

        {/* Sales Chart */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Sales Performance</Text>
            <Text style={styles.chartSubtitle}>Revenue over time</Text>
          </View>
          <LineChart
            data={{
              labels: salesData[timeRange].labels,
              datasets: [{
                data: salesData[timeRange].data,
              }]
            }}
            width={width - 48}
            height={200}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#FF6B6B',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Additional Stats */}
        <View style={styles.secondaryStats}>
          <View style={styles.secondaryStatItem}>
            <Ionicons name="eye-outline" size={20} color="#666" />
            <Text style={styles.secondaryStatLabel}>Total Views</Text>
            <Text style={styles.secondaryStatValue}>{analytics.views}</Text>
          </View>
          <View style={styles.secondaryStatItem}>
            <Ionicons name="heart-outline" size={20} color="#666" />
            <Text style={styles.secondaryStatLabel}>Favorites</Text>
            <Text style={styles.secondaryStatValue}>{analytics.favorites}</Text>
          </View>
          <View style={styles.secondaryStatItem}>
            <Ionicons name="chatbubbles-outline" size={20} color="#666" />
            <Text style={styles.secondaryStatLabel}>Response Rate</Text>
            <Text style={styles.secondaryStatValue}>{analytics.responseRate}%</Text>
          </View>
          <View style={styles.secondaryStatItem}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.secondaryStatLabel}>Avg. Response</Text>
            <Text style={styles.secondaryStatValue}>{analytics.averageResponseTime}</Text>
          </View>
        </View>

        {/* Top Performing Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Performing Items</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {topItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.topItem}>
              <View style={styles.topItemImage}>
                <Text style={styles.topItemEmoji}>{item.image}</Text>
              </View>
              <View style={styles.topItemInfo}>
                <Text style={styles.topItemTitle}>{item.title}</Text>
                <View style={styles.topItemStats}>
                  <Text style={styles.topItemStat}>👁 {item.views} views</Text>
                  <Text style={styles.topItemStat}>💰 {item.sales} sales</Text>
                </View>
              </View>
              <View style={styles.topItemPrice}>
                <Text style={styles.topItemPriceValue}>${item.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activityList}>
            {recentActivity.map(renderActivityItem)}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Post')}
            >
              <Ionicons name="add-circle" size={24} color="#FF6B6B" />
              <Text style={styles.quickActionText}>Post Item</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('MyItems')}
            >
              <Ionicons name="list-outline" size={24} color="#FF6B6B" />
              <Text style={styles.quickActionText}>My Items</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Offers')}
            >
              <Ionicons name="mail-outline" size={24} color="#FF6B6B" />
              <Text style={styles.quickActionText}>Offers</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Shipping')}
            >
              <Ionicons name="cube-outline" size={24} color="#FF6B6B" />
              <Text style={styles.quickActionText}>Shipping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FF6B6B',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
  },
  headerButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  timeRangeTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  chartSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  chartHeader: {
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  chart: {
    borderRadius: 16,
  },
  secondaryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  secondaryStatItem: {
    width: (width - 48) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  secondaryStatLabel: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  secondaryStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  topItemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topItemEmoji: {
    fontSize: 24,
  },
  topItemInfo: {
    flex: 1,
  },
  topItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  topItemStats: {
    flexDirection: 'row',
  },
  topItemStat: {
    fontSize: 12,
    color: '#888',
    marginRight: 12,
  },
  topItemPrice: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  topItemPriceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  activityList: {
    marginTop: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: '#999',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  quickActionButton: {
    width: (width - 64) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
});