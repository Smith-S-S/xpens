import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import * as SecureStore from "expo-secure-store";

const SKIPPED_KEY = "auth_skipped";

async function getSkipped(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      return window.localStorage.getItem(SKIPPED_KEY) === "true";
    }
    const val = await SecureStore.getItemAsync(SKIPPED_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const [skipped, setSkipped] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    getSkipped().then(setSkipped);
  }, [isLoaded]);

  // Still loading Clerk or checking skip preference
  if (!isLoaded || skipped === null) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D12", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (isSignedIn || skipped) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/sign-in" />;
}
