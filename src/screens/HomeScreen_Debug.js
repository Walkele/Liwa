import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, Image, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { DataFilter } from '../utils/DataFilter';

export default function HomeScreenDebug({ navigation }) {
  const { user } = useAuth();
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadRecentItems();
      testFirebaseConnection();
    }
  }, [user]);

  const testFirebaseConnection = async () => {
    try {
      console.log('🔥 Testing Firebase connection...');
      const testQuery = query(collection(db, 'items'), limit(1));
      const testSnapshot = await getDocs(testQuery);
      console.log('✅ Firebase connection successful, found', testSnapshot.docs.length, 'documents');
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
    }
  };

  const loadRecentItems = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      console.log('🔍 Starting to load items from Firebase...');
      console.log('👤 Current user:', user ? { uid: user.uid, email: user.email } : 'Not authenticated');
      
      // Check if user is authenticated
      if (!user) {
        console.log('❌ User not authenticated, cannot load items');
        setRecentItems([]);
        return;
      }
      
      // Try simple query first
      let q;
      try {
        q = query(
          collection(db, 'items'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        console.log('✅ Query with orderBy created successfully');
      } catch (orderError) {
        console.log('❌ OrderBy failed, trying without orderBy:', orderError);
        q = query(collection(db, 'items'), limit(20));
      }
      
      const snapshot = await getDocs(q);
      console.log('📊 Firebase query executed, docs found:', snapshot.docs.length);
      
      if (snapshot.docs.length === 0) {
        console.log('📭 No documents found in items collection');
        console.log('🔍 Possible reasons:');
        console.log('   1. No items exist in the database');
        console.log('   2. Firebase security rules are blocking access');
        console.log('   3. User authentication issue');
        console.log('   4. Network connectivity problem');
      }
      
      const allItems = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 Document:', { id: doc.id, title: data.title, price: data.price, userId: data.userId });
        
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
          ...data // Include any other fields
        };
      });
      
      // Show all items without filtering for debugging
      setRecentItems(allItems);
      
      console.log(`📦 HomeScreen: ${isRefresh ? 'Refreshed' : 'Loaded'} ${allItems.length} items`);
      
    } catch (error) {
      console.error('❌ Error loading recent items:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
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

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => navigation.navigate('ItemDetails', { item })}
    >
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
      ) : (
        <View style={styles.noImage}>
          <Ionicons name="image-outline" size={40} color="#ccc" />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.itemPrice}>${item.price}</Text>
        <Text style={styles.itemLocation}>{item.location}</Text>
        <Text style={styles.itemUser}>By: {item.userName}</Text>
      </View>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SwipeIt Debug</Text>
        </View>
        <View style={styles.loginPrompt}>
          <Text style={styles.loginText}>Please log in to view items</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SwipeIt Debug</Text>
        <TouchableOpacity onPress={testFirebaseConnection}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B6B']}
            tintColor="#FF6B6B"
            title="Pull to refresh..."
            titleColor="#666"
          />
        }
      >
        <View style={styles.debugInfo}>
          <Text style={styles.debugTitle}>Debug Information</Text>
          <Text style={styles.debugText}>User: {user?.email}</Text>
          <Text style={styles.debugText}>Items found: {recentItems.length}</Text>
          <Text style={styles.debugText}>Loading: {loading ? 'Yes' : 'No'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Items (No Filter)</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : recentItems.length > 0 ? (
            <FlatList
              data={recentItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.itemsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No items found</Text>
              <Text style={styles.emptySubtext}>Check console for debug info</Text>
            </View>
          )}
        </View>
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
    padding: 20,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  debugInfo: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 14,
    marginBottom: 4,
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  itemsList: {
    paddingHorizontal: 4,
  },
  itemCard: {
    width: 150,
    marginRight: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: 100,
  },
  noImage: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  itemInfo: {
    padding: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 4,
  },
  itemLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemUser: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});