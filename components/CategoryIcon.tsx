import React from 'react';
import { Text, Image, ImageStyle } from 'react-native';

// Map image icon keys → require sources
const IMAGE_ICON_MAP: Record<string, ReturnType<typeof require>> = {
  'img:money':       require('@/assets/images/money.png'),
  'img:surprised':   require('@/assets/images/surprised.png'),
  'img:un-expected': require('@/assets/images/un-expected.png'),
};

/** All selectable image icon keys (shown in the picker) */
export const IMAGE_ICONS = Object.keys(IMAGE_ICON_MAP) as (keyof typeof IMAGE_ICON_MAP)[];

/** Renders either a PNG image or an emoji based on the icon string. */
export function CategoryIcon({
  icon,
  size = 28,
  style,
}: {
  icon: string;
  size?: number;
  style?: ImageStyle;
}) {
  const src = IMAGE_ICON_MAP[icon];
  if (src) {
    // PNG icons have internal padding so render 1.6× larger to visually match emojis
    const imgSize = Math.round(size * 1.6);
    return (
      <Image
        source={src}
        style={[{ width: imgSize, height: imgSize }, style]}
        resizeMode="contain"
      />
    );
  }
  return <Text style={{ fontSize: size * 0.85 }}>{icon}</Text>;
}
