import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// Conditional imports for Expo Go compatibility
let MapView, Marker, PROVIDER_GOOGLE, Location, DateTimePicker;

try {
  const mapModule = require('react-native-maps');
  MapView = mapModule.default;
  Marker = mapModule.Marker;
  PROVIDER_GOOGLE = mapModule.PROVIDER_GOOGLE;
  Location = require('expo-location');
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
  console.warn('Maps/Location dependencies not available in this environment');
  // Fallback components
  MapView = ({ children, ...props }) => (
    <View style={[{ backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }, props.style]}>
      <Ionicons name="map-outline" size={50} color="#ccc" />
      <Text style={{ color: '#666', marginTop: 10 }}>Map not available in Expo Go</Text>
      {children}
    </View>
  );
  Marker = ({ children, ...props }) => <View {...props}>{children}</View>;
  PROVIDER_GOOGLE = 'google';
  Location = {
    requestForegroundPermissionsAsync: () => Promise.resolve({ status: 'granted' }),
    getCurrentPositionAsync: () => Promise.resolve({
      coords: { latitude: 37.7749, longitude: -122.4194 }
    })
  };
  DateTimePicker = ({ value, onChange, ...props }) => (
    <TouchableOpacity 
      style={{ padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5 }}
      onPress={() => onChange && onChange({}, value)}
    >
      <Text>{value ? value.toDateString() : 'Select Date'}</Text>
    </TouchableOpacity>
  );
}
import { AuthContext } from '../context/AuthContext';
import { LiwaSOPService } from '../services/LiwaSOPService';

const LocationPickerScreen = ({ navigation, route }) => {
  const { user } = useContext(AuthContext);
  const { offerId, conversationId, onLocationSelected } = route.params;

  // State management
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [meetingDate, setMeetingDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow
  const [meetingTime, setMeetingTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [locationNotes, setLocationNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSafeZone, setSelectedSafeZone] = useState(null);

  // Safe Exchange Zones (predefined safe locations)
  const safeExchangeZones = [
    {
      id: 'police_station_1',
      name: 'Police Station - Downtown',
      description: 'Safe exchange zone with 24/7 security',
      coordinate: { latitude: 43.6532, longitude: -79.3832 },
      type: 'police_station',
      icon: 'shield-checkmark'
    },
    {
      id: 'mall_1',
      name: 'Shopping Mall - Main Entrance',
      description: 'Busy public area with security cameras',
      coordinate: { latitude: 43.6562, longitude: -79.3802 },
      type: 'mall',
      icon: 'storefront'
    },
    {
      id: 'library_1',
      name: 'Public Library - Central Branch',
      description: 'Public space with staff and security',
      coordinate: { latitude: 43.6512, longitude: -79.3762 },
      type: 'library',
      icon: 'library'
    },
    {
      id: 'coffee_shop_1',
      name: 'Coffee Shop - Main Street',
      description: 'Busy cafe with good visibility',
      coordinate: { latitude: 43.6542, longitude: -79.3792 },
      type: 'coffee_shop',
      icon: 'cafe'
    }
  ];

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show nearby safe zones.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      // Default to Toronto if location fails
      setUserLocation({
        latitude: 43.6532,
        longitude: -79.3832,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  };

  const handleMapPress = (event) => {
    const coordinate = event.nativeEvent.coordinate;
    setSelectedLocation({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      name: 'Custom Location',
      description: 'User selected location'
    });
    setSelectedSafeZone(null);
  };

  const selectSafeZone = (zone) => {
    setSelectedLocation({
      latitude: zone.coordinate.latitude,
      longitude: zone.coordinate.longitude,
      name: zone.name,
      description: zone.description,
      type: zone.type
    });
    setSelectedSafeZone(zone.id);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setMeetingDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setMeetingTime(selectedTime);
    }
  };

  const confirmMeetingLocation = async () => {
    if (!selectedLocation) {
      Alert.alert('No Location Selected', 'Please select a meeting location on the map or choose a safe zone.');
      return;
    }

    try {
      setLoading(true);

      // Combine date and time
      const meetingDateTime = new Date(
        meetingDate.getFullYear(),
        meetingDate.getMonth(),
        meetingDate.getDate(),
        meetingTime.getHours(),
        meetingTime.getMinutes()
      );

      // Check if meeting is in the future
      if (meetingDateTime <= new Date()) {
        Alert.alert('Invalid Time', 'Please select a future date and time for the meeting.');
        return;
      }

      const meetingData = {
        location: selectedLocation,
        dateTime: meetingDateTime,
        notes: locationNotes,
        safeZoneId: selectedSafeZone,
        scheduledBy: user.uid,
        scheduledAt: new Date()
      };

      // Update the trade with meeting information
      await LiwaSOPService.scheduleMeetingSOP(offerId, meetingData);

      // Call the callback if provided
      if (onLocationSelected) {
        onLocationSelected(meetingData);
      }

      Alert.alert(
        'Meeting Scheduled!',
        `Meeting scheduled for ${meetingDateTime.toLocaleDateString()} at ${meetingDateTime.toLocaleTimeString()} at ${selectedLocation.name}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error) {
      console.error('Error scheduling meeting:', error);
      Alert.alert('Error', 'Failed to schedule meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!userLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="location" size={50} color="#FF6B6B" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Meeting Location</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={userLocation}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {/* User's current location */}
            <Marker
              coordinate={userLocation}
              title="Your Location"
              pinColor="blue"
            />

            {/* Safe Exchange Zones */}
            {safeExchangeZones.map((zone) => (
              <Marker
                key={zone.id}
                coordinate={zone.coordinate}
                title={zone.name}
                description={zone.description}
                pinColor="green"
                onPress={() => selectSafeZone(zone)}
              />
            ))}

            {/* Selected Location */}
            {selectedLocation && (
              <Marker
                coordinate={selectedLocation}
                title={selectedLocation.name}
                description={selectedLocation.description}
                pinColor="red"
              />
            )}
          </MapView>
        </View>

        {/* Safe Exchange Zones List */}
        <View style={styles.safeZonesContainer}>
          <Text style={styles.sectionTitle}>🛡️ Recommended Safe Zones</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {safeExchangeZones.map((zone) => (
              <TouchableOpacity
                key={zone.id}
                style={[
                  styles.safeZoneCard,
                  selectedSafeZone === zone.id && styles.selectedSafeZone
                ]}
                onPress={() => selectSafeZone(zone)}
              >
                <Ionicons name={zone.icon} size={24} color="#FF6B6B" />
                <Text style={styles.safeZoneName}>{zone.name}</Text>
                <Text style={styles.safeZoneDescription}>{zone.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Selected Location Info */}
        {selectedLocation && (
          <View style={styles.selectedLocationContainer}>
            <Text style={styles.sectionTitle}>📍 Selected Location</Text>
            <View style={styles.locationInfo}>
              <Text style={styles.locationName}>{selectedLocation.name}</Text>
              <Text style={styles.locationDescription}>{selectedLocation.description}</Text>
            </View>
          </View>
        )}

        {/* Date and Time Selection */}
        <View style={styles.dateTimeContainer}>
          <Text style={styles.sectionTitle}>📅 Meeting Schedule</Text>
          
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color="#FF6B6B" />
            <Text style={styles.dateTimeText}>{formatDate(meetingDate)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time" size={20} color="#FF6B6B" />
            <Text style={styles.dateTimeText}>{formatTime(meetingTime)}</Text>
          </TouchableOpacity>
        </View>

        {/* Meeting Notes */}
        <View style={styles.notesContainer}>
          <Text style={styles.sectionTitle}>📝 Meeting Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any specific instructions (parking, entrance, etc.)"
            value={locationNotes}
            onChangeText={setLocationNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmButton, !selectedLocation && styles.disabledButton]}
          onPress={confirmMeetingLocation}
          disabled={!selectedLocation || loading}
        >
          <Text style={styles.confirmButtonText}>
            {loading ? 'Scheduling...' : 'Confirm Meeting Location'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date/Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={meetingDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={meetingTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  backButton: {
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
  },
  mapContainer: {
    height: 300,
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  safeZonesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  safeZoneCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    width: 150,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSafeZone: {
    borderColor: '#FF6B6B',
  },
  safeZoneName: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
    color: '#333',
  },
  safeZoneDescription: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    color: '#666',
  },
  selectedLocationContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  locationInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  locationDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  dateTimeContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dateTimeButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  notesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  notesInput: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  confirmButton: {
    backgroundColor: '#FF6B6B',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LocationPickerScreen;