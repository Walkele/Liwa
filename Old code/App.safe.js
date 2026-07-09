import React from 'react';
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
});