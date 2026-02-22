import { useOAuth } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

const SKIPPED_KEY = "auth_skipped";

export default function SignInScreen() {
  const router = useRouter();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL("/oauth-native-callback"),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error("OAuth error", err);
      Alert.alert("Sign in failed", "Could not sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loading, startOAuthFlow, router]);

  const handleSkip = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        window.localStorage.setItem(SKIPPED_KEY, "true");
      } else {
        await SecureStore.setItemAsync(SKIPPED_KEY, "true");
      }
    } catch {
      // ignore
    }
    router.replace("/(tabs)");
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ── Hero area ── */}
      <View style={styles.hero}>
        {/* Decorative glow blob */}
        <View style={styles.glowBlob} />

        {/* Icon */}
        <View style={styles.iconRing}>
          <Text style={styles.iconEmoji}>💰</Text>
        </View>
      </View>

      {/* ── Content area ── */}
      <View style={styles.content}>
        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>M</Text>
          </View>
          <Text style={styles.appName}>MyMoney</Text>
        </View>

        <Text style={styles.tagline}>Easy way for all your transactions</Text>

        {/* Buttons */}
        <View style={styles.buttons}>
          {/* Google */}
          <Pressable
            style={({ pressed }) => [
              styles.googleBtn,
              pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              loading && { opacity: 0.6 },
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#111" />
            ) : (
              <>
                <View style={styles.googleG}>
                  <Text style={styles.googleGText}>G</Text>
                </View>
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Skip */}
          <Pressable
            style={({ pressed }) => [
              styles.skipBtn,
              pressed && { opacity: 0.5 },
            ]}
            onPress={handleSkip}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </SafeAreaView>
  );
}

const BG = "#0D0D12";
const SURFACE = "#16171E";
const BORDER = "#2A2B35";
const PRIMARY = "#2563EB";
const MUTED = "#6B7280";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Hero ──
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glowBlob: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: PRIMARY,
    opacity: 0.07,
  },
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  iconEmoji: {
    fontSize: 52,
  },

  // ── Content ──
  content: {
    paddingHorizontal: 28,
    paddingBottom: 16,
    gap: 20,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  appName: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  tagline: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
    marginTop: -6,
  },

  // ── Buttons ──
  buttons: {
    gap: 12,
    marginTop: 8,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  googleG: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleGText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  googleBtnText: {
    color: "#111",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
  },
  dividerText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "500",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  skipText: {
    color: MUTED,
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  disclaimer: {
    color: "#3D3E4A",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
});
