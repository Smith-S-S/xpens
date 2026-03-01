import { ActivityIndicator, View } from "react-native";

// This route is the redirect target for Clerk's Google OAuth flow.
// Clerk resolves the session internally after the deep link lands here —
// the actual navigation to /(tabs) is handled back in sign-in.tsx.
export default function OAuthNativeCallback() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0F0703" }}>
      <ActivityIndicator size="large" color="#FF6803" />
    </View>
  );
}
