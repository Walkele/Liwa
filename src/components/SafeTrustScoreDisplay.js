import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeComponentRenderer } from '../utils/SafeComponentRenderer';

export default function SafeTrustScoreDisplay({ user, trustScore, style }) {
  // Safely get user data
  const safeUser = SafeComponentRenderer.getSafeUserData(user);
  const safeTrustScore = trustScore || safeUser.trustScore || 0;
  
  // Don't render if no valid data
  if (!SafeComponentRenderer.isValidUser(safeUser) && !trustScore) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={16} color="#CCC" />
          <Text style={styles.loadingText}>Loading trust score...</Text>
        </View>
      </View>
    );
  }
  
  const getTrustLevel = (score) => {
    if (score >= 800) return { level: 'Excellent', color: '#4CAF50' };
    if (score >= 600) return { level: 'Good', color: '#8BC34A' };
    if (score >= 400) return { level: 'Fair', color: '#FF9800' };
    if (score >= 200) return { level: 'Poor', color: '#FF5722' };
    return { level: 'New', color: '#9E9E9E' };
  };
  
  const trustLevel = getTrustLevel(safeTrustScore);
  
  return (
    <View style={[styles.container, style]}>
      <View style={styles.scoreContainer}>
        <View style={[styles.scoreBadge, { backgroundColor: trustLevel.color }]}>
          <Text style={styles.scoreText}>{safeTrustScore}</Text>
        </View>
        <View style={styles.levelContainer}>
          <Text style={styles.levelText}>{trustLevel.level}</Text>
          <Text style={styles.labelText}>Trust Score</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center'
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8
  },
  loadingText: {
    fontSize: 12,
    color: '#CCC',
    marginLeft: 4
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  scoreText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold'
  },
  levelContainer: {
    alignItems: 'flex-start'
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  labelText: {
    fontSize: 11,
    color: '#666'
  }
});