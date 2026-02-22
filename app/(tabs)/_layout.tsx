import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View, Pressable, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState } from "react";
import AddTransactionModal from "@/components/AddTransactionModal";
import Sidebar from "@/components/Sidebar";
import ExportModal from "@/components/ExportModal";
import { SidebarProvider, useSidebar } from "@/lib/SidebarContext";
import * as Haptics from "expo-haptics";

function CenterAddButton({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fabContainer,
        { backgroundColor: colors.primary },
        pressed && { transform: [{ scale: 0.93 }], opacity: 0.9 },
      ]}
    >
      <IconSymbol name="plus" size={28} color="#FFFFFF" />
    </Pressable>
  );
}

function TabLayoutInner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { isSidebarOpen, closeSidebar } = useSidebar();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          headerShown: false,
          tabBarStyle: {
            paddingTop: 8,
            paddingBottom: bottomPadding,
            height: tabBarHeight,
            backgroundColor: colors.background,
            borderTopColor: 'rgba(255, 104, 3, 0.20)',
            borderTopWidth: 0.5,
            elevation: 8,
            shadowColor: '#FF6803',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Records",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="list.bullet" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="analyse"
          options={{
            title: "Analyse",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="chart.pie.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: "",
            tabBarIcon: () => null,
            tabBarLabel: () => null,
            tabBarButton: () => (
              <View style={styles.fabWrapper}>
                <CenterAddButton
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    setShowAddModal(true);
                  }}
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="accounts"
          options={{
            title: "Accounts",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="creditcard.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="categories"
          options={{
            title: "Categories",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="tag.fill" color={color} />
            ),
          }}
        />
      </Tabs>

      <AddTransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={() => setShowAddModal(false)}
      />

      <Sidebar
        visible={isSidebarOpen}
        onClose={closeSidebar}
        onOpenExport={() => setShowExportModal(true)}
      />

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </>
  );
}

export default function TabLayout() {
  return (
    <SidebarProvider>
      <TabLayoutInner />
    </SidebarProvider>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  fabContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6803',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 18,
    elevation: 12,
  },
});
