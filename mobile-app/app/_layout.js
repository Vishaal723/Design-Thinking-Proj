import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '../context/AppContext';
import { colors } from '../src/theme';

import { SafeAreaProvider } from 'react-native-safe-area-context';

function RootNavigator() {
  const { user } = useApp();

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="index" />
      </Stack>
      {/* Declarative redirect — safe to use before navigator fully mounts */}
      {user ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}

