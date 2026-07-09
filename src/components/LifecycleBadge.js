import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemLifecycleService } from '../services/ItemLifecycleService';

export function LifecycleBadge({ 
  item, 
  size = 'normal', 
  showProgress = false, 
  showDescription = false,
  style = {} 
}) {
  const lifecycle = ItemLifecycleService.getItemLifecycleStage(item);
  const progress = showProgress ? ItemLifecycleService.getLifecycleProgress(lifecycle.stage) : 0;
  
  const sizeStyles = {
    small: {
      container: styles.containerSmall,
      text: styles.textSmall,
      icon: 12
    },
    normal: {
      container: styles.containerNormal,
      text: styles.textNormal,
      icon: 14
    },
    large: {
      container: styles.containerLarge,
      text: styles.textLarge,
      icon: 16
    }
  };
  
  const currentSize = sizeStyles[size] || sizeStyles.normal;
  
  return (
    <View style={[style]}>
      <View 
        style={[
          currentSize.container,
          {
            backgroundColor: lifecycle.backgroundColor,
            borderColor: lifecycle.color,
          }
        ]}
      >
        <Ionicons 
          name={lifecycle.icon} 
          size={currentSize.icon} 
          color={lifecycle.color} 
        />
        <Text 
          style={[
            currentSize.text,
            { color: lifecycle.color }
          ]}
        >
          {size === 'small' ? lifecycle.shortLabel : lifecycle.label}
        </Text>
      </View>
      
      {showProgress && (
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
      )}
      
      {showDescription && (
        <Text style={styles.description}>
          {lifecycle.description}
        </Text>
      )}
    </View>
  );
}

export function LifecycleTimeline({ item, style = {} }) {
  const timeline = ItemLifecycleService.getTimelineDescription(item);
  const lifecycle = ItemLifecycleService.getItemLifecycleStage(item);
  
  return (
    <View style={[styles.timelineContainer, style]}>
      <Ionicons name="time-outline" size={12} color="#666" />
      <Text style={styles.timelineText}>{timeline}</Text>
    </View>
  );
}

export function LifecycleActionHint({ item, userId, style = {} }) {
  const lifecycle = ItemLifecycleService.getItemLifecycleStage(item);
  const isOwner = item.userId === userId;
  
  if (isOwner) {
    return (
      <View style={[styles.actionHintContainer, style]}>
        <Text style={styles.actionHintText}>
          {lifecycle.stage === 'available' ? '📢 Promote your item' :
           lifecycle.stage === 'getting_interest' ? '👀 People are looking!' :
           lifecycle.stage === 'in_negotiation' ? '💬 Respond to messages' :
           lifecycle.stage === 'trade_active' ? '🤝 Complete your trade' :
           '✅ Transaction complete'}
        </Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.actionHintContainer, style]}>
      <Text style={styles.actionHintText}>
        {lifecycle.userAction}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  containerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  containerNormal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  containerLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  textSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
  textNormal: {
    fontSize: 12,
    fontWeight: '600',
  },
  textLarge: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  progressTrack: {
    flex: 1,
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
    fontWeight: '500',
  },
  description: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timelineText: {
    fontSize: 11,
    color: '#666',
  },
  actionHintContainer: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  actionHintText: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});