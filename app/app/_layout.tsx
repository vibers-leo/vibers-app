import "@/global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Sentry from "@sentry/react-native";
import { ErrorBoundary } from "@/components/ErrorBoundary";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || "",
  tracesSampleRate: 0.2,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
