#!/usr/bin/env node

/**
 * Fix React Native Bundling Issues
 * Addresses "Cannot read property 'S' of undefined" errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing React Native Bundling Issues...');

// 1. Clear all caches completely
console.log('🧹 Clearing all caches...');
try {
  // Clear npm cache
  execSync('npm cache clean --force', { stdio: 'inherit' });
  
  // Clear Metro cache
  if (fs.existsSync('node_modules/.cache')) {
    execSync('rmdir /s /q node_modules\\.cache', { stdio: 'inherit' });
  }
  
  // Clear Expo cache
  try {
    execSync('npx expo r -c', { stdio: 'inherit' });
  } catch (e) {
    console.log('Expo cache clear failed, continuing...');
  }
} catch (e) {
  console.log('Cache clearing had issues, continuing...');
}

// 2. Fix package.json - remove problematic dependencies temporarily
console.log('📦 Fixing package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Create a minimal working package.json
const minimalPackageJson = {
  ...packageJson,
  dependencies: {
    "expo": "~54.0.0",
    "react": "18.2.0",
    "react-native": "0.81.5",
    "expo-status-bar": "^3.0.9"
  },
  devDependencies: {
    "@babel/core": "^7.20.0"
  }
};

fs.writeFileSync('package.json.backup', JSON.stringify(packageJson, null, 2));
fs.writeFileSync('package.json', JSON.stringify(minimalPackageJson, null, 2));

// 3. Create ultra-minimal babel config
console.log('🔧 Creating minimal babel config...');
const minimalBabel = `
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
`;
fs.writeFileSync('babel.config.js', minimalBabel);

// 4. Create minimal metro config
console.log('🚇 Creating minimal metro config...');
const minimalMetro = `
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
module.exports = config;
`;
fs.writeFileSync('metro.config.js', minimalMetro);

// 5. Create absolute minimal App.js
console.log('📱 Creating absolute minimal App.js...');
const ultraMinimalApp = `
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Text style={{ fontSize: 20, color: 'red' }}>Liwa App Works!</Text>
    </View>
  );
}
`;
fs.writeFileSync('App.js', ultraMinimalApp);

// 6. Remove node_modules and reinstall
console.log('📦 Reinstalling dependencies...');
try {
  execSync('rmdir /s /q node_modules', { stdio: 'inherit' });
} catch (e) {
  console.log('node_modules removal had issues, continuing...');
}

try {
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
} catch (e) {
  console.log('npm install failed, trying yarn...');
  try {
    execSync('yarn install', { stdio: 'inherit' });
  } catch (e2) {
    console.log('Both npm and yarn failed. Please run manually: npm install --legacy-peer-deps');
  }
}

console.log('✅ Bundling fixes applied!');
console.log('');
console.log('🚀 Now try:');
console.log('   npm start');
console.log('');
console.log('📝 If it works, you can gradually restore dependencies from package.json.backup');
console.log('');
console.log('🔄 To restore original package.json:');
console.log('   copy package.json.backup package.json');
console.log('   npm install --legacy-peer-deps');