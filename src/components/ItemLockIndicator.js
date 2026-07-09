import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const ItemLockIndicator = ({ 
  itemId, 
  lockType, // 'soft' or 'hard'
  lockingTradeId,
  onNavigateToTrade,
  style 
}) => {
  const [lockDetails, setLockDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLockDetails();
  }, [itemId, lockingTradeId]);

  const loadLockDetails = async () => {
    try {
      if (lockingTradeId) {
        const tradeDoc = await getDoc(doc(db, 'trades', lockingTradeId));
        if (tradeDoc.exists()) {
          const tradeData = tradeDoc.data();
          setLockDetails({
            tradeId: lockingTradeId,
            otherUserId: tradeData.userA === itemId ? tradeData.userB : tradeData.userA,
            tradeState: tradeData.state,
            createdAt: tradeData.createdAt
          });
        }
      }
    } catch (error) {
      console.error('Error loading lock details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLockConfig = () => {
    if (lockType === 'hard') {
      return {
        icon: 'lock-closed',
        title: 'HARD LOCKED',
        subtitle: 'Trade accepted - cannot be modified',
        backgroundColor: '#FFEBEE',
        borderColor: '#F44336',
        iconColor: '#F44336',
        textColor: '#C62828'
      };
    } else {
      return {
        icon: 'lock-open',
        title: 'SOFT LOCKED',
        subtitle: 'In negotiation - can accept other offers',
        backgroundColor: '#FFF3E0',
        borderColor: '#FF9800',
        iconColor: '#FF9800',
        textColor: '#E65100'
      };
    }
  };

  const handleNavigateToTrade = () => {
    if (onNavigateToTrade && lockingTradeId) {
      onNavigateToTrade(lockingTradeId);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loading, style]}>
        <Text style={styles.loadingText}>Checking lock status...</Text>
      </View>
    );
  }

  if (!lockDetails) {
    return null;
  }

  const config = getLockConfig();

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor 
        }, 
        style
      ]}
      onPress={handleNavigateToTrade}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Ionicons 
          name={config.icon} 
          size={24} 
          color={config.iconColor} 
        />
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: config.textColor }]}>
            {config.title}
          </Text>
          <Text style={[styles.subtitle, { color: config.textColor }]}>
            {config.subtitle}
          </Text>
        </View>
      </View>

      {lockDetails && (
        <View style={styles.details}>
          <Text style={[styles.detailText, { color: config.textColor }]}>
            🔗 Locked by trade with User {lockDetails.otherUserId?.slice(-4)}
          </Text>
          <Text style={[styles.detailText, { color: config.textColor }]}>
            📊 Status: {lockDetails.tradeState?.toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Ionicons 
          name="arrow-forward" 
          size={16} 
          color={config.iconColor} 
        />
        <Text style={[styles.linkText, { color: config.iconColor }]}>
          View Trade Chat
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  loading: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    opacity: 0.8,
  },
  details: {
    marginBottom: 12,
    paddingLeft: 36,
  },
  detailText: {
    fontSize: 13,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});