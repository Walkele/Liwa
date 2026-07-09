import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const EnhancedTradeTray = ({ 
  youGive = [], 
  youGet = [], 
  cashAmount = 0, 
  direction = 'outgoing', // 'outgoing' or 'incoming'
  onBrowseInventory,
  estimatedValues = { give: 0, get: 0 }
}) => {
  const isBalanced = Math.abs(estimatedValues.give + cashAmount - estimatedValues.get) <= 20;
  const needsMoreValue = (estimatedValues.give + cashAmount) < (estimatedValues.get - 20);
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="swap-horizontal" size={20} color="#FF6B6B" />
        <Text style={styles.headerText}>Trade Summary</Text>
        <View style={[
          styles.balanceIndicator,
          isBalanced ? styles.balanced : needsMoreValue ? styles.needsMore : styles.tooMuch
        ]}>
          <Text style={styles.balanceText}>
            {isBalanced ? 'Fair' : needsMoreValue ? 'Add More' : 'Too Much'}
          </Text>
        </View>
      </View>

      {/* Trade Sections */}
      <View style={styles.tradeSection}>
        {/* You Give */}
        <View style={styles.sideContainer}>
          <View style={styles.sideHeader}>
            <Ionicons name="arrow-up-outline" size={16} color="#FF6B6B" />
            <Text style={styles.sideTitle}>YOU GIVE</Text>
          </View>
          
          <View style={styles.itemsList}>
            {youGive.length > 0 ? (
              youGive.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.title}</Text>
                  <Text style={styles.itemValue}>${item.estimatedValue || 0}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No items selected</Text>
            )}
            
            {cashAmount > 0 && (
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>Cash Top-up</Text>
                <Text style={[styles.itemValue, styles.cashValue]}>+${cashAmount}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Value:</Text>
            <Text style={styles.totalValue}>${estimatedValues.give + cashAmount}</Text>
          </View>
        </View>

        {/* VS Divider */}
        <View style={styles.divider}>
          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>
        </View>

        {/* You Get */}
        <View style={styles.sideContainer}>
          <View style={styles.sideHeader}>
            <Ionicons name="arrow-down-outline" size={16} color="#4CAF50" />
            <Text style={styles.sideTitle}>YOU GET</Text>
          </View>
          
          <View style={styles.itemsList}>
            {youGet.length > 0 ? (
              youGet.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.title}</Text>
                  <Text style={styles.itemValue}>${item.estimatedValue || 0}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No items selected</Text>
            )}
          </View>
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Value:</Text>
            <Text style={styles.totalValue}>${estimatedValues.get}</Text>
          </View>
        </View>
      </View>

      {/* Browse Inventory Button */}
      {onBrowseInventory && (
        <TouchableOpacity style={styles.browseButton} onPress={onBrowseInventory}>
          <Ionicons name="grid-outline" size={18} color="#666" />
          <Text style={styles.browseText}>Browse Their Full Inventory</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
      )}

      {/* Value Guidance */}
      <View style={styles.guidance}>
        <Ionicons 
          name={isBalanced ? "checkmark-circle" : "information-circle"} 
          size={16} 
          color={isBalanced ? "#4CAF50" : "#FF9800"} 
        />
        <Text style={styles.guidanceText}>
          {isBalanced 
            ? "This looks like a fair trade!" 
            : needsMoreValue 
              ? `Consider adding $${Math.ceil((estimatedValues.get - estimatedValues.give - cashAmount) / 10) * 10} more value`
              : "You might be offering too much - they should add cash or items"
          }
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  balanceIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  balanced: {
    backgroundColor: '#E8F5E8',
  },
  needsMore: {
    backgroundColor: '#FFF3E0',
  },
  tooMuch: {
    backgroundColor: '#FFEBEE',
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  tradeSection: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  sideContainer: {
    flex: 1,
  },
  sideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sideTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 4,
  },
  itemsList: {
    minHeight: 60,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  cashValue: {
    color: '#4CAF50',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  divider: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginTop: 12,
  },
  browseText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    textAlign: 'center',
  },
  guidance: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  guidanceText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
});

export default EnhancedTradeTray;