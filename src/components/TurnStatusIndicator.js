import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TurnStatusIndicator = ({ 
  currentUserId,
  offer,
  onNudge,
  canNudge = false,
  lastActivity
}) => {
  const isMyTurn = offer.targetUserId === currentUserId;
  const isWaitingForMe = offer.senderId === currentUserId;
  
  // Calculate time since last activity
  const getTimeSinceActivity = () => {
    if (!lastActivity) return null;
    const now = new Date();
    const activityTime = lastActivity.toDate ? lastActivity.toDate() : new Date(lastActivity);
    const diffHours = Math.floor((now - activityTime) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const timeSince = getTimeSinceActivity();
  const isStale = lastActivity && (new Date() - (lastActivity.toDate ? lastActivity.toDate() : new Date(lastActivity))) > (12 * 60 * 60 * 1000); // 12 hours

  if (isMyTurn) {
    return (
      <View style={[styles.container, styles.myTurn]}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="hand-right" size={18} color="#4CAF50" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Your Turn</Text>
            <Text style={styles.subtitle}>
              {offer.messageType === 'counter_offer' 
                ? 'Respond to their counter-offer'
                : 'Accept, decline, or make a counter-offer'
              }
            </Text>
          </View>
          <View style={styles.pulseIndicator}>
            <View style={styles.pulse} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.waiting, isStale && styles.stale]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={isStale ? "time-outline" : "hourglass-outline"} 
            size={18} 
            color={isStale ? "#FF9800" : "#666"} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isStale ? 'Waiting a while...' : 'Waiting for Partner'}
          </Text>
          <Text style={styles.subtitle}>
            They need to respond to your {offer.messageType === 'counter_offer' ? 'counter-offer' : 'offer'}
            {timeSince && ` • ${timeSince}`}
          </Text>
        </View>
        {canNudge && isStale && (
          <TouchableOpacity style={styles.nudgeButton} onPress={onNudge}>
            <Ionicons name="notifications-outline" size={16} color="#FF9800" />
            <Text style={styles.nudgeText}>Nudge</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  myTurn: {
    backgroundColor: '#E8F5E8',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  waiting: {
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 4,
    borderLeftColor: '#E0E0E0',
  },
  stale: {
    backgroundColor: '#FFF8E1',
    borderLeftColor: '#FF9800',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  pulseIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    position: 'relative',
  },
  pulse: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    opacity: 0.6,
    // Animation would be added with Animated API
  },
  nudgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  nudgeText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default TurnStatusIndicator;