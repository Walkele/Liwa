import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CacheSummary({ 
  cacheSummary, 
  swipeStats, 
  onClearCache, 
  style 
}) {
  
  const formatDate = (date) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getCacheStatus = () => {
    const { swipeHistory, offers } = cacheSummary;
    
    if (swipeHistory.cached && offers.cached) {
      return { status: 'optimal', color: '#4CAF50', icon: 'checkmark-circle' };
    } else if (swipeHistory.cached || offers.cached) {
      return { status: 'partial', color: '#FF9800', icon: 'warning' };
    } else {
      return { status: 'cold', color: '#666', icon: 'refresh' };
    }
  };

  const cacheStatus = getCacheStatus();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.statusIndicator}>
          <Ionicons 
            name={cacheStatus.icon} 
            size={16} 
            color={cacheStatus.color} 
          />
          <Text style={[styles.statusText, { color: cacheStatus.color }]}>
            Cache {cacheStatus.status}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={onClearCache}
        >
          <Ionicons name="trash-outline" size={14} color="#666" />
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{cacheSummary.swipeHistory.count}</Text>
          <Text style={styles.statLabel}>Swiped</Text>
          <Text style={styles.statTime}>
            {formatDate(cacheSummary.swipeHistory.lastUpdated)}
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{cacheSummary.offers.count}</Text>
          <Text style={styles.statLabel}>Offers</Text>
          <Text style={styles.statTime}>
            {formatDate(cacheSummary.offers.lastUpdated)}
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{swipeStats.totalSwipes}</Text>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statTime}>
            {swipeStats.swipeRate.toFixed(0)}% ❤️
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{cacheSummary.totalCacheSize}</Text>
          <Text style={styles.statLabel}>Cache Size</Text>
          <Text style={styles.statTime}>Items</Text>
        </View>
      </View>

      {cacheStatus.status === 'cold' && (
        <View style={styles.coldCacheWarning}>
          <Ionicons name="information-circle" size={14} color="#FF9800" />
          <Text style={styles.warningText}>
            Cold cache - first load may be slower
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
    gap: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    marginTop: 2,
  },
  statTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 1,
  },
  coldCacheWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  warningText: {
    fontSize: 11,
    color: '#F57C00',
    flex: 1,
  },
});