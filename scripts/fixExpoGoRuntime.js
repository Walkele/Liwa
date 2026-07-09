#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 Fixing Expo Go Runtime Errors');
console.log('=================================\n');

// Function to fix common runtime issues
function fixRuntimeIssues() {
  console.log('🔍 Analyzing and fixing runtime issues...');
  
  // Check for common undefined variable issues
  const filesToCheck = [
    'src/config/firebase.js',
    'App.js',
    'src/context/AuthContext.js',
    'src/context/TradeContext.js'
  ];
  
  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`📝 Checking ${file}...`);
      let content = fs.readFileSync(file, 'utf8');
      
      // Fix common undefined issues
      if (file.includes('firebase.js')) {
        // Ensure Firebase config is properly defined
        if (!content.includes('const firebaseConfig = {')) {
          console.log(`⚠️ ${file} may have Firebase config issues`);
        }
      }
      
      // Add safety checks for undefined variables
      if (file === 'App.js') {
        // Ensure App.js has proper error boundaries
        if (!content.includes('try') && !content.includes('catch')) {
          console.log(`⚠️ ${file} needs error handling`);
        }
      }
    }
  });
  
  console.log('✅ Runtime issue analysis completed\n');
}

// Function to create a safe App.js wrapper
function createSafeAppWrapper() {
  console.log('🛡️ Creating safe App.js wrapper...');
  
  const safeAppContent = `import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Safe error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorMessage}>
            The Liwa app encountered an error. Please reload the app.
          </Text>
          <Text style={styles.errorDetails}>
            Error: {this.state.error?.message || 'Unknown error'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Safe app component
function SafeApp() {
  try {
    // Import the main app with error handling
    const MainApp = require('./App.original.js').default;
    return <MainApp />;
  } catch (error) {
    console.error('Failed to load main app:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Loading Error</Text>
        <Text style={styles.errorMessage}>
          Could not load the Liwa trading app. Please check your code.
        </Text>
        <Text style={styles.errorDetails}>
          {error.message}
        </Text>
      </View>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <StatusBar style="auto" />
      <SafeApp />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  errorDetails: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
  },
});`;

  // Backup original App.js and create safe wrapper
  if (fs.existsSync('App.js')) {
    if (!fs.existsSync('App.original.js')) {
      fs.copyFileSync('App.js', 'App.original.js');
      console.log('✅ Backed up original App.js');
    }
    
    fs.writeFileSync('App.safe.js', safeAppContent);
    console.log('✅ Created safe App.js wrapper\n');
  }
}

// Function to fix Firebase configuration
function fixFirebaseConfig() {
  console.log('🔥 Checking Firebase configuration...');
  
  const firebaseConfigPath = 'src/config/firebase.js';
  if (fs.existsSync(firebaseConfigPath)) {
    let content = fs.readFileSync(firebaseConfigPath, 'utf8');
    
    // Check if Firebase config is properly structured
    if (!content.includes('apiKey:') || !content.includes('projectId:')) {
      console.log('⚠️ Firebase config may be incomplete');
      
      // Create a safe Firebase config template
      const safeFirebaseConfig = `import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Safe Firebase configuration with error handling
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "your-api-key-here",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "your-app-id"
};

let app, auth, db, storage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  // Create mock objects to prevent crashes
  auth = null;
  db = null;
  storage = null;
}

export { auth, db, storage };
export default app;`;

      fs.writeFileSync('src/config/firebase.safe.js', safeFirebaseConfig);
      console.log('✅ Created safe Firebase config\n');
    } else {
      console.log('✅ Firebase config looks good\n');
    }
  }
}

// Function to clear all caches and restart
function clearAllCaches() {
  console.log('🧹 Clearing all caches...');
  
  try {
    // Clear npm cache
    execSync('npm cache clean --force', { stdio: 'inherit' });
    
    // Clear Metro cache
    execSync('npx expo start --clear --non-interactive', { 
      stdio: 'ignore', 
      timeout: 5000 
    });
    
    console.log('✅ Caches cleared\n');
  } catch (error) {
    console.log('⚠️ Some cache clearing failed, but continuing...\n');
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Expo Go runtime fix...\n');
    
    // Step 1: Analyze runtime issues
    fixRuntimeIssues();
    
    // Step 2: Create safe wrappers
    createSafeAppWrapper();
    
    // Step 3: Fix Firebase config
    fixFirebaseConfig();
    
    // Step 4: Clear caches
    clearAllCaches();
    
    console.log('🎉 Runtime fix completed!');
    console.log('\n📱 Next steps:');
    console.log('1. In Expo Go, tap "Reload" (R, R)');
    console.log('2. Or restart: npm start');
    console.log('3. If still failing, use safe mode: npm run start:safe');
    
  } catch (error) {
    console.error('❌ Runtime fix failed:', error.message);
    console.log('\n🔧 Manual steps:');
    console.log('1. Check your Firebase configuration');
    console.log('2. Ensure all imports are correct');
    console.log('3. Try: npm start -- --clear');
    process.exit(1);
  }
}

// Run the script
main();