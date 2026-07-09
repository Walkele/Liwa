import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { MatchingService } from '../services/MatchingService';
import OptimizedDiscoveryService from '../services/OptimizedDiscoveryService';
import OptimizedSwipeCard from '../components/OptimizedSwipeCard';
import CacheSummary from '../components/CacheSummary';

const { width: screenWidth } = Dimensions.get('window');

export default function SwipeScreen({ navigation }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeStats, setSwipeStats] = useState({
    totalSwipes: 0,
    rightSwipes: 0,
    leftSwipes: 0,
    swipeRate: 0,
    lastSwipeDate: null
  });
  const [cacheSummary, setCacheSummary] = useState({
    swipeHistory: { cached: false, count: 0, lastUpdated: null },
    offers: { cached: false, count: 0, lastUpdated: null },
    totalCacheSize: 0
  });
  const [showCacheSummary, setShowCacheSummary] = useState(false);
  const [filters, setFilters] = useState({
    maxDistance: 25,
    category: null,
    minValue: null,
    maxValue: null
  });
  const [userLocation, setUserLocation] = useState(null);
  const [hasItemsToSwipe, setHasItemsToSwipe] = useState(true);

  // Preload items on mount
  useEffect(() => {
    if (user) {
      initializeSwipeScreen();
    }
  }, [user]);

  const initializeSwipeScreen = async () => {
    try {
      setLoading(true);
      
      // Preload data for better performance
      await OptimizedDiscoveryService.preloadItems(user.uid);
      
      // Load initial items
      await loadOptimizedItems();
      
      // Load user stats
      await loadUserStats();
      
      // Update cache summary
      updateCacheSummary();
      
    } catch (error) {
      console.error('❌ Error initializing swipe screen:', error);
      Alert.alert('Error', 'Failed to load items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadOptimizedItems = async () => {
    try {
      console.log('🚀 Loading optimized discovery items...');
      
      const discoveryItems = await OptimizedDiscoveryService.getOptimizedDiscoveryItems(user.uid, {
        ...filters,
        userLocation,
        limit: 20,
        excludeArchived: true,
        excludeCompleted: true,
        showOfferValues: true
      });

      console.log(`✅ Loaded ${discoveryItems.length} optimized items`);
      
      setItems(discoveryItems);
      setCurrentIndex(0);
      setHasItemsToSwipe(discoveryItems.length > 0);
      
      // If no items, check if user has any items at all
      if (discoveryItems.length === 0) {
        const hasAnyItems = await OptimizedDiscoveryService.hasItemsToSwipe(user.uid);
        setHasItemsToSwipe(hasAnyItems);
      }
      
    } catch (error) {
      console.error('❌ Error loading optimized items:', error);
      setItems([]);
      setHasItemsToSwipe(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const stats = await OptimizedDiscoveryService.getUserSwipeStats(user.uid);
      setSwipeStats(stats);
    } catch (error) {
      console.error('❌ Error loading user stats:', error);
    }
  };

  const updateCacheSummary = () => {
    const summary = OptimizedDiscoveryService.getCacheSummary(user.uid);
    setCacheSummary(summary);
  };

  const handleSwipe = useCallback(async (direction, item) => {
    try {
      console.log(`👆 Optimized swipe ${direction} on: ${item.title}`);
      
      // Record swipe with MatchingService
      const swipeResult = await MatchingService.recordSwipe(
        user.uid, 
        item.id, 
        direction, 
        item.userId
      );

      if (!swipeResult.success) {
        throw new Error(swipeResult.error);
      }

      // Update local state immediately for better UX
      setCurrentIndex(prev => prev + 1);
      
      // Update swipe stats
      setSwipeStats(prev => ({
        ...prev,
        totalSwipes: prev.totalSwipes + 1,
        rightSwipes: direction === 'right' ? prev.rightSwipes + 1 : prev.rightSwipes,
        leftSwipes: direction === 'left' ? prev.leftSwipes + 1 : prev.leftSwipes,
        swipeRate: direction === 'right' ? 
          ((prev.rightSwipes + 1) / (prev.totalSwipes + 1)) * 100 :
          (prev.rightSwipes / (prev.totalSwipes + 1)) * 100,
        lastSwipeDate: new Date()
      }));

      // Clear cache to get fresh data
      OptimizedDiscoveryService.clearUserCache(user.uid);
      updateCacheSummary();

      if (direction === 'right') {
        // Show interest feedback
        if (item.hasExistingOffer) {
          Alert.alert(
            '💰 Follow-up Interest!', 
            `You've shown additional interest in "${item.title}". Your previous ${item.existingOfferType} offer of $${item.existingOfferAmount} is ${item.existingOfferStatus}.`,
            [
              { text: 'OK' },
              { 
                text: 'View Offer', 
                onPress: () => navigation.navigate('Offers') 
              }
            ]
          );
        } else {
          Alert.alert(
            '❤️ Interested!', 
            `You showed interest in "${item.title}". If ${item.userName || 'the seller'} is also interested in one of your items, you'll get a match!`,
            [{ text: 'OK' }]
          );
        }
      }

      // Load more items if running low
      if (currentIndex >= items.length - 3) {
        console.log('📦 Running low on items, loading more...');
        await loadOptimizedItems();
      }

    } catch (error) {
      console.error('❌ Error handling optimized swipe:', error);
      Alert.alert('Error', 'Failed to process swipe. Please try again.');
    }
  }, [user.uid, currentIndex, items.length, navigation]);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear your cached data and reload fresh items. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: () => {
            OptimizedDiscoveryService.clearUserCache(user.uid);
            updateCacheSummary();
            loadOptimizedItems();
          }
        }
      ]
    );
  };

  const handleResetSwipes = () => {
    Alert.alert(
      'Reset Swipe History',
      'This will clear your swipe history so you can see all items again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await MatchingService.clearSwipeHistory(user.uid);
              
              if (result.success) {
                await loadOptimizedItems();
                await loadUserStats();
                updateCacheSummary();
                
                Alert.alert(
                  'Success', 
                  `Cleared ${result.clearedCount} swipe records! You can now see all items again.`
                );
              } else {
                throw new Error(result.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reset swipes: ' + error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderEmptyState = () => {
    if (!hasItemsToSwipe) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Items Available</Text>
          <Text style={styles.emptySubtext}>
            There are no items to swipe right now. Try adjusting your filters or check back later for new listings!
          </Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Post')}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.actionButtonText}>Post Your First Item</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        <Text style={styles.emptyTitle}>All Caught Up!</Text>
        <Text style={styles.emptySubtext}>
          You've seen all available items. Check back later for new listings or reset your swipe history to see items again.
        </Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleResetSwipes}
        >
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.actionButtonText}>Reset Swipe History</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading optimized items...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (items.length === 0 || currentIndex >= items.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleResetSwipes}>
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SwipeIt</Text>
          <TouchableOpacity onPress={() => setShowCacheSummary(!showCacheSummary)}>
            <Ionicons name="analytics" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {showCacheSummary && (
          <CacheSummary
            cacheSummary={cacheSummary}
            swipeStats={swipeStats}
            onClearCache={handleClearCache}
          />
        )}
        
        {renderEmptyState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleResetSwipes}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>SwipeIt</Text>
          <Text style={styles.headerSubtitle}>
            {currentIndex + 1} of {items.length}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowCacheSummary(!showCacheSummary)}>
          <Ionicons name="analytics" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      {showCacheSummary && (
        <CacheSummary
          cacheSummary={cacheSummary}
          swipeStats={swipeStats}
          onClearCache={handleClearCache}
        />
      )}
      
      <View style={styles.cardContainer}>
        {items.map((item, index) => (
          <OptimizedSwipeCard
            key={`${item.id}_${index}`}
            item={item}
            index={index}
            currentIndex={currentIndex}
            onSwipe={handleSwipe}
          />
        ))}
      </View>
      
      <View style={styles.instructions}>
        <View style={styles.instructionItem}>
          <Ionicons name="arrow-back" size={20} color="#FF6B6B" />
          <Text style={styles.instructionText}>Pass</Text>
        </View>
        <View style={styles.instructionItem}>
          <Ionicons name="heart" size={20} color="#4CAF50" />
          <Text style={styles.instructionText}>
            {swipeStats.rightSwipes} interested ({swipeStats.swipeRate.toFixed(0)}%)
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <Ionicons name="arrow-forward" size={20} color="#4CAF50" />
          <Text style={styles.instructionText}>Interested</Text>
        </View>
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FF6B6B',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    marginTop: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});