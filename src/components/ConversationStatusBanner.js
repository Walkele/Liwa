import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ConversationStatusBanner = ({ 
  conversationStatus, 
  onViewTradeHistory, 
  onContactSupport,
  style = {} 
}) => {
  if (!conversationStatus || conversationStatus.status === 'active') {
    return null;
  }

  const getStatusConfig = () => {
    switch (conversationStatus.completionReason) {
      case 'trade_completed':
      case 'traded':
        return {
          icon: 'checkmark-circle',
          iconColor: '#4CAF50',
          backgroundColor: '#E8F5E8',
          borderColor: '#4CAF50',
          title: '🎉 Trade Completed',
          message: 'This conversation is archived. The trade was completed successfully.',
          showTradeHistory: true
        };
        
      case 'offer_accepted':
        return {
          icon: 'cash',
          iconColor: '#4CAF50',
          backgroundColor: '#E8F5E8',
          borderColor: '#4CAF50',
          title: '✅ Offer Accepted',
          message: 'This conversation is archived. Your offer was accepted and completed.',
          showTradeHistory: true
        };
        
      case 'trade_cancelled':
        return {
          icon: 'close-circle',
          iconColor: '#FF4444',
          backgroundColor: '#FFEBEE',
          borderColor: '#FF4444',
          title: '❌ Trade Cancelled',
          message: 'This conversation is archived. The trade was cancelled.',
          showTradeHistory: false
        };
        
      case 'items_archived':
        return {
          icon: 'archive',
          iconColor: '#FF9800',
          backgroundColor: '#FFF8E1',
          borderColor: '#FF9800',
          title: '📦 Items Archived',
          message: 'This conversation is archived. The related items are no longer available.',
          showTradeHistory: false
        };
        
      default:
        return {
          icon: 'information-circle',
          iconColor: '#2196F3',
          backgroundColor: '#E3F2FD',
          borderColor: '#2196F3',
          title: '📝 Conversation Archived',
          message: 'This conversation has been archived and is read-only.',
          showTradeHistory: false
        };
    }
  };

  const config = getStatusConfig();
  const completedDate = conversationStatus.completedAt?.toDate?.() || new Date();

  return (
    <View style={[styles.container, { 
      backgroundColor: config.backgroundColor,
      borderColor: config.borderColor 
    }, style]}>
      <View style={styles.header}>
        <View style={styles.iconTitleContainer}>
          <Ionicons 
            name={config.icon} 
            size={24} 
            color={config.iconColor} 
            style={styles.icon}
          />
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: config.iconColor }]}>
              {config.title}
            </Text>
            <Text style={styles.message}>
              {config.message}
            </Text>
            <Text style={styles.date}>
              Completed: {completedDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* Trade Details */}
      {conversationStatus.tradeDetails && (
        <View style={styles.tradeDetails}>
          {conversationStatus.tradeDetails.itemTitles && (
            <Text style={styles.tradeInfo}>
              Items: {conversationStatus.tradeDetails.itemTitles.join(' ↔ ')}
            </Text>
          )}
          {conversationStatus.tradeDetails.tradeValue && (
            <Text style={styles.tradeInfo}>
              Value: ${conversationStatus.tradeDetails.tradeValue}
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {config.showTradeHistory && onViewTradeHistory && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryAction]}
            onPress={onViewTradeHistory}
          >
            <Ionicons name="time" size={16} color="white" />
            <Text style={styles.primaryActionText}>View Trade History</Text>
          </TouchableOpacity>
        )}
        
        {onContactSupport && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={onContactSupport}
          >
            <Ionicons name="help-circle" size={16} color="#666" />
            <Text style={styles.secondaryActionText}>Contact Support</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Read-Only Indicator */}
      <View style={styles.readOnlyIndicator}>
        <Ionicons name="lock-closed" size={14} color="#666" />
        <Text style={styles.readOnlyText}>
          This conversation is read-only. You can view message history but cannot send new messages.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    marginBottom: 12,
  },
  iconTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  tradeDetails: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  tradeInfo: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  primaryAction: {
    backgroundColor: '#FF6B6B',
  },
  secondaryAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  primaryActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  secondaryActionText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  readOnlyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    gap: 6,
  },
  readOnlyText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    flex: 1,
  },
});

export default ConversationStatusBanner;