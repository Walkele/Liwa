import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TradeInfoDisplay = ({ message, currentUserId }) => {
  const isCurrentUser = message.senderId === currentUserId;
  
  if (message.messageType !== 'trade_step_confirmation') {
    return null;
  }

  const handleCallPress = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmailPress = (email) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleLocationPress = (address, coordinates) => {
    if (coordinates) {
      // Open in maps app with coordinates
      const url = `https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}`;
      Linking.openURL(url);
    } else if (address) {
      // Open in maps app with address
      const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
      Linking.openURL(url);
    }
  };

  return (
    <View style={[
      styles.container,
      isCurrentUser ? styles.currentUser : styles.otherUser
    ]}>
      {/* Main message */}
      <Text style={[
        styles.messageText,
        isCurrentUser ? styles.currentUserText : styles.otherUserText
      ]}>
        {message.text}
      </Text>
      
      {/* Contact Info Display */}
      {message.contactInfo && (
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="person" size={16} color="#2196F3" />
            <Text style={styles.infoTitle}>Contact Information</Text>
            {message.contactInfo.preferredContact && (
              <View style={styles.preferredBadge}>
                <Text style={styles.preferredText}>
                  Prefers {message.contactInfo.preferredContact}
                </Text>
              </View>
            )}
          </View>
          
          {/* Phone Number */}
          {message.contactInfo.phoneNumber && (
            <View style={styles.contactMethod}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <TouchableOpacity 
                style={[
                  styles.contactButton,
                  styles.phoneButton,
                  message.contactInfo.preferredContact === 'phone' && styles.preferredContact
                ]}
                onPress={() => handleCallPress(message.contactInfo.phoneNumber)}
              >
                <Text style={[
                  styles.contactText,
                  message.contactInfo.preferredContact === 'phone' && styles.preferredContactText
                ]}>
                  {message.contactInfo.phoneNumber}
                </Text>
                <Ionicons 
                  name="call-outline" 
                  size={14} 
                  color={message.contactInfo.preferredContact === 'phone' ? '#fff' : '#2196F3'} 
                />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Email */}
          {message.contactInfo.email && (
            <View style={styles.contactMethod}>
              <Text style={styles.infoLabel}>Email:</Text>
              <TouchableOpacity 
                style={[
                  styles.contactButton,
                  styles.emailButton,
                  message.contactInfo.preferredContact === 'email' && styles.preferredContact
                ]}
                onPress={() => handleEmailPress(message.contactInfo.email)}
              >
                <Text style={[
                  styles.contactText,
                  message.contactInfo.preferredContact === 'email' && styles.preferredContactText
                ]}>
                  {message.contactInfo.email}
                </Text>
                <Ionicons 
                  name="mail-outline" 
                  size={14} 
                  color={message.contactInfo.preferredContact === 'email' ? '#fff' : '#4CAF50'} 
                />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Additional Notes */}
          {message.contactInfo.additionalNotes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{message.contactInfo.additionalNotes}</Text>
            </View>
          )}
        </View>
      )}
      
      {/* Meeting Info Display */}
      {message.meetingInfo && (
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="location" size={16} color="#FF9800" />
            <Text style={styles.infoTitle}>Meeting Details</Text>
            {message.meetingInfo.isPublicPlace && (
              <View style={styles.safetyBadge}>
                <Ionicons name="shield-checkmark" size={12} color="white" />
                <Text style={styles.safetyText}>Safe</Text>
              </View>
            )}
          </View>
          
          {/* Location */}
          <View style={styles.meetingDetail}>
            <Text style={styles.infoLabel}>Location:</Text>
            <TouchableOpacity 
              style={styles.locationButton}
              onPress={() => handleLocationPress(message.meetingInfo.location, message.meetingInfo.coordinates)}
            >
              <Text style={styles.locationText}>{message.meetingInfo.location}</Text>
              <Ionicons name="map-outline" size={14} color="#FF9800" />
            </TouchableOpacity>
          </View>

          {/* Time */}
          <View style={styles.meetingDetail}>
            <Text style={styles.infoLabel}>Time:</Text>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={14} color="#FF9800" />
              <Text style={styles.timeText}>{message.meetingInfo.time}</Text>
            </View>
          </View>

          {/* Additional Notes */}
          {message.meetingInfo.additionalNotes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{message.meetingInfo.additionalNotes}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  currentUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF6B6B',
  },
  otherUser: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
  },
  messageText: {
    fontSize: 14,
    marginBottom: 8,
  },
  currentUserText: {
    color: 'white',
  },
  otherUserText: {
    color: '#333',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  preferredBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  preferredText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  safetyBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  safetyText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 2,
  },
  meetingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flex: 1,
    marginLeft: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: 'bold',
    marginLeft: 4,
    flex: 1,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 11,
    color: '#888',
    minWidth: 40,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flex: 1,
    marginLeft: 8,
  },
  phoneButton: {
    backgroundColor: '#E3F2FD',
  },
  emailButton: {
    backgroundColor: '#E8F5E8',
  },
  preferredContact: {
    backgroundColor: '#4CAF50',
  },
  contactText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 4,
    flex: 1,
  },
  preferredContactText: {
    color: 'white',
  },
  phoneText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: 'bold',
    marginRight: 4,
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  notesLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flex: 1,
    marginLeft: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: 'bold',
    marginRight: 4,
    flex: 1,
  },
});

export default TradeInfoDisplay;