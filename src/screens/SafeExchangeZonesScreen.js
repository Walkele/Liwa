import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Alert,
  Linking,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { QRVerificationService } from '../services/QRVerificationService';
import { TrustScoreService } from '../services/TrustScoreService';
import { useAuth } from '../context/AuthContext';

// Conditional imports for Expo Go compatibility
let MapView, Marker, Circle;
try {
  const MapModule = require('react-native-maps');
  MapView = MapModule.default;
  Marker = MapModule.Marker;
  Circle = MapModule.Circle;
} catch (error) {
  console.warn('Maps dependencies not available in this environment');
}

export default function SafeExchangeZonesScreen({ route, navigation }) {
  const { tradeId, otherUserName, tradeValue } = route.params || {};
  const { user } = useAuth();
  
  const [safeZones, setSafeZones] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [userTrustScore, setUserTrustScore] = useState(0);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showMap, setShowMap] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserTrustScore();
    loadUserLocationAndZones();
  }, []);

  const loadUserTrustScore = async () => {
    try {
      const trustData = await TrustScoreService.calculateTrustScore(user.uid);
      setUserTrustScore(trustData.score);
    } catch (error) {
      console.error('Error loading trust score:', error);
    }
  };

  const loadUserLocationAndZones = async () => {
    try {
      setLoading(true);
      
      // Get user location
      const location = await QRVerificationService.getCurrentLocation();
      setUserLocation(location);
      
      // Find nearby safe zones
      const zones = await QRVerificationService.findNearbyExchangeZones(
        location, 
        10, // 10km radius
        userTrustScore
      );
      setSafeZones(zones);
      
    } catch (error) {
      Alert.alert('Location Error', 'Unable to get your location. Please enable location services.');
      console.error('Location error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserLocationAndZones();
    setRefreshing(false);
  };

  const handleZoneSelect = (zone) => {
    setSelectedZone(zone);
    Alert.alert(
      'Select Meeting Location',
      `Would you like to suggest ${zone.name} as the meeting location?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Suggest Location', 
          onPress: () => suggestMeetingLocation(zone)
        }
      ]
    );
  };

  const suggestMeetingLocation = async (zone) => {
    try {
      // In a real app, this would send the suggestion to the other user
      Alert.alert(
        'Location Suggested',
        `Meeting location suggestion sent to ${otherUserName}!`
      );
      
      // Navigate back to chat or trade screen
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to suggest meeting location');
    }
  };

  const openInMaps = (zone) => {
    const url = `https://maps.google.com/?q=${zone.location.latitude},${zone.location.longitude}`;
    Linking.openURL(url);
  };

  const getZoneIcon = (zoneType) => {
    const iconMap = {
      POLICE_STATION: 'shield',
      SHOPPING_MALL: 'storefront',
      COFFEE_SHOP: 'cafe',
      LIBRARY: 'library',
      COMMUNITY_CENTER: 'business',
      BANK: 'card'
    };
    return iconMap[zoneType] || 'location';
  };

  const getZoneColor = (zone) => {
    if (zone.type === 'POLICE_STATION') return '#1976D2';
    if (zone.isVerified) return '#4CAF50';
    if (userTrustScore >= zone.safetyInfo.trustRequired) return '#FF9800';
    return '#9E9E9E';
  };

  const renderZoneItem = ({ item: zone }) => {
    const canAccess = userTrustScore >= zone.safetyInfo.trustRequired;
    
    return (
      <TouchableOpacity
        style={[
          styles.zoneCard,
          !canAccess && styles.zoneCardDisabled
        ]}
        onPress={() => canAccess && handleZoneSelect(zone)}
        disabled={!canAccess}
      >
        <View style={styles.zoneHeader}>
          <View style={styles.zoneIconContainer}>
            <Text style={styles.zoneEmoji}>{zone.safetyInfo.icon}</Text>
            <Ionicons 
              name={getZoneIcon(zone.type)} 
              size={20} 
              color={getZoneColor(zone)} 
            />
          </View>
          
          <View style={styles.zoneInfo}>
            <Text style={[styles.zoneName, !canAccess && styles.zoneNameDisabled]}>
              {zone.name}
            </Text>
            <Text style={styles.zoneAddress}>{zone.address}</Text>
            <Text style={styles.zoneDistance}>
              {zone.distance.toFixed(1)} km away • {zone.hours}
            </Text>
          </View>
          
          <View style={styles.zoneActions}>
            {zone.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={() => openInMaps(zone)}
            >
              <Ionicons name="navigate" size={16} color="#2196F3" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.zoneDetails}>
          <View style={styles.safetyRating}>
            {[...Array(5)].map((_, i) => (
              <Ionicons
                key={i}
                name={i < zone.safetyInfo.safetyRating ? 'star' : 'star-outline'}
                size={14}
                color="#FFC107"
              />
            ))}
            <Text style={styles.ratingText}>Safety Rating</Text>
          </View>
          
          <Text style={styles.recommendationReason}>
            {zone.recommendationReason}
          </Text>
          
          {zone.features && (
            <View style={styles.features}>
              {zone.features.slice(0, 3).map((feature, index) => (
                <View key={index} style={styles.featureTag}>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        
        {!canAccess && (
          <View style={styles.accessRequirement}>
            <Ionicons name="lock-closed" size={16} color="#F44336" />
            <Text style={styles.accessRequirementText}>
              Requires {zone.safetyInfo.trustRequired}+ trust score
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderMapView = () => {
    if (!userLocation) return null;
    
    if (!MapView) {
      return (
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={80} color="#CCC" />
          <Text style={styles.mapPlaceholderText}>
            Map view not available in this environment
          </Text>
          <Text style={styles.mapPlaceholderSubtext}>
            Use the list view below to see safe zones
          </Text>
        </View>
      );
    }
    
    return (
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* User location circle */}
        {Circle && (
          <Circle
            center={userLocation}
            radius={1000}
            strokeColor="rgba(255, 107, 107, 0.5)"
            fillColor="rgba(255, 107, 107, 0.1)"
          />
        )}
        
        {/* Safe zone markers */}
        {safeZones.map((zone) => (
          <Marker
            key={zone.id}
            coordinate={zone.location}
            title={zone.name}
            description={zone.address}
            pinColor={getZoneColor(zone)}
            onPress={() => handleZoneSelect(zone)}
          >
            <View style={[
              styles.mapMarker,
              { backgroundColor: getZoneColor(zone) }
            ]}>
              <Text style={styles.mapMarkerEmoji}>{zone.safetyInfo.icon}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safe Exchange Zones</Text>
        <TouchableOpacity onPress={() => setShowMap(!showMap)}>
          <Ionicons name={showMap ? 'list' : 'map'} size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Trust Score Info */}
      <View style={styles.trustInfoCard}>
        <View style={styles.trustInfoHeader}>
          <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
          <Text style={styles.trustInfoTitle}>Your Trust Score: {userTrustScore}</Text>
        </View>
        <Text style={styles.trustInfoSubtitle}>
          Higher trust scores unlock more meeting locations
        </Text>
      </View>

      {showMap ? (
        <View style={styles.mapContainer}>
          {renderMapView()}
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>
              {safeZones.length} safe zones found within 10km
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={safeZones}
          renderItem={renderZoneItem}
          keyExtractor={(item) => item.id}
          style={styles.zonesList}
          contentContainerStyle={styles.zonesListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF6B6B']}
              tintColor="#FF6B6B"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>
                No safe zones found in your area
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Try increasing your trust score to unlock more locations
              </Text>
            </View>
          }
        />
      )}

      {/* Bottom Info */}
      <View style={styles.bottomInfo}>
        <View style={styles.legendItem}>
          <Text style={styles.legendEmoji}>🚔</Text>
          <Text style={styles.legendText}>Police stations are always available</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.legendText}>Verified safe locations</Text>
        </View>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  trustInfoCard: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  trustInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trustInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
  },
  trustInfoSubtitle: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 28,
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 8,
  },
  mapOverlayText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  mapMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  mapMarkerEmoji: {
    fontSize: 20,
  },
  zonesList: {
    flex: 1,
  },
  zonesListContent: {
    padding: 16,
  },
  zoneCard: {
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
  zoneCardDisabled: {
    opacity: 0.6,
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  zoneIconContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  zoneEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  zoneNameDisabled: {
    color: '#999',
  },
  zoneAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  zoneDistance: {
    fontSize: 12,
    color: '#999',
  },
  zoneActions: {
    alignItems: 'flex-end',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  verifiedText: {
    fontSize: 10,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '600',
  },
  directionsButton: {
    padding: 8,
  },
  zoneDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  safetyRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  recommendationReason: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureTag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#666',
  },
  accessRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  accessRequirementText: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 4,
  },
  bottomInfo: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    padding: 40,
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});