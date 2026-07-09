import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const TradeTray = ({ 
  yourItems = [], 
  theirItems = [], 
  cashAmount = 0,
  cashDirection = 'you_pay',
  onRemoveYourItem,
  onRemoveTheirItem,
  onAddItem,
  onEditCash,
  editable = false,
  style 
}) => {

  const calculateTotal = (items, includeCash = false) => {
    const itemsTotal = items.reduce((sum, item) => sum + (item.estimatedValue || 0), 0);
    if (!includeCash) return itemsTotal;
    
    return cashDirection === 'you_pay' ? 
      (includeCash === 'yours' ? itemsTotal + cashAmount : itemsTotal) :
      (includeCash === 'theirs' ? itemsTotal + cashAmount : itemsTotal);
  };

  const renderItemCard = (item, onRemove, isYours) => (
    <View key={item.id} style={styles.itemCard}>
      <Image 
        source={{ uri: item.photos?.[0] || 'https://via.placeholder.com/60' }} 
        style={styles.itemImage}
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.itemValue}>
          ${item.estimatedValue || 0}
        </Text>
      </View>
      {editable && onRemove && (
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => onRemove(item.id)}
        >
          <Ionicons name="close-circle" size={20} color="#F44336" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCashCard = (amount, isYours) => (
    <View style={[styles.itemCard, styles.cashCard]}>
      <View style={styles.cashIcon}>
        <Ionicons name="cash" size={24} color="#4CAF50" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>Cash</Text>
        <Text style={[styles.itemValue, styles.cashValue]}>
          +${amount}
        </Text>
      </View>
      {editable && onEditCash && (
        <TouchableOpacity 
          style={styles.editButton}
          onPress={onEditCash}
        >
          <Ionicons name="pencil" size={16} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderAddButton = (onAdd, label) => (
    <TouchableOpacity 
      style={styles.addButton}
      onPress={onAdd}
    >
      <Ionicons name="add-circle" size={24} color="#FF6B6B" />
      <Text style={styles.addButtonText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Trade Summary</Text>
      
      <View style={styles.tradeContainer}>
        {/* Your Side */}
        <View style={styles.sideContainer}>
          <View style={styles.sideHeader}>
            <Text style={styles.sideTitle}>YOU GIVE</Text>
            <Text style={styles.sideTotal}>
              ${calculateTotal(yourItems, cashDirection === 'you_pay' ? 'yours' : false)}
            </Text>
          </View>
          
          <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
            {yourItems.map(item => renderItemCard(item, onRemoveYourItem, true))}
            
            {cashAmount > 0 && cashDirection === 'you_pay' && 
              renderCashCard(cashAmount, true)
            }
            
            {editable && onAddItem && (
              renderAddButton(() => onAddItem('yours'), 'Add Item')
            )}
          </ScrollView>
        </View>

        {/* Exchange Arrow */}
        <View style={styles.exchangeArrow}>
          <Ionicons name="swap-horizontal" size={32} color="#FF6B6B" />
        </View>

        {/* Their Side */}
        <View style={styles.sideContainer}>
          <View style={styles.sideHeader}>
            <Text style={styles.sideTitle}>YOU GET</Text>
            <Text style={styles.sideTotal}>
              ${calculateTotal(theirItems, cashDirection === 'you_receive' ? 'theirs' : false)}
            </Text>
          </View>
          
          <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
            {theirItems.map(item => renderItemCard(item, onRemoveTheirItem, false))}
            
            {cashAmount > 0 && cashDirection === 'you_receive' && 
              renderCashCard(cashAmount, false)
            }
            
            {editable && onAddItem && (
              renderAddButton(() => onAddItem('theirs'), 'Browse Items')
            )}
          </ScrollView>
        </View>
      </View>

      {/* Summary Line */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {yourItems.length} Item{yourItems.length !== 1 ? 's' : ''}
          {cashAmount > 0 && cashDirection === 'you_pay' ? ` + $${cashAmount}` : ''}
          {' ↔ '}
          {theirItems.length} Item{theirItems.length !== 1 ? 's' : ''}
          {cashAmount > 0 && cashDirection === 'you_receive' ? ` + $${cashAmount}` : ''}
        </Text>
        
        {/* Value Difference Indicator */}
        {(() => {
          const yourTotal = calculateTotal(yourItems, cashDirection === 'you_pay' ? 'yours' : false);
          const theirTotal = calculateTotal(theirItems, cashDirection === 'you_receive' ? 'theirs' : false);
          const difference = yourTotal - theirTotal;
          
          if (Math.abs(difference) > 20) {
            return (
              <View style={[
                styles.differenceIndicator,
                { backgroundColor: difference > 0 ? '#FFF3E0' : '#E3F2FD' }
              ]}>
                <Ionicons 
                  name={difference > 0 ? "arrow-up" : "arrow-down"} 
                  size={16} 
                  color={difference > 0 ? "#FF9800" : "#2196F3"} 
                />
                <Text style={[
                  styles.differenceText,
                  { color: difference > 0 ? "#E65100" : "#1976D2" }
                ]}>
                  {difference > 0 ? 'You give' : 'You get'} ${Math.abs(difference)} more
                </Text>
              </View>
            );
          }
          return null;
        })()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  tradeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sideContainer: {
    flex: 1,
  },
  sideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  sideTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
    letterSpacing: 0.5,
  },
  sideTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  itemsList: {
    maxHeight: 200,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  cashCard: {
    backgroundColor: '#E8F5E8',
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
  },
  cashIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#C8E6C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  itemValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cashValue: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  removeButton: {
    padding: 4,
  },
  editButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  exchangeArrow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 40,
  },
  summaryContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 16,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  differenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  differenceText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
});