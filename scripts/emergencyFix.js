#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚨 Emergency Fix for Liwa App Runtime Error');
console.log('==========================================\n');

// Create a minimal working App.js
function createMinimalApp() {
  console.log('🔧 Creating minimal working app...');
  
  const minimalAppContent = `import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [message, setMessage] = React.useState('Welcome to Liwa Trading App!');
  
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🏪 Liwa</Text>
        <Text style={styles.subtitle}>Trading Made Simple</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅ App Status</Text>
          <Text style={styles.cardText}>{message}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => setMessage('App is working! Ready for development.')}
        >
          <Text style={styles.buttonText}>Test App</Text>
        </TouchableOpacity>
        
        <View style={styles.features}>
          <Text style={styles.featuresTitle}>🚀 Features Ready:</Text>
          <Text style={styles.feature}>• User Authentication</Text>
          <Text style={styles.feature}>• Item Trading System</Text>
          <Text style={styles.feature}>• Real-time Chat</Text>
          <Text style={styles.feature}>• Counter Offers</Text>
          <Text style={styles.feature}>• Security Features</Text>
        </View>
        
        <View style={styles.info}>
          <Text style={styles.infoText}>
            This is a minimal version to test Expo Go connectivity.
            Once this works, we can gradually add back the full features.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 50,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    color: '#666',
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  features: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  feature: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  info: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 8,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#0066cc',
    textAlign: 'center',
    lineHeight: 20,
  },
});`;

  // Backup original App.js
  if (fs.existsSync('App.js') && !fs.existsSync('App.original.js')) {
    fs.copyFileSync('App.js', 'App.original.js');
    console.log('✅ Backed up original App.js to App.original.js');
  }
  
  // Create minimal App.js
  fs.writeFileSync('App.js', minimalAppContent);
  console.log('✅ Created minimal working App.js\n');
}

// Create minimal package.json scripts
function addEmergencyScripts() {
  console.log('📝 Adding emergency scripts...');
  
  const packageJsonPath = 'package.json';
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Add emergency scripts
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['start:minimal'] = 'expo start --clear --offline';
    packageJson.scripts['restore:app'] = 'cp App.original.js App.js';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Added emergency scripts to package.json\n');
  }
}

// Main execution
function main() {
  console.log('🚀 Starting emergency fix...\n');
  
  try {
    // Create minimal app
    createMinimalApp();
    
    // Add emergency scripts
    addEmergencyScripts();
    
    console.log('🎉 Emergency fix completed!');
    console.log('\n📱 Next steps:');
    console.log('1. In Expo Go, tap "RELOAD (R, R)"');
    console.log('2. You should see a simple Liwa app');
    console.log('3. If it works, we can gradually add back features');
    console.log('\n🔧 To restore original app later:');
    console.log('npm run restore:app');
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error.message);
    console.log('\n🔧 Manual steps:');
    console.log('1. Rename App.js to App.broken.js');
    console.log('2. Create a simple App.js with basic React Native components');
    console.log('3. Test in Expo Go');
  }
}

// Run the script
main();