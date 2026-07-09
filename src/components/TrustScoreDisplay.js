import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrustScoreService } from '../services/TrustScoreService';

export const TrustScoreDisplay = ({ 
  score, 
  level, 
  size = 'medium', 
  showDetails = false, 
  onPress = null 
}) => {
  const trustLevel = level || TrustScoreService.getTrustLevel(score);
  const displayInfo = TrustScoreService.getTrustScoreDisplay(score, trustLevel);
  
  const sizeStyles = {
    small: {
      container: { width: 60, height: 60 },
      score: { fontSize: 14, fontWeight: '600' },
      level: { fontSize: 10 },
      icon: 16
    },
    medium: {
      container: { width: 80, height: 80 },
      score: { fontSize: 18, fontWeight: 'bold' },
      level: { fontSize: 12 },
      icon: 20
    },
    large: {
      container: { width: 120, height: 120 },
      score: { fontSize: 24, fontWeight: 'bold' },
      level: { fontSize: 14 },
      icon: 28
    }
  };
  
  const currentSize = sizeStyles[size];
  
  const Container = onPress ? TouchableOpacity : View;
  
  return (
    <Container 
      style={[
        styles.container, 
        currentSize.container,
        { borderColor: trustLevel.color },
        onPress && styles.touchable
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.scoreCircle, { backgroundColor: trustLevel.color }]}>
        <Text style={[styles.scoreText, currentSize.score, { color: 'white' }]}>
          {score}
        </Text>
      </View>
      
      <View style={styles.levelContainer}>
        <Text style={[styles.levelIcon, { fontSize: currentSize.icon }]}>
          {trustLevel.icon}
        </Text>
        <Text style={[styles.levelText, currentSize.level, { color: trustLevel.color }]}>
          {trustLevel.name}
        </Text>
      </View>
      
      {showDetails && displayInfo.nextLevel && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${displayInfo.progressPercentage}%`,
                  backgroundColor: trustLevel.color 
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {displayInfo.nextLevel.pointsNeeded} points to {displayInfo.nextLevel.name}
          </Text>
        </View>
      )}
    </Container>
  );
};

export const VerificationBadges = ({ verifications = {}, size = 'medium', maxVisible = 3 }) => {
  const badges = TrustScoreService.getVerificationBadges(verifications);
  const visibleBadges = badges.slice(0, maxVisible);
  const remainingCount = badges.length - maxVisible;
  
  const badgeSize = {
    small: 20,
    medium: 24,
    large: 28
  };
  
  if (badges.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.badgesContainer}>
      {visibleBadges.map((badge, index) => (
        <View key={badge.type} style={[styles.badge, { marginLeft: index > 0 ? -8 : 0 }]}>
          <Text style={[styles.badgeIcon, { fontSize: badgeSize[size] }]}>
            {badge.icon}
          </Text>
        </View>
      ))}
      
      {remainingCount > 0 && (
        <View style={[styles.badge, styles.moreBadge, { marginLeft: -8 }]}>
          <Text style={[styles.moreText, { fontSize: badgeSize[size] - 4 }]}>
            +{remainingCount}
          </Text>
        </View>
      )}
    </View>
  );
};

export const TrustSignals = ({ 
  responseTime, 
  completionRate, 
  totalTrades, 
  size = 'medium' 
}) => {
  const getResponseTimeText = (hours) => {
    if (hours < 1) return 'Usually responds within 1 hour';
    if (hours < 24) return `Usually responds within ${Math.round(hours)} hours`;
    return 'Response time varies';
  };
  
  const getResponseTimeColor = (hours) => {
    if (hours < 2) return '#4CAF50'; // Green - Very fast
    if (hours < 6) return '#FF9800'; // Orange - Moderate
    return '#9E9E9E'; // Gray - Slow
  };
  
  const textSize = {
    small: { main: 12, sub: 10 },
    medium: { main: 14, sub: 12 },
    large: { main: 16, sub: 14 }
  };
  
  return (
    <View style={styles.trustSignalsContainer}>
      {/* Response Time */}
      <View style={styles.signalItem}>
        <Ionicons 
          name="time-outline" 
          size={textSize[size].main + 2} 
          color={getResponseTimeColor(responseTime)} 
        />
        <Text style={[styles.signalText, { fontSize: textSize[size].sub }]}>
          {getResponseTimeText(responseTime)}
        </Text>
      </View>
      
      {/* Completion Rate */}
      <View style={styles.signalItem}>
        <Ionicons 
          name="checkmark-circle-outline" 
          size={textSize[size].main + 2} 
          color={completionRate >= 90 ? '#4CAF50' : completionRate >= 70 ? '#FF9800' : '#F44336'} 
        />
        <Text style={[styles.signalText, { fontSize: textSize[size].sub }]}>
          {completionRate}% completion rate ({totalTrades} trades)
        </Text>
      </View>
    </View>
  );
};

export const TrustScoreBreakdown = ({ breakdown, onClose }) => {
  if (!breakdown) return null;
  
  const items = [
    {
      label: 'Completed Swaps',
      value: breakdown.completedSwaps?.count || 0,
      score: breakdown.completedSwaps?.score || 0,
      icon: 'swap-horizontal',
      color: '#4CAF50'
    },
    {
      label: 'Verifications',
      value: breakdown.verifications?.count || 0,
      score: breakdown.verifications?.score || 0,
      icon: 'shield-checkmark',
      color: '#2196F3'
    },
    {
      label: 'Response Time',
      value: `${breakdown.responseTime?.avgHours || 24}h avg`,
      score: breakdown.responseTime?.score || 0,
      icon: 'time',
      color: '#FF9800'
    },
    {
      label: 'User Reviews',
      value: `${breakdown.reviews?.avgRating || 0}/5`,
      score: breakdown.reviews?.score || 0,
      icon: 'star',
      color: '#FFC107'
    },
    {
      label: 'Account Age',
      value: `${breakdown.accountAge?.months || 0} months`,
      score: breakdown.accountAge?.score || 0,
      icon: 'calendar',
      color: '#9C27B0'
    }
  ];
  
  // Add penalties if they exist
  if (breakdown.cancellations?.penalty < 0) {
    items.push({
      label: 'Cancellations',
      value: breakdown.cancellations.count,
      score: breakdown.cancellations.penalty,
      icon: 'close-circle',
      color: '#F44336'
    });
  }
  
  if (breakdown.reports?.penalty < 0) {
    items.push({
      label: 'Reports',
      value: breakdown.reports.count,
      score: breakdown.reports.penalty,
      icon: 'warning',
      color: '#F44336'
    });
  }
  
  return (
    <View style={styles.breakdownContainer}>
      <View style={styles.breakdownHeader}>
        <Text style={styles.breakdownTitle}>Trust Score Breakdown</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      
      {items.map((item, index) => (
        <View key={index} style={styles.breakdownItem}>
          <View style={styles.breakdownItemLeft}>
            <Ionicons name={item.icon} size={20} color={item.color} />
            <Text style={styles.breakdownLabel}>{item.label}</Text>
          </View>
          
          <View style={styles.breakdownItemRight}>
            <Text style={styles.breakdownValue}>{item.value}</Text>
            <Text style={[
              styles.breakdownScore, 
              { color: item.score >= 0 ? '#4CAF50' : '#F44336' }
            ]}>
              {item.score >= 0 ? '+' : ''}{item.score}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 50,
    padding: 8,
    backgroundColor: 'white',
  },
  touchable: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreCircle: {
    width: '70%',
    height: '70%',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  scoreText: {
    color: 'white',
  },
  levelContainer: {
    alignItems: 'center',
  },
  levelIcon: {
    marginBottom: 2,
  },
  levelText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  badgeIcon: {
    textAlign: 'center',
  },
  moreBadge: {
    backgroundColor: '#F5F5F5',
  },
  moreText: {
    color: '#666',
    fontWeight: '600',
  },
  trustSignalsContainer: {
    marginTop: 8,
  },
  signalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  signalText: {
    marginLeft: 8,
    color: '#666',
    flex: 1,
  },
  breakdownContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  breakdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakdownLabel: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
  breakdownItemRight: {
    alignItems: 'flex-end',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  breakdownScore: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TrustScoreDisplay;