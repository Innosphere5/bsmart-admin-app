import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';

import AppNavigator from './src/navigation/AppNavigator';

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
  useEffect(() => {
    async function checkUpdate() {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.log('Update check error:', e);
      }
    }
    checkUpdate();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}