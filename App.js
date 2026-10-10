import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, AppState, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import AppNavigator from './src/navigation/AppNavigator';
import { checkAndApplyUpdate } from './src/services/updateService';

// Error Boundary to prevent instant crash on JS errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errStyles.container}>
          <Text style={errStyles.title}>⚠️ Something went wrong</Text>
          <ScrollView style={errStyles.scroll}>
            <Text style={errStyles.message}>{String(this.state.error?.stack || this.state.error)}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const errStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#FFF5F5' },
  title: { fontSize: 20, fontWeight: '700', color: '#991B1B', marginBottom: 12 },
  scroll: { maxHeight: 200 },
  message: { fontSize: 14, color: '#475569', textAlign: 'center' },
});

export default function App() {
  const [updateStatus, setUpdateStatus] = useState(null); // 'checking' | 'downloading' | 'ready' | null

  useEffect(() => {
    // 1. Check immediately on initial startup
    checkAndApplyUpdate(setUpdateStatus);

    // 2. Check every time app is resumed from background
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkAndApplyUpdate(setUpdateStatus);
      }
    });

    // 3. Periodic check every 60 seconds while app is in active use
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        checkAndApplyUpdate(setUpdateStatus);
      }
    }, 60000);

    return () => {
      subscription?.remove();
      clearInterval(interval);
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {/* Floating Update Notification Banner */}
        {updateStatus && updateStatus !== 'checking' && (
          <View style={updateBannerStyles.container}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={updateBannerStyles.text}>
              {updateStatus === 'ready'
                ? '✨ New features ready! Reloading app...'
                : '🔄 New APK update detected! Downloading...'}
            </Text>
          </View>
        )}
        <AppNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const updateBannerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 44,
    left: 16,
    right: 16,
    zIndex: 9999,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});