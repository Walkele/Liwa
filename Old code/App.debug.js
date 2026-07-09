import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { height, width } = Dimensions.get('window');

export default function App() {
  const [debugInfo, setDebugInfo] = useState([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    
    // Add debug info
    const addDebug = (message) => {
      const timestamp = Date.now() - startTime;
      setDebugInfo(prev => [...prev, `[${timestamp}ms] ${message}`]);
    };

    addDebug('App component mounted');
    addDebug(`Platform: ${Platform.OS}`);
    addDebug(`Screen: ${width}x${height}`);
    
    // Simulate app initialization
    setTimeout(() => {
      addDebug('App initialization complete');
      setIsReady(true);
    }, 1000);

    // Error boundary
    const originalError = console.error;
    console.error = (...args) => {
      addDebug(`ERROR: ${args.join(' ')}`);
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#fff" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>🔥 Liwa Trading App</Text>
        <Text style={styles.subtitle}>
          {isReady ? 'Ready to Trade!' : 'Initializing...'}
        </Text>
        
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>App Status</Text>
          <Text style={[styles.statusText, { color: isReady ? '#4CAF50' : '#FF9800' }]}>
            {isReady ? '✅ Ready' : '⏳ Loading'}
          </Text>
        </View>

        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          {debugInfo.map((info, index) => (
            <Text key={index} style={styles.debugText}>{info}</Text>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>System Info</Text>
          <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
          <Text style={styles.infoText}>Version: {Platform.Version}</Text>
          <Text style={styles.infoText}>Screen: {width}x{height}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  debugCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});