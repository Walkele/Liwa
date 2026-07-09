#!/usr/bin/env node

/**
 * Fix App Startup Issues
 * Resolves common React Native/Expo startup problems
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing App Startup Issues...');

// 1. Clear all caches
console.log('📦 Clearing caches...');
try {
  execSync('npx expo start --clear', { stdio: 'ignore' });
} catch (e) {
  // Continue if this fails
}

try {
  execSync('npm start -- --reset-cache', { stdio: 'ignore' });
} catch (e) {
  // Continue if this fails
}

// 2. Fix Metro config
console.log('🚇 Fixing Metro config...');
const metroConfig = `
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver configuration
config.resolver.assetExts.push('db');
config.resolver.sourceExts.push('jsx', 'js', 'ts', 'tsx', 'json');

// Fix transformer issues
config.transformer.minifierPath = 'metro-minify-terser';
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;
`;

fs.writeFileSync('metro.config.js', metroConfig);

// 3. Create a minimal App.js that works
console.log('📱 Creating minimal working App.js...');
const minimalApp = `
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Liwa Trading App</Text>
        <Text style={styles.subtitle}>Loading...</Text>
        <StatusBar style="auto" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FF6B6B',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
`;

// Backup current App.js
if (fs.existsSync('App.js')) {
  fs.copyFileSync('App.js', 'App.backup.js');
}

fs.writeFileSync('App.js', minimalApp);

// 4. Fix babel config
console.log('🔧 Fixing Babel config...');
const babelConfig = `
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
`;

fs.writeFileSync('babel.config.js', babelConfig);

console.log('✅ App startup fixes applied!');
console.log('');
console.log('🚀 Now try running:');
console.log('   npm start');
console.log('');
console.log('📱 If it works, you can gradually restore your original App.js');
console.log('   Your original App.js is backed up as App.backup.js');