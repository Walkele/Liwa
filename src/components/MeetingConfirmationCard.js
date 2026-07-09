import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MeetingConfirmationService from '../services/MeetingConfirmationService';

export default function MeetingConfirmationCard({ 
  meetingSuggestion, 
  currentUserId, 
  conversationId,
  onMeetingConfirmed,
  onMeetingRejected,
  allMeetingSuggestions = [] // Pass all suggestions to detect conflicts
}) {
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState(null);
  
  const isMysuggestion = meetingSuggestion.suggestedBy === currentUserId;
  const isPending = meetingSuggestion.status === 'suggested';
  const isConfirmed = meetingSuggestion.status === 'confirmed';
  const isRejected = meetingSuggestion.status === 'rejected';

  // Check for conflicts on mount
  React.useEffect(() => {
    checkConflicts();
  }, [allMeetingSuggestions]);

  const checkConflicts = async () => {
    try {
      const result = await MeetingConfirmationService.checkMeetingConflicts(conversationId);
      setConflicts(result);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  };

  const handleConfirmMeeting = async () => {
    // Check for conflicts before confirming
    if (conflicts?.hasConflict) {
      Alert.alert(
        'Meeting Conflict Detected',
        'You and your partner have suggested different meeting details. Please discuss and agree on one option before confirming.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Confirm Meeting',
      `You are agreeing to meet at:\n\n📍 ${meetingSuggestion.location}\n⏰ ${meetingSuggestion.time}\n\n⚠️ Grace period: 15 minutes\n\nBoth parties must arrive within 15 minutes of the agreed time. Do you confirm?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              setLoading(true);
              await MeetingConfirmationService.confirmMeeting(
                meetingSuggestion.id, 
                currentUserId, 
                conversationId
              );
              onMeetingConfirmed?.(meetingSuggestion);
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to confirm meeting. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectMeeting = () => {
    Alert.alert(
      'Reject Meeting Suggestion',
      'Why would you like to suggest a different meeting?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Too far', 
          onPress: () => rejectWithReason('Location is too far for me') 
        },
        { 
          text: 'Time conflict', 
          onPress: () => rejectWithReason('I have a time conflict') 
        },
        { 
          text: 'Safety concern', 
          onPress: () => rejectWithReason('I prefer a more public location') 
        },
        { 
          text: 'Other reason', 
          onPress: () => rejectWithCustomReason() 
        }
      ]
    );
  };

  const rejectWithReason = async (reason) => {
    try {
      setLoading(true);
      await MeetingConfirmationService.rejectMeeting(
        meetingSuggestion.id,
        currentUserId,
        conversationId,
        reason
      );
      onMeetingRejected?.(meetingSuggestion, reason);
    } catch (error) {
      Alert.alert('Error', 'Failed to reject meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const rejectWithCustomReason = () => {
    Alert.prompt(
      'Rejection Reason',
      'Please explain why you\'d like to suggest a different meeting:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Submit', 
          onPress: (reason) => {
            if (reason && reason.trim()) {
              rejectWithReason(reason.trim());
            }
          }
        }
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const validateLocation = () => {
    const validation = MeetingConfirmationService.validateMeetingLocation(meetingSuggestion.location);
    return validation;
  };

  const locationValidation = validateLocation();

  return (
    <View style={[
      styles.container,
      isConfirmed && styles.confirmedContainer,
      isRejected && styles.rejectedContainer
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons 
            name={isConfirmed ? "checkmark-circle" : isRejected ? "close-circle" : "location"} 
            size={20} 
            color={isConfirmed ? "#4CAF50" : isRejected ? "#F44336" : "#FF6B6B"} 
          />
          <Text style={styles.headerTitle}>
            {isConfirmed ? 'Meeting Confirmed' : 
             isRejected ? 'Meeting Rejected' : 
             isMysuggestion ? 'Your Meeting Suggestion' : 'Meeting Suggestion'}
          </Text>
        </View>
        
        {isPending && !isMysuggestion && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Action Required</Text>
          </View>
        )}
      </View>

      {/* Meeting Details */}
      <View style={styles.meetingDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{meetingSuggestion.location}</Text>
          {meetingSuggestion.isPublicPlace && (
            <View style={styles.safeBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#4CAF50" />
              <Text style={styles.safeText}>Safe</Text>
            </View>
          )}
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{meetingSuggestion.time}</Text>
        </View>
        
        {meetingSuggestion.additionalNotes && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{meetingSuggestion.additionalNotes}</Text>
          </View>
        )}
      </View>

      {/* Safety Warning */}
      {!meetingSuggestion.isPublicPlace && locationValidation.isUnsafe && (
        <View style={styles.safetyWarning}>
          <Ionicons name="warning" size={16} color="#FF9800" />
          <Text style={styles.safetyWarningText}>
            ⚠️ Consider meeting at a public place for safety
          </Text>
        </View>
      )}

      {/* Conflict Warning */}
      {conflicts?.hasConflict && isPending && (
        <View style={styles.conflictWarning}>
          <Ionicons name="alert-circle" size={16} color="#F44336" />
          <Text style={styles.conflictWarningText}>
            ⚠️ Conflicting meeting suggestions detected! You and your partner have suggested different times or locations. Please discuss and agree on one option.
          </Text>
        </View>
      )}

      {/* Grace Period Info */}
      {isConfirmed && meetingSuggestion.gracePeriodMinutes && (
        <View style={styles.gracePeriodInfo}>
          <Ionicons name="time" size={16} color="#2196F3" />
          <Text style={styles.gracePeriodText}>
            Grace period: {meetingSuggestion.gracePeriodMinutes} minutes. Please arrive on time or notify your partner if you'll be late.
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {isPending && !isMysuggestion && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleRejectMeeting}
            disabled={loading}
          >
            <Ionicons name="close" size={16} color="#F44336" />
            <Text style={styles.rejectButtonText}>Suggest Different</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={handleConfirmMeeting}
            disabled={loading}
          >
            <Ionicons name="checkmark" size={16} color="white" />
            <Text style={styles.confirmButtonText}>
              {loading ? 'Confirming...' : 'Confirm Meeting'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status Messages */}
      {isConfirmed && (
        <View style={styles.statusMessage}>
          <Text style={styles.confirmedText}>
            ✅ Both parties have agreed to meet at this exact location and time
            {meetingSuggestion.gracePeriodMinutes && `\n⏰ Grace period: ${meetingSuggestion.gracePeriodMinutes} minutes`}
          </Text>
        </View>
      )}

      {isRejected && (
        <View style={styles.statusMessage}>
          <Text style={styles.rejectedText}>
            ❌ This meeting suggestion was declined
            {meetingSuggestion.rejectionReason && `: ${meetingSuggestion.rejectionReason}`}
          </Text>
        </View>
      )}

      {isPending && isMysuggestion && (
        <View style={styles.statusMessage}>
          <Text style={styles.pendingText}>
            ⏳ Waiting for the other party to confirm this meeting
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  confirmedContainer: {
    borderColor: '#4CAF50',
    backgroundColor: '#F8FFF8',
  },
  rejectedContainer: {
    borderColor: '#F44336',
    backgroundColor: '#FFF8F8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  meetingDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  safeText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 2,
  },
  safetyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  safetyWarningText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 6,
    flex: 1,
  },
  conflictWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  conflictWarningText: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
  },
  gracePeriodInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  gracePeriodText: {
    fontSize: 12,
    color: '#2196F3',
    marginLeft: 6,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  rejectButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  rejectButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusMessage: {
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
  },
  confirmedText: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
  },
  rejectedText: {
    fontSize: 12,
    color: '#F44336',
    textAlign: 'center',
  },
  pendingText: {
    fontSize: 12,
    color: '#FF9800',
    textAlign: 'center',
  },
});