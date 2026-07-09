import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TradeCompletionLine({ 
  completionDate, 
  tradeValue, 
  itemTitle,
  onViewArchive,
  onRateUser,
  showRatingPrompt = false,
  style 
}) {
  
  const formatDate = (date) => {
    if (!date) return 'Recently';
    
    const tradeDate = date.toDate ? date.toDate() : new Date(date);
    return tradeDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={[styles.container, style]}>
      {/* Completion Line */}
      <View style={styles.completionLine}>
        <View style={styles.lineLeft} />
        <View style={styles.completionBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
        </View>
        <View style={styles.lineRight} />
      </View>

      {/* Completion Info */}
      <View style={styles.completionInfo}>
        <View style={styles.completionHeader}>
          <Ionicons name="trophy" size={24} color="#FFD700" />
          <Text style={styles.completionTitle}>Trade Completed! 🎉</Text>
        </View>
        
        <Text style={styles.completionSubtitle}>
          {itemTitle} • {tradeValue ? `$${tradeValue}` : 'Trade'} • {formatDate(completionDate)}
        </Text>
        
        <Text style={styles.completionDescription}>
          Congratulations! Your trade has been successfully completed. 
          The items have been archived for your records.
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {showRatingPrompt && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.ratingButton]}
            onPress={onRateUser}
          >
            <Ionicons name="star" size={16} color="white" />
            <Text style={styles.ratingButtonText}>Rate This Trade</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.archiveButton]}
          onPress={onViewArchive}
        >
          <Ionicons name="archive" size={16} color="#666" />
          <Text style={styles.archiveButtonText}>View Archived Items</Text>
        </TouchableOpacity>
      </View>

      {/* Archive Notice */}
      <View style={styles.archiveNotice}>
        <Ionicons name="information-circle" size={16} color="#666" />
        <Text style={styles.archiveNoticeText}>
          Traded items have been moved to your archive for future reference
        </Text>
      </View>

      {/* Separator for messages below */}
      <View style={styles.messageSeparator}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>Messages after trade completion</Text>
        <View style={styles.separatorLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    marginVertical: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E8F5E8',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  lineLeft: {
    flex: 1,
    height: 2,
    backgroundColor: '#4CAF50',
  },
  completionBadge: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginHorizontal: 8,
  },
  lineRight: {
    flex: 1,
    height: 2,
    backgroundColor: '#4CAF50',
  },
  completionInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  completionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  completionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  completionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  ratingButton: {
    backgroundColor: '#FF6B6B',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  ratingButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  archiveButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  archiveButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  archiveNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  archiveNoticeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
  messageSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDD',
  },
  separatorText: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
  },
});