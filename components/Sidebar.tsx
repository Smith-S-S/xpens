import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, Modal,
} from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';

const SIDEBAR_WIDTH = 280;

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  onOpenExport: () => void;
}

export default function Sidebar({ visible, onClose, onOpenExport }: SidebarProps) {
  const colors = useColors();
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIsModalVisible(true);
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 220,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -SIDEBAR_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => setIsModalVisible(false));
    }
  }, [visible, translateX, backdropOpacity]);

  const displayName = isSignedIn && user
    ? (user.fullName || user.firstName || user.username ||
       user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User')
    : null;
  const email = isSignedIn && user ? user.primaryEmailAddress?.emailAddress : null;
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '';

  const handleSignIn = useCallback(() => {
    onClose();
    setTimeout(() => router.push('/sign-in'), 250);
  }, [onClose, router]);

  const handleExport = useCallback(() => {
    onOpenExport();
    onClose();
  }, [onOpenExport, onClose]);

  const handleSignOut = useCallback(async () => {
    onClose();
    await signOut();
    setTimeout(() => router.replace('/sign-in'), 250);
  }, [onClose, signOut, router]);

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: colors.background,
            borderRightColor: colors.border,
            paddingTop: insets.top + 20,
          },
          { transform: [{ translateX }] },
        ]}
      >
        {/* ── User Section ── */}
        <View style={[styles.userSection, { borderBottomColor: colors.border }]}>
          {isSignedIn && user ? (
            <>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
                {displayName}
              </Text>
              {email && (
                <Text style={[styles.userEmail, { color: colors.muted }]} numberOfLines={1}>
                  {email}
                </Text>
              )}
            </>
          ) : (
            <>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                ]}
              >
                <IconSymbol name="person.fill" size={26} color={colors.muted} />
              </View>
              <Text style={[styles.guestLabel, { color: colors.muted }]}>Not signed in</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.signInBtn,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handleSignIn}
              >
                <Text style={styles.signInBtnText}>Sign In</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* ── Menu Items ── */}
        <View style={styles.menu}>
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              { borderBottomColor: colors.border },
              pressed && { backgroundColor: colors.surface },
            ]}
            onPress={handleExport}
          >
            <View style={[styles.menuIconBg, { backgroundColor: colors.primary + '20' }]}>
              <IconSymbol name="square.and.arrow.up" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>Export Data</Text>
            <IconSymbol name="chevron.right" size={14} color={colors.muted} />
          </Pressable>

          {isSignedIn && (
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.surface },
              ]}
              onPress={handleSignOut}
            >
              <View style={[styles.menuIconBg, { backgroundColor: colors.expense + '20' }]}>
                <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color={colors.expense} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.expense }]}>Sign Out</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    borderRightWidth: 0.5,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  userSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 0.5,
    gap: 6,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
  },
  guestLabel: {
    fontSize: 14,
  },
  signInBtn: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  signInBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  menu: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  menuIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
