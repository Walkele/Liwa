import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, Image, StyleSheet, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { ItemTransactionStatusService } from '../services/ItemTransactionStatusService';
import { NotificationIcon } from '../components/NotificationIcon';
import { LifecycleBadge, LifecycleTimeline, LifecycleActionHint } from '../components/LifecycleBadge';
import { ItemLifecycleService } from '../services/ItemLifecycleService';
import { OfferOverviewCard, QuickOfferActions } from '../components/OfferOverviewCard';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  // Safe AuthContext access with error handling
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext?.user;
  } catch (error) {
    console.error('Error accessing AuthContext:', error);
    // Fallback user object to prevent crashes
    user = { uid: 'fallback', email: 'fallback@example.com', displayName: 'User' };
  }
  
  const [recentItems, setRecentItems] = useState({
    premium: [],
    recent: [],
    popular: [],
    categories: {}
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('🔄 HomeScreen useEffect triggered', { 
      hasUser: !!user, 
      userUid: user?.uid, 
      isFallback: user?.uid === 'fallback' 
    });
    
    if (user && user.uid !== 'fallback') {
      console.log('✅ Starting to load items...');
      loadRecentItems();
    } else {
      console.log('❌ Not loading items - user not ready');
    }
  }, [user]);

  const loadRecentItems = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Check if user is authenticated
      if (!user) {
        console.log('❌ User not authenticated, cannot load items');
        setRecentItems({
          premium: [],
          recent: [],
          popular: [],
          categories: {}
        });
        return;
      }
      
      console.log('🔍 HomeScreen: Loading items for user:', user.uid);
      
      // Simplified query for better performance
      const q = query(
        collection(db, 'items'),
        where('status', '==', 'available'), // Only get available items to avoid index
        orderBy('createdAt', 'desc'),
        limit(15) // Reduced limit for faster loading
      );
      
      console.log('📡 Executing Firebase query...');
      const snapshot = await getDocs(q);
      console.log(`📦 Firebase returned ${snapshot.docs.length} documents`);
      
      const allItems = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Ensure all required fields exist with defaults
        return {
          id: doc.id,
          title: data.title || 'Untitled Item',
          price: data.price || 0,
          description: data.description || 'No description',
          category: data.category || 'Other',
          condition: data.condition || 'Good',
          images: data.images || [],
          userId: data.userId || '',
          userEmail: data.userEmail || '',
          userName: data.userName || user?.name || 'Unknown User',
          location: data.location || user?.location || 'Unknown Location',
          status: data.status || 'available',
          createdAt: data.createdAt || new Date(),
          views: data.views || 0,
          likes: data.likes || 0,
          swipeRightCount: data.swipeRightCount || 0,
          isActive: data.isActive !== false,
          isVisible: data.isVisible !== false,
          isAvailable: data.isAvailable !== false,
          ...data // Include any other fields
        };
      });
      
      console.log(`📦 Total items from database: ${allItems.length}`);
      
      // Simple filtering - just exclude user's own items and obviously bad items
      const otherUsersItems = allItems.filter(item => {
        // Exclude user's own items
        if (item.userId === user.uid) {
          console.log(`🚫 Excluding own item: ${item.title}`);
          return false;
        }
        
        // Exclude archived items
        if (item.status === 'archived' || item.status === 'deleted') {
          console.log(`🚫 Excluding archived item: ${item.title}`);
          return false;
        }
        
        return true;
      });
      
      console.log(`📦 Other users' items: ${otherUsersItems.length} (user's own items excluded)`);
      
      // If we have no items, let's try a simpler query
      if (otherUsersItems.length === 0) {
        console.log('🔄 No items found, trying simpler query...');
        
        const simpleQuery = query(
          collection(db, 'items'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        
        const simpleSnapshot = await getDocs(simpleQuery);
        console.log(`📦 Simple query returned ${simpleSnapshot.docs.length} documents`);
        
        const simpleItems = simpleSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => item.userId !== user.uid);
        
        console.log(`📦 Simple items after filtering: ${simpleItems.length}`);
        
        if (simpleItems.length > 0) {
          // Use simple items
          const categorizedItems = {
            premium: [],
            recent: simpleItems.slice(0, 8),
            popular: [],
            categories: {}
          };
          
          setRecentItems(categorizedItems);
          console.log(`✅ Set simple items: ${simpleItems.length} items`);
          return;
        }
      }
      
      // Simple categorization without heavy processing
      const categorizedItems = {
        premium: otherUsersItems.filter(item => item.price >= 500).slice(0, 5),
        recent: otherUsersItems.slice(0, 8),
        popular: otherUsersItems.filter(item => (item.swipeRightCount || 0) > 0).slice(0, 6),
        categories: {}
      };
      
      // Group by categories
      const categoryGroups = {};
      otherUsersItems.forEach(item => {
        const category = item.category || 'Other';
        if (!categoryGroups[category]) {
          categoryGroups[category] = [];
        }
        if (categoryGroups[category].length < 4) {
          categoryGroups[category].push(item);
        }
      });
      
      categorizedItems.categories = categoryGroups;
      
      setRecentItems(categorizedItems);
      
      console.log(`📦 Categorized items loaded:`, {
        premium: categorizedItems.premium.length,
        recent: categorizedItems.recent.length,
        popular: categorizedItems.popular.length,
        categories: Object.keys(categorizedItems.categories).length
      });
      
    } catch (error) {
      console.error('Error loading recent items:', error);
      // Fallback to empty state
      setRecentItems({
        premium: [],
        recent: [],
        popular: [],
        categories: {}
      });
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const onRefresh = () => {
    loadRecentItems(true);
  };

  const renderItemCard = (item) => {
    // Get lifecycle information (lightweight version)
    const lifecycle = ItemLifecycleService.getItemLifecycleStage(item);
    const canUserInteract = ItemLifecycleService.canUserPerformAction(item, 'offer', user?.uid);
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.itemCard,
          !canUserInteract && styles.itemCardLimited
        ]}
        onPress={() => navigation.navigate('ItemDetails', { item })}
      >
        {item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
        ) : (
          <View style={styles.noImage}>
            <Ionicons name="image-outline" size={40} color="#ccc" />
          </View>
        )}
        
        {/* Lifecycle Badge */}
        <View style={styles.lifecycleBadgeContainer}>
          <LifecycleBadge item={item} size="small" />
        </View>
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title || 'Untitled Item'}</Text>
          <Text style={styles.itemPrice}>${item.price || 0}</Text>
          <Text style={styles.itemLocation}>{item.location || 'Unknown Location'}</Text>
          <Text style={styles.itemUser}>by {item.userName || 'Unknown User'}</Text>
          
          {/* Lifecycle Timeline */}
          <LifecycleTimeline item={item} style={styles.timelineContainer} />
          
          {/* Offer Overview for User's Own Items */}
          <OfferOverviewCard 
            item={item} 
            userId={user?.uid} 
            onPress={(item) => navigation.navigate('OfferComparison', {
              itemId: item.id,
              itemTitle: item.title
            })}
            style={styles.offerOverviewContainer}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (title, items, showViewAll = false) => {
    if (!items || items.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {showViewAll && (
            <TouchableOpacity onPress={() => navigation.navigate('Search')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={items}
          renderItem={({ item }) => renderItemCard(item)}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.itemsList}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Liwa</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('LifecycleGuide')}
            style={styles.headerButton}
          >
            <Ionicons name="help-circle-outline" size={24} color="white" />
          </TouchableOpacity>
          <NotificationIcon
            onPress={() => navigation.navigate('Notifications')}
            size={24}
            color="white"
            showCount={true}
            showPulse={true}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B6B']} // Android
            tintColor="#FF6B6B" // iOS
            title="Pull to refresh..."
            titleColor="#666"
          />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            {user ? `Welcome back, ${user.name || user.email?.split('@')[0] || 'User'}!` : 'Welcome to Liwa!'}
          </Text>
          <Text style={styles.welcomeSubtext}>
            Discover amazing items in your area
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Post')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="add-circle" size={28} color="#FF6B6B" />
            </View>
            <Text style={styles.actionText}>Post Item</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Search')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="search" size={28} color="#FF6B6B" />
            </View>
            <Text style={styles.actionText}>Search</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('MyOffers')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="mail" size={28} color="#FF6B6B" />
            </View>
            <Text style={styles.actionText}>My Offers</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Messages')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="chatbubble" size={28} color="#FF6B6B" />
            </View>
            <Text style={styles.actionText}>Messages</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Items */}
        {renderSection('🔥 Premium Items', recentItems.premium, true)}
        {renderSection('⏰ Recently Added', recentItems.recent, true)}
        {renderSection('❤️ Popular Items', recentItems.popular, true)}
        
        {/* Categories */}
        {Object.entries(recentItems.categories || {}).map(([category, items]) => (
          <View key={category}>
            {renderSection(`📂 ${category}`, items, true)}
          </View>
        )).filter(Boolean)}

        {loading ? (
          <View style={styles.section}>
            <Text style={styles.loadingText}>Loading...</Text>
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => {
                console.log('🔧 Manual load triggered');
                loadRecentItems();
              }}
            >
              <Text style={styles.debugButtonText}>Force Load</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Show empty state only if no items in any category
          (!recentItems.recent?.length && !recentItems.premium?.length && !recentItems.popular?.length && 
           !Object.keys(recentItems.categories || {}).length) && (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No items available</Text>
              <Text style={styles.emptySubtext}>Pull down to refresh or post your first item!</Text>
              
              <TouchableOpacity
                style={styles.debugButton}
                onPress={() => {
                  console.log('🔧 Debug load triggered');
                  console.log('Current user:', user);
                  console.log('Current recentItems:', recentItems);
                  loadRecentItems();
                }}
              >
                <Text style={styles.debugButtonText}>Debug Load</Text>
              </TouchableOpacity>
            </View>
          )
        )}
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
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 12,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  viewAllText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  refreshText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 4,
  },
  itemsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  itemCard: {
    width: (width - 64) / 2,
    marginRight: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  lifecycleBadgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
  },
  timelineContainer: {
    marginTop: 4,
  },
  actionHintContainer: {
    marginTop: 2,
  },
  offerOverviewContainer: {
    marginTop: 4,
  },
  itemCardUnavailable: {
    opacity: 0.7,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
  },
  itemImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F8F9FA',
  },
  noImage: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  itemInfo: {
    padding: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    lineHeight: 18,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B6B',
    marginTop: 4,
  },
  itemLocation: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemUser: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemCardLimited: {
    opacity: 0.8,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  interactionHint: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 12,
  },
  offerCount: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '600',
    marginTop: 2,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 60,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#999',
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  devButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  diagnosticButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  unarchiveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  diagnosticButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  debugButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});