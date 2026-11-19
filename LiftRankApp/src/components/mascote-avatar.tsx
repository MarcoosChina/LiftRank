import { StyleSheet, View, type ViewStyle } from 'react-native';

/**
 * Avatar pixel art do mascote (skill.md §1/§5.3): homem musculoso, cabelo
 * castanho espetado, regata preta — desenhado com Views (16-bit sem antialias).
 * Tamanho fixo de 48px; a moldura verde-água fica a cargo de quem o usa.
 */
export function MascoteAvatar({
  size = 48,
  style,
}: {
  size?: number;
  style?: ViewStyle;
}) {
  const s = (n: number) => Math.round((n / 48) * size);
  return (
    <View style={[styles.box, { width: size, height: size }, style]}>
      {/* cabelo castanho espetado */}
      <View style={[styles.hair, { top: s(8), height: s(9), borderRadius: s(3) }]} />
      {/* rosto */}
      <View style={[styles.face, { top: s(13), height: s(13) }]} />
      {/* olhos (pixels escuros) */}
      <View style={[styles.eye, { top: s(17), left: s(17), width: s(3), height: s(3) }]} />
      <View style={[styles.eye, { top: s(17), left: s(28), width: s(3), height: s(3) }]} />
      {/* regata preta (ombros/torso) */}
      <View style={[styles.tank, { top: s(27), height: s(21) }]} />
      {/* braços */}
      <View style={[styles.arm, { top: s(28), left: s(3), width: s(7), height: s(14) }]} />
      <View style={[styles.arm, { top: s(28), left: s(38), width: s(7), height: s(14) }]} />
      {/* halteres nas mãos */}
      <View style={[styles.dumbbell, { top: s(38), left: s(0), width: s(10), height: s(5) }]} />
      <View style={[styles.dumbbell, { top: s(38), left: s(38), width: s(10), height: s(5) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    backgroundColor: '#1B2150',
  },
  hair: {
    position: 'absolute',
    left: 9,
    right: 9,
    backgroundColor: '#7A4A21',
  },
  face: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#E8B58C',
    borderRadius: 4,
  },
  eye: {
    position: 'absolute',
    backgroundColor: '#1A1200',
  },
  tank: {
    position: 'absolute',
    left: 8,
    right: 8,
    backgroundColor: '#14100F',
    borderRadius: 5,
  },
  arm: {
    position: 'absolute',
    backgroundColor: '#E8B58C',
    borderRadius: 3,
  },
  dumbbell: {
    position: 'absolute',
    backgroundColor: '#8A8A96',
    borderRadius: 1,
  },
});
