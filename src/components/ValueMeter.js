import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const ValueMeter = ({ 
  yourItems = [], 
  theirItems = [], 
  cashAmount = 0,
  cashDirection = 'you_pay', // 'you_pay' or 'you_receive'
  style 
}) => {
  
  const calculateTotalValue = (items) => {
    return items.reduce((total, item) => total + (item.estimatedValue || 0), 0);
  };

  const yourTotal = calculateTotalValue(yourItems);
  const theirTotal = calculateTotalValue(theirItems);
  
  const yourFinalValue = cashDirection === 'you_pay' ? yourTotal + cashAmount : yourTotal - cashAmount;
  const theirFinalValue = cashDirection === 'you_pay' ? theirTotal : theirTotal + cashAmount;
  
  const difference = yourFinalValue - theirFinalValue;
  const percentDifference = theirFinalValue > 0 ? Math.abs(difference / theirFinalValue) * 100 : 0;
  
  const getBalanceStatus = () => {
    if (Math.abs(difference) <= 20) {
      return {
        status: 'balanced',
        color: '#4CAF50',
        icon: 'checkmark-circle',
        message: 'Fair trade!'
      };
    } else if (difference > 0) {
      return {
        status: 'you_overpay',
        color: '#FF9800',
        icon: 'arrow-up-circle',
        message: `You're offering $${Math.abs(difference)} more`
      };
    } else {
      return {
        status: 'they_overpay',
        color: '#2196F3',
        icon: 'arrow-down-circle',
        message: `They're offering $${Math.abs(difference)} more`
      };
    }
  };

  const balance = getBalanceStatus();

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Trade Value Comparison</Text>
      
      {/* Your Side */}
      <View style={styles.sideContainer}>
        <Text style={styles.sideTitle}>YOU GIVE</Text>
        <View style={styles.itemsList}>
          {yourItems.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.title}</Text>
              <Text style={styles.itemValue}>${item.estimatedValue || 0}</Text>
            </View>
          ))}
          {cashAmount > 0 && cashDirection === 'you_pay' && (
            <View style={styles.itemRow}>
              <Text style={[styles.itemName, styles.cashText]}>+ Cash</Text>
              <Text style={[styles.itemValue, styles.cashText]}>+${cashAmount}</Text>
            </View>
          )}
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Your Total:</Text>
          <Text style={styles.totalValue}>${yourFinalValue}</Text>
        </View>
      </View>

      {/* Balance Indicator */}
      <View style={[styles.balanceIndicator, { backgroundColor: balance.color + '20' }]}>
        <Ionicons name={balance.icon} size={24} color={balance.color} />
        <Text style={[styles.balanceText, { color: balance.color }]}>
          {balance.message}
        </Text>
      </View>

      {/* Their Side */}
      <View style={styles.sideContainer}>
        <Text style={styles.sideTitle}>YOU GET</Text>
        <View style={styles.itemsList}>
          {theirItems.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.title}</Text>
              <Text style={styles.itemValue}>${item.estimatedValue || 0}</Text>
            </View>
          ))}
          {cashAmount > 0 && cashDirection === 'you_receive' && (
            <View style={styles.itemRow}>
              <Text style={[styles.itemName, styles.cashText]}>+ Cash</Text>
              <Text style={[styles.itemValue, styles.cashText]}>+${cashAmount}</Text>
            </View>
          )}
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Their Total:</Text>
          <Text style={styles.totalValue}>${theirFinalValue}</Text>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {yourItems.length} Item{yourItems.length !== 1 ? 's' : ''}
          {cashAmount > 0 && cashDirection === 'you_pay' ? ` + $${cashAmount}` : ''}
          {' ↔ '}
          {theirItems.length} Item{theirItems.length !== 1 ? 's' : ''}
          {cashAmount > 0 && cashDirection === 'you_receive' ? ` + $${cashAmount}` : ''}
        </Text>
        
        {percentDifference > 25 && (
          <Text style={styles.warningText}>
            ⚠️ Large value difference ({percentDifference.toFixed(0)}%). Consider adjusting.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  sideContainer: {
    marginBottom: 16,
  },
  sideTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  itemsList: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  cashText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  balanceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  summary: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#FF9800',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
});