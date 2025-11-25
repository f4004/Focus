import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { MusicProvider } from './src/context/MusicContext';
import { useFonts } from 'expo-font';
import notifee, { EventType } from '@notifee/react-native';
import { View, ActivityIndicator } from 'react-native';

// Register background handler
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  // Check if the user pressed the "Mark as read" action
  if (type === EventType.ACTION_PRESS && pressAction?.id) {
    // We can handle background actions here
    // For now, we just log, but in a real app we might update a store or DB
    console.log('Background Action Pressed:', pressAction.id);

    // If we had a global store or service that could run in background, we'd call it here.
    // Since we are using React state in hooks, it's tricky to update the "running" timer state 
    // from a headless JS task without a persistent store (like MMKV or Redux).
    // However, for this MVP, the foreground handler in useTimer might be enough if the app is just backgrounded (not killed).
    // If the app is killed, this headless task runs.
  }
});

const AppContent = () => {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
      <AppNavigator />
    </>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    'GoogleSansFlex': require('./assets/fonts/GoogleSansFlex-VariableFont_GRAD,ROND,opsz,slnt,wdth,wght.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

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
