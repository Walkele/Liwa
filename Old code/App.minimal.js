import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View style={{
      flex: 1,
      backgroundColor: '#ffffff',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 50,
    }}>
      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF6B6B',
        marginBottom: 20,
      }}>
        🔥 Liwa Trading App
      </Text>
      <Text style={{
        fontSize: 16,
        color: '#333333',
      }}>
        App is working!
      </Text>
    </View>
  );
}