import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

export default function ItemSelectionModal({
  visible,
  onClose,
  onItemsSelected,
  maxItems = 3,
  targetItemValue = 0,
  title = 'Select Your Items for Trade',
  preSelectedItems = [] // Items that are already selected (e.g., matched item)
}) {
  const { user } = useAuth();
  const [userItems, setUserItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    if (visible && user) {
      loadUserItems();
    }
  }, [visible, user, preSelectedItems]);

  // Initialize selected items with pre-selected items when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedItems(preSelectedItems);
    }
  }, [visible, preSelectedItems]);

  useEffect(() => {
    const value = selectedItems.reduce((sum, item) => sum + (item.price || item.estimatedValue || 0), 0);
    setTotalValue(value);
  }, [selectedItems]);

  const loadUserItems = async () => {
    try {
      setLoading(true);
      const itemsQuery = query(
        collection(db, 'items'),
        where('userId', '==', user.uid),
        where('status', '==', 'available')
      );

      const snapshot = await getDocs(itemsQuery);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter out pre-selected items to avoid duplicates in the main list
      const preSelectedIds = preSelectedItems.map(item => item.id);
      const availableItems = items.filter(item => !preSelectedIds.includes(item.id));
      
      setUserItems(availableItems);
    } catch (error) {
      console.error('Error loading user items:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (item) => {
    const preSelectedIds = preSelectedItems.map(item => item.id);
    
    // Prevent deselecting pre-selected items (e.g., matched item)
    if (preSelectedIds.includes(item.id)) {
      return; // Cannot deselect pre-selected items
    }
    
    if (selectedItems.find(selected => selected.id === item.id)) {
      setSelectedItems(selectedItems.filter(selected => selected.id !== item.id));
    } else if (selectedItems.length < maxItems) {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleConfirm = () => {
    // Since selectedItems already includes preSelectedItems, just pass selectedItems
    console.log('📦 Final selection:', selectedItems);
    onItemsSelected(selectedItems);
    onClose();
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.find(selected => selected.id === item.id);
    const preSelectedIds = preSelectedItems.map(item => item.id);
    const isPreSelected = preSelectedIds.includes(item.id);
    const canSelect = !isSelected && !isPreSelected && selectedItems.length < maxItems;

    // Don't render pre-selected items in the main list - they're shown separately
    if (isPreSelected) return null;

    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          isSelected && styles.itemCardSelected,
          !canSelect && !isSelected && styles.itemCardDisabled
        ]}
        onPress={() => toggleItemSelection(item)}
        disabled={!canSelect && !isSelected}
      >
        <View style={styles.itemContent}>
          {item.images && item.images.length > 0 ? (
            <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
          ) : item.imageURL ? (
            <Image source={{ uri: item.imageURL }} style={styles.itemImage} />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={32} color="#ccc" />
            </View>
          )}
          
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.itemPrice}>${item.price || item.estimatedValue || 0}</Text>
            <Text style={styles.itemCategory}>{item.category || 'Uncategorized'}</Text>
          </View>

          <View style={styles.selectionIndicator}>
            {isSelected ? (
              <Ionicons name="checkbox" size={24} color="#4CAF50" />
            ) : (
              <Ionicons name="square-outline" size={24} color="#ccc" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getValueComparison = () => {
    const difference = totalValue - targetItemValue;
    const percentage = targetItemValue > 0 ? (totalValue / targetItemValue) * 100 : 0;
    
    if (difference === 0) {
      return { text: 'Perfect Match', color: '#4CAF50', status: 'equal' };
    } else if (difference > 0) {
      return { 
        text: `Your items are $${difference} more valuable`, 
        color: '#FF9800', 
        status: 'higher' 
      };
    } else {
      return { 
        text: `Your items are $${Math.abs(difference)} less valuable`, 
        color: '#F44336', 
        status: 'lower' 
      };
    }
  };

  const valueComparison = getValueComparison();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Selection Info */}
        <View style={styles.selectionInfo}>
          <View style={styles.selectionStat}>
            <Text style={styles.selectionLabel}>Selected</Text>
            <Text style={styles.selectionValue}>
              {selectedItems.length}/{maxItems} items
            </Text>
          </View>
          
          <View style={styles.selectionStat}>
            <Text style={styles.selectionLabel}>Total Value</Text>
            <Text style={styles.selectionValue}>${totalValue}</Text>
          </View>

          {targetItemValue > 0 && (
            <View style={styles.selectionStat}>
              <Text style={styles.selectionLabel}>Target Value</Text>
              <Text style={styles.selectionValue}>${targetItemValue}</Text>
            </View>
          )}
        </View>

        {/* Value Comparison */}
        {targetItemValue > 0 && selectedItems.length > 0 && (
          <View style={[styles.valueComparison, { backgroundColor: `${valueComparison.color}20` }]}>
            <Ionicons 
              name={valueComparison.status === 'equal' ? 'checkmark-circle' : 'information-circle'} 
              size={20} 
              color={valueComparison.color} 
            />
            <Text style={[styles.valueComparisonText, { color: valueComparison.color }]}>
              {valueComparison.text}
            </Text>
          </View>
        )}

        {/* Items List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your items...</Text>
          </View>
        ) : userItems.length === 0 && preSelectedItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No items available</Text>
            <Text style={styles.emptySubtext}>
              You need to list items before you can trade
            </Text>
          </View>
        ) : (
          <FlatList
            data={userItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.itemsList}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              preSelectedItems.length > 0 ? (
                <View style={styles.preSelectedSection}>
                  <Text style={styles.preSelectedTitle}>Pre-selected Items</Text>
                  {preSelectedItems.map((item) => (
                    <View key={item.id} style={styles.preSelectedItem}>
                      {item.images && item.images.length > 0 ? (
                        <Image source={{ uri: item.images[0] }} style={styles.preSelectedItemImage} />
                      ) : item.imageURL ? (
                        <Image source={{ uri: item.imageURL }} style={styles.preSelectedItemImage} />
                      ) : (
                        <View style={styles.preSelectedItemImage}>
                          <Ionicons name="image-outline" size={24} color="#ccc" />
                        </View>
                      )}
                      <View style={styles.preSelectedItemInfo}>
                        <Text style={styles.preSelectedItemTitle}>{item.title}</Text>
                        <Text style={styles.preSelectedItemPrice}>${item.price || item.estimatedValue || 0}</Text>
                        <View style={styles.preSelectedBadge}>
                          <Text style={styles.preSelectedBadgeText}>MATCHED</Text>
                        </View>
                      </View>
                      <View style={styles.preSelectedIndicator}>
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null
            }
          />
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              selectedItems.length === 0 && styles.confirmButtonDisabled
            ]}
            onPress={handleConfirm}
            disabled={selectedItems.length === 0}
          >
            <Text style={styles.confirmButtonText}>
              {selectedItems.length > 0 
                ? `Confirm Selection (${selectedItems.length} items)` 
                : 'Select Items to Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  selectionStat: {
    alignItems: 'center',
  },
  selectionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  selectionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  valueComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    gap: 8,
  },
  valueComparisonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  itemsList: {
    padding: 16,
  },
  preSelectedSection: {
    marginBottom: 16,
  },
  preSelectedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  preSelectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  preSelectedItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  preSelectedItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  preSelectedItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  preSelectedItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  preSelectedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  preSelectedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  preSelectedIndicator: {
    marginLeft: 12,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  itemCardDisabled: {
    opacity: 0.5,
  },
  itemContent: {
    flexDirection: 'row',
    padding: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  noImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    color: '#666',
  },
  selectionIndicator: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  footer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  confirmButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});