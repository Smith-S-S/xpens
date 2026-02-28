import { useOAuth } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";
import { AntDesign } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

const SKIPPED_KEY = "auth_skipped";

const BG      = '#0F0703';
const SURFACE = '#190D06';
const BORDER  = '#2A1608';
const PRIMARY = '#FF6803';
const MUTED   = '#8B7355';

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
      {/* ── Hero image with fade edges ── */}
      <View style={styles.hero}>
        <Image
          source={require('@/assets/images/hands_holding_coin_clean.png')}
          style={styles.heroImage}
          resizeMode="contain"
        />
        {/* Left fade */}
        <LinearGradient
          colors={[BG, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { right: '55%' }]}
        />
        {/* Right fade */}
        <LinearGradient
          colors={['transparent', BG]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { left: '55%' }]}
        />
        {/* Bottom fade */}
        <LinearGradient
          colors={['transparent', BG]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, { top: '45%' }]}
        />
      </View>

      {/* ── Content area ── */}
      <View style={styles.content}>
        {/* Brand */}
        {/* <View style={styles.brand}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>X</Text>
          </View>
          <Text style={styles.appName}>Xpens</Text>
        </View> */}

        <Text style={styles.tagline}>"Tracking means you're taking control."</Text>

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
                <AntDesign name="google" size={20} color="#4285F4" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Hero ──
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },

  // ── Content ──
  content: {
    paddingHorizontal: 28,
    paddingBottom: 16,
    gap: 20,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  appName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tagline: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
    marginTop: -6,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // ── Buttons ──
  buttons: {
    gap: 12,
    marginTop: 8,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  googleBtnText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '500',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  skipText: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  disclaimer: {
    color: '#3D2A1A',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
