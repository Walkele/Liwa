import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OfferManagementService } from '../services/OfferManagementService';

export function OfferOverviewCard({ item, userId, onPress, style = {} }) {
  const [offerSummary, setOfferSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (item?.id && userId === item.userId) {
      loadOfferSummary();
    } else {
      setLoading(false);
    }
  }, [item?.id, userId]);

  const loadOfferSummary = async () => {
    try {
      // Use the optimized method without message details for faster loading
      const offers = await OfferManagementService.getItemOffers(item.id, false);
      
      const summary = {
        total: offers.length,
        pending: offers.filter(o => o.status === 'pending').length,
        accepted: offers.filter(o => o.status === 'accepted').length,
        highestCash: offers.filter(o => o.type === 'cash').length > 0 ? 
          Math.max(...offers.filter(o => o.type === 'cash').map(o => o.amount || 0)) : 0,
        tradeCount: offers.filter(o => o.type === 'trade').length,
        lastOfferAt: offers.length > 0 ? 
          Math.max(...offers.map(o => (o.createdAt?.toDate?.() || new Date(o.createdAt)).getTime())) : 
          null
      };
      
      setOfferSummary(summary);
    } catch (error) {
      console.error('Error loading offer summary:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show if not the owner or no offers
  if (loading || !offerSummary || offerSummary.total === 0 || userId !== item.userId) {
    return null;
  }

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style]}
      onPress={() => onPress?.(item)}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail" size={16} color="#FF6B6B" />
        </View>
        <Text style={styles.title}>
          {offerSummary.pending > 0 ? `${offerSummary.pending} New Offers` : 'View Offers'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#666" />
      </View>
      
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{offerSummary.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        
        {offerSummary.pending > 0 && (
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, styles.pendingValue]}>
              {offerSummary.pending}
            </Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
        )}
        
        {offerSummary.highestCash > 0 && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>${offerSummary.highestCash}</Text>
            <Text style={styles.summaryLabel}>Highest</Text>
          </View>
        )}
        
        {offerSummary.tradeCount > 0 && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{offerSummary.tradeCount}</Text>
            <Text style={styles.summaryLabel}>Trades</Text>
          </View>
        )}
      </View>
      
      {offerSummary.lastOfferAt && (
        <Text style={styles.lastActivity}>
          Last offer: {formatTimeAgo(offerSummary.lastOfferAt)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function QuickOfferActions({ item, userId, navigation, style = {} }) {
  const [offerCount, setOfferCount] = useState(0);

  useEffect(() => {
    if (item?.id && userId === item.userId) {
      loadOfferCount();
    }
  }, [item?.id, userId]);

  const loadOfferCount = async () => {
    try {
      const offers = await OfferManagementService.getItemOffers(item.id, false);
      const pendingCount = offers.filter(o => o.status === 'pending').length;
      setOfferCount(pendingCount);
    } catch (error) {
      console.error('Error loading offer count:', error);
    }
  };

  if (userId !== item.userId || offerCount === 0) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.quickAction, style]}
      onPress={() => navigation.navigate('OfferComparison', {
        itemId: item.id,
        itemTitle: item.title
      })}
    >
      <View style={styles.quickActionContent}>
        <Ionicons name="mail" size={20} color="white" />
        <Text style={styles.quickActionText}>
          {offerCount} Offer{offerCount !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.quickActionBadge}>
        <Text style={styles.badgeText}>{offerCount}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ffebee',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summary: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  pendingValue: {
    color: '#FF6B6B',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  lastActivity: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  quickAction: {
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    position: 'relative',
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  quickActionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF5722',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});