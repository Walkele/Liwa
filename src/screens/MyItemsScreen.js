import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

export default function MyItemsScreen({ navigation }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'sold', 'all'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let q = query(
      collection(db, 'items'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter based on active tab
      let filteredItems = itemsList;
      if (activeTab === 'active') {
        filteredItems = itemsList.filter(item => item.status === 'available');
      } else if (activeTab === 'sold') {
        filteredItems = itemsList.filter(item => item.status === 'traded' || item.status === 'sold');
      }
      
      setItems(filteredItems);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, activeTab]);

  const handleEditItem = (item) => {
    navigation.navigate('Post', { editItem: item });
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'items', item.id));
              Alert.alert('Success', 'Item deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const handleMarkAsSold = async (item) => {
    Alert.alert(
      'Mark as Sold',
      `Mark "${item.title}" as sold?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Sold',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'items', item.id), {
                status: 'sold',
                soldAt: new Date()
              });
              Alert.alert('Success', 'Item marked as sold');
            } catch (error) {
              Alert.alert('Error', 'Failed to update item: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const handleReactivateItem = async (item) => {
    Alert.alert(
      'Reactivate Item',
      `Reactivate "${item.title}" for trading?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'items', item.id), {
                status: 'available',
                reactivatedAt: new Date()
              });
              Alert.alert('Success', 'Item reactivated');
            } catch (error) {
              Alert.alert('Error', 'Failed to reactivate item: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isActive = item.status === 'available';
    const isSold = item.status === 'sold' || item.status === 'traded';

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => navigation.navigate('ItemDetails', { item })}
      >
        <View style={styles.itemImageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={40} color="#ccc" />
            </View>
          )}
          <View style={[
            styles.statusBadge,
            { backgroundColor: isActive ? '#4CAF50' : isSold ? '#FF9500' : '#999' }
          ]}>
            <Text style={styles.statusText}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.itemPrice}>${item.price}</Text>
          <Text style={styles.itemCategory}>{item.category} • {item.condition}</Text>
          
          <View style={styles.itemStats}>
            <View style={styles.stat}>
              <Ionicons name="eye-outline" size={16} color="#666" />
              <Text style={styles.statText}>{item.views || 0}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="heart-outline" size={16} color="#666" />
              <Text style={styles.statText}>{item.likes || 0}</Text>
            </View>
            <Text style={styles.itemDate}>
              {item.createdAt?.toDate().toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditItem(item)}
          >
            <Ionicons name="create-outline" size={20} color="#FF6B6B" />
          </TouchableOpacity>
          
          {isActive && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleMarkAsSold(item)}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
            </TouchableOpacity>
          )}
          
          {isSold && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReactivateItem(item)}
            >
              <Ionicons name="refresh-outline" size={20} color="#FF9500" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteItem(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Items</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Please login to view your items</Text>
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
        <Text style={styles.headerTitle}>My Items</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Post')}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sold' && styles.activeTab]}
          onPress={() => setActiveTab('sold')}
        >
          <Text style={[styles.tabText, activeTab === 'sold' && styles.activeTabText]}>
            Sold
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {loading ? 'Loading items...' : `No ${activeTab} items yet`}
          </Text>
          <Text style={styles.emptySubtext}>
            Start posting items to build your inventory
          </Text>
          <TouchableOpacity
            style={styles.postButton}
            onPress={() => navigation.navigate('Post')}
          >
            <Text style={styles.postButtonText}>Post Your First Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.itemsList}
          contentContainerStyle={styles.itemsContent}
        />
      )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  itemsList: {
    flex: 1,
  },
  itemsContent: {
    padding: 16,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  noImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  itemCategory: {
    fontSize: 14,
    color: '#666',
  },
  itemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
    marginLeft: 'auto',
  },
  itemActions: {
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingLeft: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  postButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  postButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});