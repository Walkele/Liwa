import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MeetingMatchModal = ({
  visible,
  onClose,
  otherUserName,
  onMeetingProposed,
  existingProposal = null
}) => {
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [customTime, setCustomTime] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Predefined time slots (next 3 days)
  const timeSlots = [
    { id: 'today_10am', label: 'Today 10:00 AM', value: 'today_10am' },
    { id: 'today_2pm', label: 'Today 2:00 PM', value: 'today_2pm' },
    { id: 'today_6pm', label: 'Today 6:00 PM', value: 'today_6pm' },
    { id: 'tomorrow_10am', label: 'Tomorrow 10:00 AM', value: 'tomorrow_10am' },
    { id: 'tomorrow_2pm', label: 'Tomorrow 2:00 PM', value: 'tomorrow_2pm' },
    { id: 'tomorrow_6pm', label: 'Tomorrow 6:00 PM', value: 'tomorrow_6pm' },
    { id: 'day3_10am', label: 'Day 3 10:00 AM', value: 'day3_10am' },
    { id: 'day3_2pm', label: 'Day 3 2:00 PM', value: 'day3_2pm' },
    { id: 'day3_6pm', label: 'Day 3 6:00 PM', value: 'day3_6pm' }
  ];

  // Safe meeting locations (popular safe spots)
  const safeLocations = [
    { id: 'coffee_shop', label: '☕ Coffee Shop', icon: '☕', trustRequired: 30 },
    { id: 'shopping_mall', label: '🏬 Shopping Mall', icon: '🏬', trustRequired: 20 },
    { id: 'library', label: '📚 Public Library', icon: '📚', trustRequired: 25 },
    { id: 'community_center', label: '🏛️ Community Center', icon: '🏛️', trustRequired: 15 },
    { id: 'police_station', label: '🚔 Police Station', icon: '🚔', trustRequired: 0 },
    { id: 'bank', label: '🏦 Bank Lobby', icon: '🏦', trustRequired: 10 },
    { id: 'train_station', label: '🚉 Train Station', icon: '🚉', trustRequired: 15 },
    { id: 'fast_food', label: '🍔 Fast Food Restaurant', icon: '🍔', trustRequired: 25 }
  ];

  const toggleTime = (timeId) => {
    if (selectedTimes.includes(timeId)) {
      setSelectedTimes(selectedTimes.filter(id => id !== timeId));
    } else if (selectedTimes.length < 3) {
      setSelectedTimes([...selectedTimes, timeId]);
    } else {
      Alert.alert('Maximum 3', 'You can select up to 3 time slots');
    }
  };

  const toggleLocation = (locationId) => {
    if (selectedLocations.includes(locationId)) {
      setSelectedLocations(selectedLocations.filter(id => id !== locationId));
    } else if (selectedLocations.length < 3) {
      setSelectedLocations([...selectedLocations, locationId]);
    } else {
      Alert.alert('Maximum 3', 'You can select up to 3 locations');
    }
  };

  const handleSubmit = () => {
    if (selectedTimes.length === 0 && !customTime) {
      Alert.alert('Time Required', 'Please select at least 1 time slot or enter a custom time');
      return;
    }

    if (selectedLocations.length === 0 && !customLocation) {
      Alert.alert('Location Required', 'Please select at least 1 location or enter a custom location');
      return;
    }

    const proposal = {
      times: selectedTimes.map(id => timeSlots.find(t => t.id === id)),
      customTime: customTime || null,
      locations: selectedLocations.map(id => safeLocations.find(l => l.id === id)),
      customLocation: customLocation || null,
      notes: notes.trim()
    };

    onMeetingProposed(proposal);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>📍 Propose Meeting</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Propose times and locations for {otherUserName}. They can accept your suggestions or propose alternatives.
          </Text>

          <ScrollView style={styles.scrollContent}>
            {/* Time Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏰ When can you meet?</Text>
              <Text style={styles.sectionSubtitle}>Select up to 3 time slots</Text>
              
              {timeSlots.map(time => (
                <TouchableOpacity
                  key={time.id}
                  style={[
                    styles.option,
                    selectedTimes.includes(time.id) && styles.selectedOption
                  ]}
                  onPress={() => toggleTime(time.id)}
                >
                  <View style={styles.optionIndicator}>
                    {selectedTimes.includes(time.id) && (
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    )}
                  </View>
                  <Text style={styles.optionText}>{time.label}</Text>
                </TouchableOpacity>
              ))}

              <TextInput
                style={styles.customInput}
                placeholder="Or enter custom time (e.g., 'Saturday 3pm')"
                value={customTime}
                onChangeText={setCustomTime}
              />
            </View>

            {/* Location Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📍 Where would you like to meet?</Text>
              <Text style={styles.sectionSubtitle}>Select up to 3 safe locations</Text>
              
              {safeLocations.map(location => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.option,
                    selectedLocations.includes(location.id) && styles.selectedOption
                  ]}
                  onPress={() => toggleLocation(location.id)}
                >
                  <View style={styles.optionIndicator}>
                    {selectedLocations.includes(location.id) && (
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    )}
                  </View>
                  <Text style={styles.optionText}>{location.label}</Text>
                  <Text style={styles.optionSubtext}>
                    Trust Score Required: {location.trustRequired}+
                  </Text>
                </TouchableOpacity>
              ))}

              <TextInput
                style={styles.customInput}
                placeholder="Or enter custom location"
                value={customLocation}
                onChangeText={setCustomLocation}
              />
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Additional Notes (Optional)</Text>
              <TextInput
                style={[styles.customInput, styles.notesInput]}
                placeholder="Any specific requests or preferences?"
                value={notes}
                onChangeText={setNotes}
                multiline
                maxLength={200}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Send Proposal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedOption: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  optionIndicator: {
    width: 24,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginTop: 8,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default MeetingMatchModal;
