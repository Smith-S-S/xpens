// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for MyMoney app.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "list.bullet": "list",
  "chart.bar.fill": "bar-chart",
  "chart.pie.fill": "pie-chart",
  "creditcard.fill": "account-balance-wallet",
  "tag.fill": "label",
  "plus": "add",
  "plus.circle.fill": "add-circle",
  // Actions
  "chevron.left": "chevron-left",
  "chevron.right": "chevron-right",
  "chevron.left.forwardslash.chevron.right": "code",
  "paperplane.fill": "send",
  "trash.fill": "delete",
  "pencil": "edit",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "arrow.left": "arrow-back",
  "arrow.right": "arrow-forward",
  "arrow.left.arrow.right": "swap-horiz",
  // UI
  "ellipsis": "more-horiz",
  "ellipsis.circle": "more-horiz",
  "gear": "settings",
  "magnifyingglass": "search",
  "calendar": "calendar-today",
  "clock": "access-time",
  "bell.fill": "notifications",
  "info.circle": "info",
  "exclamationmark.triangle.fill": "warning",
  "doc.text.fill": "description",
  "photo": "photo",
  "camera.fill": "camera-alt",
  "square.and.arrow.up": "share",
  "arrow.clockwise": "refresh",
  "arrow.down.circle.fill": "download",
  "line.3.horizontal.decrease.circle": "filter-list",
  "line.3.horizontal": "menu",
  "person.fill": "person",
  "rectangle.portrait.and.arrow.right": "logout",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
