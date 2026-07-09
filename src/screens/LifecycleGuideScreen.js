import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LifecycleBadge } from '../components/LifecycleBadge';
import { ItemLifecycleService } from '../services/ItemLifecycleService';

export default function LifecycleGuideScreen({ navigation }) {
  const stages = [
    {
      stage: 'available',
      mockItem: { status: 'available', swipeRightCount: 0, createdAt: new Date() }
    },
    {
      stage: 'getting_interest',
      mockItem: { status: 'available', swipeRightCount: 5, createdAt: new Date(Date.now() - 86400000) }
    },
    {
      stage: 'in_negotiation',
      mockItem: { status: 'pending', lockType: 'soft', matchId: 'mock', createdAt: new Date(Date.now() - 172800000) }
    },
    {
      stage: 'trade_active',
      mockItem: { status: 'locked', lockType: 'hard', tradeId: 'mock', createdAt: new Date(Date.now() - 259200000) }
    },
    {
      stage: 'completed',
      mockItem: { status: 'sold', createdAt: new Date(Date.now() - 604800000) }
    }
  ];

  const renderStageCard = (stageInfo) => {
    const lifecycle = ItemLifecycleService.getItemLifecycleStage(stageInfo.mockItem);
    const progress = ItemLifecycleService.getLifecycleProgress(lifecycle.stage);
    const estimate = ItemLifecycleService.getEstimatedTimeToCompletion(lifecycle.stage);

    return (
      <View key={lifecycle.stage} style={styles.stageCard}>
        <View style={styles.stageHeader}>
          <LifecycleBadge item={stageInfo.mockItem} size="large" />
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${progress}%`,
                    backgroundColor: lifecycle.color 
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        </View>
        
        <Text style={styles.stageDescription}>{lifecycle.description}</Text>
        
        <View style={styles.stageDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Timeline: {estimate}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Your action: {lifecycle.userAction}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons 
              name={lifecycle.canInteract ? "checkmark-circle" : "close-circle"} 
              size={16} 
              color={lifecycle.canInteract ? "#4CAF50" : "#FF5722"} 
            />
            <Text style={styles.detailText}>
              {lifecycle.canInteract ? "Can receive offers" : "No new offers"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons 
          name="arrow-back" 
          size={24} 
          color="white" 
          onPress={() => navigation.goBack()} 
        />
        <Text style={styles.headerTitle}>Item Lifecycle Guide</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Understanding Item Status</Text>
          <Text style={styles.introText}>
            Every item goes through different stages from listing to completion. 
            Here's what each status means and what you can do at each stage.
          </Text>
        </View>

        <View style={styles.stagesContainer}>
          {stages.map(stageInfo => renderStageCard(stageInfo))}
        </View>

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
          
          <View style={styles.tipCard}>
            <Ionicons name="flash" size={20} color="#FF6B6B" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Act Fast on Popular Items</Text>
              <Text style={styles.tipText}>
                Items with "Getting Interest" status are in high demand. 
                Make your offer quickly before they move to negotiation.
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="people" size={20} color="#2196F3" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Join the Queue</Text>
              <Text style={styles.tipText}>
                For items "In Negotiation", you can join the waitlist. 
                You'll be notified if the current deal falls through.
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="time" size={20} color="#FF9800" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Timing Matters</Text>
              <Text style={styles.tipText}>
                Soft locks expire after 24 hours of inactivity. 
                Items return to "Available" if negotiations stall.
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Safe Trading</Text>
              <Text style={styles.tipText}>
                "Trade in Progress" items are protected from new offers 
                until the current transaction completes.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.legendSection}>
          <Text style={styles.legendTitle}>🎨 Color Legend</Text>
          
          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <View style={[styles.colorDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.colorDot, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.legendText}>Popular</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.colorDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>Negotiating</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.colorDot, { backgroundColor: '#9C27B0' }]} />
              <Text style={styles.legendText}>Trading</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.colorDot, { backgroundColor: '#607D8B' }]} />
              <Text style={styles.legendText}>Complete</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.colorDot, { backgroundColor: '#9E9E9E' }]} />
              <Text style={styles.legendText}>Archived</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  introSection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  introText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  stagesContainer: {
    paddingHorizontal: 20,
  },
  stageCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  stageDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  stageDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  tipsSection: {
    padding: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
    gap: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  legendSection: {
    padding: 20,
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '45%',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});