import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { OnboardingService } from '../services/OnboardingService';

const { width } = Dimensions.get('window');

export default function LocalHotItemsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [hotItems, setHotItems] = useState([]);
  const [trendingCategories, setTrendingCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadHotItems();
  }, [selectedCategory]);

  const loadHotItems = async () => {
    try {
      setLoading(true);
      
      const [hotItemsData, categoriesData] = await Promise.all([
        OnboardingService.getLocalHotItems(user.location, selectedCategory),
        OnboardingService.getTrendingCategories(user.location)
      ]);

      setHotItems(hotItemsData);
      setTrendingCategories(categoriesData);
    } catch (error) {
      console.error('Error loading hot items:', error);
      Alert.alert('Error', 'Failed to load hot items');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHotItems();
    setRefreshing(false);
  };

  const handleItemPress = (item) => {
    navigation.navigate('ItemDetails', { itemId: item.id });
  };

  const handleCategoryPress = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const renderCategoryFilter = () => (
    <View style={styles.categoryFilterContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: 'all', name: 'All', icon: 'apps-outline' }, ...trendingCategories]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryFilterButton,
              selectedCategory === item.id && styles.categoryFilterButtonActive
            ]}
            onPress={() => handleCategoryPress(item.id)}
          >
            <Ionicons 
              name={item.icon} 
              size={20} 
              color={selectedCategory === item.id ? '#FFF' : '#FF6B6B'} 
            />
            <Text style={[
              styles.categoryFilterText,
              selectedCategory === item.id && styles.categoryFilterTextActive
            ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.categoryFilterList}
      />
    </View>
  );

  const renderHotItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.hotItemCard}
      onPress={() => handleItemPress(item)}
    >
      {/* Hot Badge */}
      {index < 3 && (
        <View style={[styles.hotBadge, { backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }]}>
          <Ionicons name="flame" size={16} color="#FFF" />
          <Text style={styles.hotBadgeText}>#{index + 1}</Text>
        </View>
      )}

      {/* Item Image Placeholder */}
      <View style={styles.itemImageContainer}>
        <View style={styles.itemImagePlaceholder}>
          <Ionicons name="image-outline" size={40} color="#666" />
        </View>
        
        {/* View Count */}
        <View style={styles.viewCountBadge}>
          <Ionicons name="eye-outline" size={12} color="#FFF" />
          <Text style={styles.viewCountText}>{item.views}</Text>
        </View>
      </View>

      {/* Item Details */}
      <View style={styles.itemDetails}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
        
        <View style={styles.itemStats}>
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.statText}>{item.distance}km away</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.statText}>{item.timeAgo}</Text>
          </View>
        </View>

        {/* Interest Level */}
        <View style={styles.interestLevel}>
          <Text style={styles.interestText}>Interest Level:</Text>
          <View style={styles.interestBar}>
            <View 
              style={[
                styles.interestFill, 
                { width: `${item.interestLevel}%` }
              ]} 
            />
          </View>
          <Text style={styles.interestPercentage}>{item.interestLevel}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Hot Items Near You</Text>
          <Text style={styles.headerSubtitle}>Trending in your area</Text>
        </View>
        
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{hotItems.length}</Text>
          <Text style={styles.statLabel}>Hot Items</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{trendingCategories.length}</Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {hotItems.reduce((sum, item) => sum + item.views, 0)}
          </Text>
          <Text style={styles.statLabel}>Total Views</Text>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={80} color="#CCC" />
      <Text style={styles.emptyStateTitle}>No Hot Items Found</Text>
      <Text style={styles.emptyStateText}>
        Try selecting a different category or check back later
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => setSelectedCategory('all')}
      >
        <Text style={styles.emptyStateButtonText}>View All Items</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && hotItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Finding hot items near you...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={hotItems}
        keyExtractor={(item) => item.id}
        renderItem={renderHotItem}
        ListHeaderComponent={
          <View>
            {renderHeader()}
            {renderCategoryFilter()}
          </View>
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B6B']}
            tintColor="#FF6B6B"
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  listContainer: {
    paddingBottom: 20
  },
  header: {
    backgroundColor: '#FFF',
    paddingTop: 10,
    paddingBottom: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20
  },
  backButton: {
    padding: 8
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  refreshButton: {
    padding: 8
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 80
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  categoryFilterContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  categoryFilterList: {
    paddingHorizontal: 20
  },
  categoryFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    marginRight: 10,
    backgroundColor: '#FFF'
  },
  categoryFilterButtonActive: {
    backgroundColor: '#FF6B6B'
  },
  categoryFilterText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#FF6B6B'
  },
  categoryFilterTextActive: {
    color: '#FFF'
  },
  hotItemCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden'
  },
  hotBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1
  },
  hotBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4
  },
  itemImageContainer: {
    position: 'relative'
  },
  itemImagePlaceholder: {
    height: 200,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  viewCountBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  viewCountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4
  },
  itemDetails: {
    padding: 16
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  itemCategory: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
    marginBottom: 12
  },
  itemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4
  },
  interestLevel: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  interestText: {
    fontSize: 12,
    color: '#666',
    marginRight: 8
  },
  interestBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginRight: 8
  },
  interestFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2
  },
  interestPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B6B'
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24
  },
  emptyStateButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  }
});