import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

const AppContent = () => {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
      <AppNavigator />
    </>
  );
};

import { MusicProvider } from './src/context/MusicContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MusicProvider>
          <AppContent />
        </MusicProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
