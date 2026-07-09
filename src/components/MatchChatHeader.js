import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function MatchChatHeader({ conversation, currentUserId, onMakeOffer, onViewItem }) {
  if (!conversation?.items) return null;

  const myItem = conversation.items[currentUserId];
  const otherUserId = Object.keys(conversation.items).find(id => id !== currentUserId);
  const otherItem = conversation.items[otherUserId];
  const otherUserName = conversation.participantNames[otherUserId];

  if (!myItem || !otherItem) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="heart" size={20} color="#FF6B6B" />
        <Text style={styles.headerText}>Match Trade</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Active</Text>
        </View>
      </View>
      
      <View style={styles.itemsContainer}>
        {/* My Item */}
        <TouchableOpacity 
          style={styles.itemCard}
          onPress={() => onViewItem?.(myItem)}
        >
          <View style={styles.itemImageContainer}>
            {myItem.images && myItem.images.length > 0 ? (
              <Image source={{ uri: myItem.images[0] }} style={styles.itemImage} />
            ) : (
              <View style={styles.noImage}>
                <Ionicons name="image-outline" size={24} color="#ccc" />
              </View>
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemLabel}>Your item</Text>
            <Text style={styles.itemTitle} numberOfLines={1}>{myItem.title}</Text>
            <Text style={styles.itemPrice}>${myItem.price}</Text>
          </View>
        </TouchableOpacity>

        {/* Trade Arrow */}
        <View style={styles.tradeArrow}>
          <Ionicons name="swap-horizontal" size={24} color="#FF6B6B" />
        </View>

        {/* Their Item */}
        <TouchableOpacity 
          style={styles.itemCard}
          onPress={() => onViewItem?.(otherItem)}
        >
          <View style={styles.itemImageContainer}>
            {otherItem.images && otherItem.images.length > 0 ? (
              <Image source={{ uri: otherItem.images[0] }} style={styles.itemImage} />
            ) : (
              <View style={styles.noImage}>
                <Ionicons name="image-outline" size={24} color="#ccc" />
              </View>
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemLabel}>{otherUserName}'s item</Text>
            <Text style={styles.itemTitle} numberOfLines={1}>{otherItem.title}</Text>
            <Text style={styles.itemPrice}>${otherItem.price}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.tradeButton]}
          onPress={() => onMakeOffer?.('trade', { myItem, theirItem: otherItem })}
        >
          <Ionicons name="swap-horizontal" size={16} color="white" />
          <Text style={styles.actionButtonText}>Propose Trade</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.cashButton]}
          onPress={() => onMakeOffer?.('cash', { item: otherItem })}
        >
          <Ionicons name="cash" size={16} color="white" />
          <Text style={styles.actionButtonText}>Make Cash Offer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  itemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  itemTitle: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: 'bold',
    marginTop: 2,
  },
  tradeArrow: {
    marginHorizontal: 12,
    padding: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  tradeButton: {
    backgroundColor: '#2196F3',
  },
  cashButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});