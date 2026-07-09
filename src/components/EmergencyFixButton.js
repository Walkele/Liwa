import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { DataConsistencyFixService } from '../services/DataConsistencyFixService';

export default function EmergencyFixButton({ style }) {
  const [loading, setLoading] = useState(false);
  
  // Safe context usage using useAuth hook
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext?.user;
  } catch (error) {
    console.error('Error accessing AuthContext:', error);
  }

  const handleEmergencyFix = async () => {
    if (!user || !user.uid) {
      Alert.alert('Error', 'User information not available. Please try logging out and back in.');
      return;
    }

    try {
      setLoading(true);
      
      Alert.alert(
        '🚨 Emergency Fix',
        'This will create your missing user document and fix data consistency issues. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Fix Now',
            onPress: async () => {
              try {
                console.log('🔧 Running emergency fix for user:', user.uid);
                
                const result = await DataConsistencyFixService.quickFixCurrentUser(
                  user.uid,
                  user.email || `user${user.uid.substring(0, 8)}@example.com`,
                  user.displayName || `User ${user.uid.substring(0, 8)}`
                );
                
                if (result.success) {
                  Alert.alert(
                    '✅ Fix Complete!',
                    'Your user document has been created and data consistency issues have been resolved. Please refresh the app or navigate to another screen to see the changes.',
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          // Force a small delay to let Firebase sync
                          setTimeout(() => {
                            console.log('✅ Emergency fix completed successfully');
                          }, 1000);
                        }
                      }
                    ]
                  );
                } else {
                  Alert.alert('Error', 'Fix failed. Please try again.');
                }
              } catch (error) {
                console.error('Emergency fix error:', error);
                Alert.alert('Error', `Fix failed: ${error.message}`);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null; // Don't render if no user
  }

  return (
    <TouchableOpacity
      style={[styles.emergencyButton, style]}
      onPress={handleEmergencyFix}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <Ionicons name="medical" size={20} color="#FFF" />
      )}
      <Text style={styles.buttonText}>
        {loading ? 'Fixing...' : 'Emergency Fix'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 8
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8
  }
});