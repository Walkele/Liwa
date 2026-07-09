import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import LoadingButton from './LoadingButton';
import { useLoadingState } from '../hooks/useLoadingState';
import { useNotification } from '../context/NotificationContext';

const MeetingArrangementModal = ({ 
  visible, 
  onClose, 
  conversationId, 
  otherUserName,
  onMeetingArranged 
}) => {
  const { user } = useAuth();
  
  // Meeting information state
  const [location, setLocation] = useState('');
  const [time, setTime] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isPublicPlace, setIsPublicPlace] = useState(true);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  
  const { loading, withLoading } = useLoadingState();
  const { showError } = useNotification();

  // Predefined safe location suggestions
  const locationSuggestions = [
    'Coffee shop',
    'Shopping mall',
    'Library',
    'Public park',
    'Restaurant',
    'Community center'
  ];

  // Predefined time slot suggestions
  const timeSlots = [
    'Morning (9am-12pm)',
    'Afternoon (12pm-5pm)',
    'Evening (5pm-8pm)',
    'Weekend morning',
    'Weekend afternoon'
  ];

  const handleArrangeMeeting = async () => {
    // Validation
    if (!location.trim()) {
      showError('Location Required', 'Please enter a meeting location.');
      return;
    }

    if (!time.trim() && !selectedTimeSlot) {
      showError('Time Required', 'Please specify when you want to meet.');
      return;
    }

    await withLoading(
      async () => {
        const meetingData = {
          location: location.trim(),
          time: time.trim() || selectedTimeSlot,
          additionalNotes: additionalNotes.trim(),
          isPublicPlace,
          arrangedBy: user.displayName || user.email || 'User',
          arrangedAt: new Date().toISOString(),
          conversationId
        };

        // Call the callback to handle the meeting arrangement
        if (onMeetingArranged) {
          onMeetingArranged(meetingData);
        }
      },
      {
        successMessage: 'Meeting arranged successfully!',
        errorMessage: 'Failed to arrange meeting. Please try again.',
        showSuccessNotification: true
      }
    );
  };

  const selectLocationSuggestion = (suggestion) => {
    setLocation(suggestion);
  };

  const selectTimeSlot = (slot) => {
    setSelectedTimeSlot(slot);
    setTime(''); // Clear custom time if time slot is selected
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
          <Text style={styles.headerTitle}>Arrange Meeting</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Introduction */}
          <View style={styles.introContainer}>
            <Ionicons name="location" size={40} color="#FF9800" />
            <Text style={styles.introTitle}>Safe Meeting Coordination</Text>
            <Text style={styles.introText}>
              Set up a safe meeting location and time with {otherUserName} to complete your trade.
            </Text>
          </View>

          {/* Meeting Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Meeting Location</Text>
            
            <TextInput
              style={styles.locationInput}
              placeholder="Enter meeting address or location name"
              value={location}
              onChangeText={setLocation}
              multiline
              numberOfLines={2}
            />

            {/* Location Suggestions */}
            <Text style={styles.suggestionsTitle}>Safe Location Suggestions:</Text>
            <View style={styles.suggestionsContainer}>
              {locationSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestionButton,
                    location === suggestion && styles.selectedSuggestion
                  ]}
                  onPress={() => selectLocationSuggestion(suggestion)}
                >
                  <Text style={[
                    styles.suggestionText,
                    location === suggestion && styles.selectedSuggestionText
                  ]}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Public Place Toggle */}
            <View style={styles.publicPlaceContainer}>
              <View style={styles.publicPlaceLabel}>
                <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                <Text style={styles.publicPlaceText}>Public, safe location</Text>
              </View>
              <Switch
                value={isPublicPlace}
                onValueChange={setIsPublicPlace}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={isPublicPlace ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Meeting Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ Meeting Time</Text>
            
            {/* Time Slot Selection */}
            <Text style={styles.suggestionsTitle}>Quick Time Slots:</Text>
            <View style={styles.timeSlotsContainer}>
              {timeSlots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.timeSlotButton,
                    selectedTimeSlot === slot && styles.selectedTimeSlot
                  ]}
                  onPress={() => selectTimeSlot(slot)}
                >
                  <Text style={[
                    styles.timeSlotText,
                    selectedTimeSlot === slot && styles.selectedTimeSlotText
                  ]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Time Input */}
            <Text style={styles.orText}>Or specify exact time:</Text>
            <TextInput
              style={styles.timeInput}
              placeholder="e.g., Tomorrow 3pm, Saturday morning, etc."
              value={time}
              onChangeText={(text) => {
                setTime(text);
                if (text.trim()) setSelectedTimeSlot(''); // Clear time slot if custom time is entered
              }}
            />
          </View>

          {/* Additional Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Additional Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Any special instructions, landmarks, parking info, etc."
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Safety Tips */}
          <View style={styles.safetyTipsContainer}>
            <Text style={styles.safetyTipsTitle}>🛡️ Safety Tips</Text>
            <Text style={styles.safetyTip}>• Always meet in public, well-lit locations</Text>
            <Text style={styles.safetyTip}>• Bring a friend or let someone know where you're going</Text>
            <Text style={styles.safetyTip}>• Meet during daylight hours when possible</Text>
            <Text style={styles.safetyTip}>• Trust your instincts - cancel if something feels wrong</Text>
            <Text style={styles.safetyTip}>• Inspect items carefully before completing the trade</Text>
          </View>
        </ScrollView>

        {/* Arrange Button */}
        <View style={styles.footer}>
          <LoadingButton
            title="Arrange Meeting"
            onPress={handleArrangeMeeting}
            loading={loading}
            disabled={!location.trim() || (!time.trim() && !selectedTimeSlot)}
            variant="primary"
            icon="calendar"
            style={styles.arrangeButton}
            textStyle={styles.arrangeButtonText}
          />
        </View>
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
  introContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    borderRadius: 10,
    marginVertical: 20,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  introText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
    minHeight: 50,
    marginBottom: 15,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  suggestionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF9800',
    backgroundColor: 'white',
  },
  selectedSuggestion: {
    backgroundColor: '#FF9800',
  },
  suggestionText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  selectedSuggestionText: {
    color: 'white',
  },
  publicPlaceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  publicPlaceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  publicPlaceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  timeSlotsContainer: {
    gap: 8,
    marginBottom: 15,
  },
  timeSlotButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
    backgroundColor: 'white',
  },
  selectedTimeSlot: {
    backgroundColor: '#2196F3',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedTimeSlotText: {
    color: 'white',
  },
  orText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
    fontStyle: 'italic',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  safetyTipsContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  safetyTipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 10,
  },
  safetyTip: {
    fontSize: 14,
    color: '#BF360C',
    marginBottom: 5,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  arrangeButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  arrangeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default MeetingArrangementModal;