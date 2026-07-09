import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OfferComparisonService } from '../services/OfferComparisonService';

const OfferComparisonAlert = ({ 
  visible, 
  onClose, 
  conversationId, 
  formalOffer, 
  onProceed,
  onReject 
}) => {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && conversationId && formalOffer) {
      compareOfferWithNegotiations();
    }
  }, [visible, conversationId, formalOffer]);

  const compareOfferWithNegotiations = async () => {
    try {
      setLoading(true);
      const result = await OfferComparisonService.compareOfferWithNegotiations(
        conversationId,
        formalOffer
      );
      setComparison(result);
    } catch (error) {
      console.error('Error comparing offer:', error);
      setComparison({
        hasNegotiations: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    onProceed();
    onClose();
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  const renderDifference = (difference) => {
    const getSeverityColor = (severity) => {
      switch (severity) {
        case 'HIGH': return '#F44336';
        case 'MEDIUM': return '#FF9800';
        case 'LOW': return '#FFC107';
        default: return '#666';
      }
    };

    const getSeverityIcon = (severity) => {
      switch (severity) {
        case 'HIGH': return 'warning';
        case 'MEDIUM': return 'alert-circle';
        case 'LOW': return 'information-circle';
        default: return 'help-circle';
      }
    };

    return (
      <View key={difference.field} style={styles.differenceContainer}>
        <View style={styles.differenceHeader}>
          <Ionicons 
            name={getSeverityIcon(difference.severity)} 
            size={20} 
            color={getSeverityColor(difference.severity)} 
          />
          <Text style={[styles.differenceTitle, { color: getSeverityColor(difference.severity) }]}>
            {difference.field === 'cashAmount' ? 'Cash Amount Changed' :
             difference.field === 'tradeType' ? 'Trade Type Changed' :
             difference.field === 'cashInclusion' ? 'Cash Terms Changed' :
             'Terms Changed'}
          </Text>
        </View>
        
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonLabel}>Chat Negotiation</Text>
            <Text style={styles.comparisonValue}>
              {difference.field === 'cashAmount' ? `$${difference.chatValue}` : difference.chatValue}
            </Text>
          </View>
          
          <Ionicons name="arrow-forward" size={20} color="#666" style={styles.arrowIcon} />
          
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonLabel}>Formal Offer</Text>
            <Text style={styles.comparisonValue}>
              {difference.field === 'cashAmount' ? `$${difference.offerValue}` : difference.offerValue}
            </Text>
          </View>
        </View>
        
        {difference.percentDifference && (
          <Text style={styles.percentageChange}>
            {difference.percentDifference.toFixed(1)}% difference
          </Text>
        )}
      </View>
    );
  };

  const renderComparisonContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Ionicons name="sync" size={40} color="#FF6B6B" />
          <Text style={styles.loadingText}>Comparing offer with negotiations...</Text>
        </View>
      );
    }

    if (!comparison?.hasNegotiations) {
      return (
        <View style={styles.noNegotiationsContainer}>
          <Ionicons name="chatbubbles-outline" size={40} color="#666" />
          <Text style={styles.noNegotiationsTitle}>No Previous Negotiations</Text>
          <Text style={styles.noNegotiationsText}>
            No pricing discussions found in your chat history. Please review the offer carefully.
          </Text>
        </View>
      );
    }

    if (comparison.comparison?.result === OfferComparisonService.COMPARISON_RESULTS.MATCH) {
      return (
        <View style={styles.matchContainer}>
          <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
          <Text style={styles.matchTitle}>Offer Matches Negotiations</Text>
          <Text style={styles.matchText}>
            This formal offer matches your previous chat negotiations. Safe to proceed.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.differencesContainer}>
        <View style={styles.warningHeader}>
          <Ionicons 
            name={comparison.comparison?.riskLevel === 'HIGH' ? 'warning' : 'alert-circle'} 
            size={30} 
            color={comparison.comparison?.riskLevel === 'HIGH' ? '#F44336' : '#FF9800'} 
          />
          <Text style={styles.warningTitle}>
            {comparison.comparison?.riskLevel === 'HIGH' ? 'Significant Changes Detected' : 'Differences Found'}
          </Text>
        </View>
        
        <Text style={styles.warningMessage}>
          {comparison.warningMessage || comparison.recommendation}
        </Text>
        
        <View style={styles.matchPercentageContainer}>
          <Text style={styles.matchPercentageLabel}>Match Percentage:</Text>
          <Text style={[
            styles.matchPercentageValue,
            { color: comparison.comparison?.matchPercentage > 80 ? '#4CAF50' : 
                     comparison.comparison?.matchPercentage > 60 ? '#FF9800' : '#F44336' }
          ]}>
            {comparison.comparison?.matchPercentage || 0}%
          </Text>
        </View>
        
        <ScrollView style={styles.differencesScroll}>
          {comparison.differences?.map(renderDifference)}
        </ScrollView>
      </View>
    );
  };

  const getActionButtons = () => {
    if (loading || !comparison?.hasNegotiations) {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.proceedButton} onPress={handleProceed}>
            <Text style={styles.proceedButtonText}>Review Offer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (comparison.comparison?.result === OfferComparisonService.COMPARISON_RESULTS.MATCH) {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.proceedButton} onPress={handleProceed}>
            <Text style={styles.proceedButtonText}>Accept Offer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
          <Text style={styles.rejectButtonText}>Decline</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.proceedButton} onPress={handleProceed}>
          <Text style={styles.proceedButtonText}>
            {comparison.comparison?.riskLevel === 'HIGH' ? 'Accept Anyway' : 'Accept Offer'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offer Comparison</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          {renderComparisonContent()}
        </ScrollView>

        {/* Action Buttons */}
        {getActionButtons()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  noNegotiationsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noNegotiationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  noNegotiationsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  matchContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: 'white',
    borderRadius: 10,
    marginVertical: 20,
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 15,
  },
  matchText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  differencesContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginVertical: 20,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  warningMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  matchPercentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 20,
  },
  matchPercentageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  matchPercentageValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  differencesScroll: {
    maxHeight: 300,
  },
  differenceContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  differenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  differenceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comparisonColumn: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  comparisonValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  arrowIcon: {
    marginHorizontal: 15,
  },
  percentageChange: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 10,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#F44336',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
  },
  proceedButton: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  proceedButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OfferComparisonAlert;