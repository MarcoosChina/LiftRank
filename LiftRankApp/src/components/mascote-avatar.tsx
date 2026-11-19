import { Image, type ImageStyle } from 'react-native';

/**
 * Avatar pixel art do mascote (skill.md §1/§5.3): homem musculoso, cabelo
 * castanho espetado, regata preta, segurando halteres azuis.
 *
 * Fonte: `assets/images/arquivos-svg/avatar.svg` → rasterizado sem
 * interpolação para `assets/images/mascote-avatar.png` (144×144, grade 48×3).
 * Recolorir/regenerar: basta re-rasterizar o SVG.
 */
const MASCOTE = require('../../assets/images/mascote-avatar.png');

export function MascoteAvatar({
  size = 48,
  style,
}: {
  size?: number;
  style?: ImageStyle;
}) {
  return (
    <Image
      source={MASCOTE}
      accessibilityLabel="Avatar do mascote"
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
    />
  );
}
