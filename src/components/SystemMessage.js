import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SystemMessage = ({ message, style = {} }) => {
  if (!message.isSystemMessage) {
    return null;
  }

  const getMessageConfig = () => {
    switch (message.messageType) {
      case 'trade_completion':
        return {
          backgroundColor: '#E8F5E8',
          borderColor: '#4CAF50',
          iconColor: '#4CAF50',
          textColor: '#2E7D32'
        };
        
      case 'trade_cancellation':
        return {
          backgroundColor: '#FFEBEE',
          borderColor: '#FF4444',
          iconColor: '#FF4444',
          textColor: '#C62828'
        };
        
      case 'system_reactivation':
        return {
          backgroundColor: '#E3F2FD',
          borderColor: '#2196F3',
          iconColor: '#2196F3',
          textColor: '#1565C0'
        };
        
      default:
        return {
          backgroundColor: '#F5F5F5',
          borderColor: '#CCCCCC',
          iconColor: '#666666',
          textColor: '#333333'
        };
    }
  };

  const config = getMessageConfig();
  const completionData = message.completionData || {};
  const timestamp = message.timestamp?.toDate?.() || new Date();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.messageCard, {
        backgroundColor: config.backgroundColor,
        borderColor: config.borderColor
      }]}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.emoji}>{completionData.icon || '📝'}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.senderName, { color: config.iconColor }]}>
              {message.senderName || 'Liwa System'}
            </Text>
            <Text style={styles.timestamp}>
              {timestamp.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>
        
        <View style={styles.messageContent}>
          <Text style={[styles.messageText, { color: config.textColor }]}>
            {message.text}
          </Text>
        </View>

        {/* Additional completion data */}
        {completionData.tradeId && (
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              Trade ID: {completionData.tradeId}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  messageCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    maxWidth: '90%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  emoji: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  senderName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  messageContent: {
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  metadata: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 8,
    marginTop: 8,
  },
  metadataText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SystemMessage;