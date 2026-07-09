import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SOPConsistencyService } from '../services/SOPConsistencyService';
import { useAuth } from '../context/AuthContext';

export default function SOPFixButton({ conversationId, style }) {
  const [fixing, setFixing] = useState(false);
  const { user } = useAuth();

  const handleFixSOP = async () => {
    try {
      setFixing(true);
      
      Alert.alert(
        'Fix SOP Issues',
        'This will fix any inconsistent message states in this conversation. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Fix Now',
            onPress: async () => {
              try {
                let result;
                
                if (conversationId) {
                  // Fix specific conversation
                  result = await SOPConsistencyService.fixConversationMessages(conversationId);
                } else {
                  // Fix all user conversations
                  result = await SOPConsistencyService.fixSOPInconsistencies(user.uid);
                }
                
                Alert.alert(
                  'SOP Fix Complete',
                  `Fixed ${result.fixCount} message inconsistencies. Please refresh the conversation to see changes.`,
                  [{ text: 'OK' }]
                );
                
              } catch (error) {
                Alert.alert('Error', 'Failed to fix SOP issues. Please try again.');
                console.error('SOP Fix Error:', error);
              }
            }
          }
        ]
      );
      
    } catch (error) {
      Alert.alert('Error', 'Failed to start SOP fix process.');
      console.error('SOP Fix Button Error:', error);
    } finally {
      setFixing(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.fixButton, style]}
      onPress={handleFixSOP}
      disabled={fixing}
    >
      <View style={styles.buttonContent}>
        <Ionicons 
          name={fixing ? "sync" : "build"} 
          size={16} 
          color="white" 
          style={fixing ? styles.spinning : null}
        />
        <Text style={styles.buttonText}>
          {fixing ? 'Fixing...' : 'Fix SOP'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fixButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  spinning: {
    // Add rotation animation if needed
  }
});