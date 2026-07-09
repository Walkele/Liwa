import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemPortfolioService } from '../services/ItemPortfolioService';
import { ValueAnalysisService } from '../services/ValueAnalysisService';

const PortfolioDashboard = ({ userId, onSelectItem }) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState(null);
  const [competingOffers, setCompetingOffers] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  const loadPortfolioData = async () => {
    try {
      setLoading(true);
      const data = await ItemPortfolioService.getUserPortfolio(userId);
      setPortfolio(data);
      setVisible(true);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompetingOffers = async () => {
    try {
      setLoading(true);
      const data = await ItemPortfolioService.getCompetingOffersAcrossPortfolio(userId);
      setCompetingOffers(data);
    } catch (error) {
      console.error('Error loading competing offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await ItemPortfolioService.getPortfolioRecommendations(userId);
      setRecommendations(data);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const renderOverview = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Portfolio Overview</Text>
      
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Ionicons name="cube-outline" size={24} color="#2196F3" />
          <Text style={styles.metricValue}>{portfolio.totalItems}</Text>
          <Text style={styles.metricLabel}>Total Items</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Ionicons name="cash-outline" size={24} color="#4CAF50" />
          <Text style={styles.metricValue}>{formatCurrency(portfolio.totalValue)}</Text>
          <Text style={styles.metricLabel}>Total Value</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Ionicons name="trending-up-outline" size={24} color="#FF9800" />
          <Text style={styles.metricValue}>{formatCurrency(portfolio.potentialProfit)}</Text>
          <Text style={styles.metricLabel}>Potential Profit</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Ionicons name="people-outline" size={24} color="#9C27B0" />
          <Text style={styles.metricValue}>{portfolio.metrics.activeNegotiations}</Text>
          <Text style={styles.metricLabel}>Active Negotiations</Text>
        </View>
      </View>

      <View style={styles.lockedItemsSection}>
        <Text style={styles.lockedTitle}>Item Status</Text>
        <View style={styles.lockedRow}>
          <View style={styles.lockedItem}>
            <Ionicons name="lock-closed-outline" size={16} color="#FF9800" />
            <Text style={styles.lockedText}>
              {portfolio.metrics.softLockedItems} Soft-Locked
            </Text>
          </View>
          <View style={styles.lockedItem}>
            <Ionicons name="lock-closed" size={16} color="#F44336" />
            <Text style={styles.lockedText}>
              {portfolio.metrics.hardLockedItems} Hard-Locked
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderCompetingOffers = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Competing Offers</Text>
      
      {competingOffers?.competingOffers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color="#CCC" />
          <Text style={styles.emptyText}>No competing offers</Text>
        </View>
      ) : (
        competingOffers?.competingOffers.map((offer, index) => (
          <TouchableOpacity
            key={offer.id}
            style={styles.offerCard}
            onPress={() => onSelectItem(offer.itemId)}
          >
            <View style={styles.offerHeader}>
              <Text style={styles.offerItemTitle}>{offer.itemTitle}</Text>
              <View style={[
                styles.profitabilityBadge,
                offer.profitability > 0 ? styles.profitBadge : styles.lossBadge
              ]}>
                <Text style={styles.profitabilityText}>
                  {offer.profitability > 0 ? '+' : ''}{offer.profitability.toFixed(1)}%
                </Text>
              </View>
            </View>
            
            <View style={styles.offerDetails}>
              <View style={styles.offerDetailRow}>
                <Ionicons name="cash-outline" size={16} color="#4CAF50" />
                <Text style={styles.offerValue}>{formatCurrency(offer.cashAmount)}</Text>
              </View>
              
              <View style={styles.offerDetailRow}>
                <Ionicons name="pricetag-outline" size={16} color="#666" />
                <Text style={styles.offerItemValue}>
                  Item Value: {formatCurrency(offer.itemValue)}
                </Text>
              </View>
              
              <View style={styles.offerDetailRow}>
                <Ionicons name="trending-up-outline" size={16} color="#FF9800" />
                <Text style={styles.offerValueGap}>
                  Gap: {formatCurrency(offer.valueGap)}
                </Text>
              </View>
            </View>
            
            {offer.isCompetingOffer && (
              <View style={styles.competingBadge}>
                <Ionicons name="swap-horizontal" size={14} color="#FF6B6B" />
                <Text style={styles.competingText}>Competing Offer</Text>
              </View>
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderRecommendations = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recommendations</Text>
      
      {recommendations?.recommendations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#4CAF50" />
          <Text style={styles.emptyText}>All good! No recommendations</Text>
        </View>
      ) : (
        recommendations?.recommendations.map((rec, index) => (
          <View
            key={index}
            style={[
              styles.recommendationCard,
              rec.priority === 'high' && styles.highPriorityCard,
              rec.priority === 'medium' && styles.mediumPriorityCard
            ]}
          >
            <View style={styles.recommendationHeader}>
              <Ionicons
                name={rec.priority === 'high' ? 'warning' : 'information-circle'}
                size={20}
                color={rec.priority === 'high' ? '#F44336' : '#FF9800'}
              />
              <Text style={styles.recommendationTitle}>{rec.itemTitle}</Text>
            </View>
            
            <Text style={styles.recommendationMessage}>{rec.message}</Text>
            
            <TouchableOpacity
              style={styles.recommendationAction}
              onPress={() => onSelectItem(rec.itemId)}
            >
              <Text style={styles.recommendationActionText}>
                {rec.action.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  return (
    <>
      <TouchableOpacity
        style={styles.dashboardButton}
        onPress={loadPortfolioData}
        disabled={loading}
      >
        <Ionicons name="grid-outline" size={20} color="#666" />
        <Text style={styles.dashboardButtonText}>
          {loading ? 'Loading...' : 'Portfolio Dashboard'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Portfolio Dashboard</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.tabBar}>
              {['overview', 'offers', 'recommendations'].map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    selectedTab === tab && styles.selectedTab
                  ]}
                  onPress={() => {
                    setSelectedTab(tab);
                    if (tab === 'offers') loadCompetingOffers();
                    if (tab === 'recommendations') loadRecommendations();
                  }}
                >
                  <Text style={[
                    styles.tabText,
                    selectedTab === tab && styles.selectedTabText
                  ]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={styles.modalBody}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FF6B6B" />
                </View>
              ) : (
                <>
                  {selectedTab === 'overview' && portfolio && renderOverview()}
                  {selectedTab === 'offers' && competingOffers && renderCompetingOffers()}
                  {selectedTab === 'recommendations' && recommendations && renderRecommendations()}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dashboardButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  selectedTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedTabText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  lockedItemsSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
  },
  lockedTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6F00',
    marginBottom: 8,
  },
  lockedRow: {
    flexDirection: 'row',
    gap: 16,
  },
  lockedItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedText: {
    fontSize: 13,
    color: '#8D6E63',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  offerCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  profitabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profitBadge: {
    backgroundColor: '#E8F5E9',
  },
  lossBadge: {
    backgroundColor: '#FFEBEE',
  },
  profitabilityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  offerDetails: {
    marginBottom: 8,
  },
  offerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  offerValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8,
  },
  offerItemValue: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  offerValueGap: {
    fontSize: 14,
    color: '#FF9800',
    marginLeft: 8,
  },
  competingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  competingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 4,
  },
  recommendationCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  highPriorityCard: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  mediumPriorityCard: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  recommendationMessage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  recommendationAction: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  recommendationActionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default PortfolioDashboard;
