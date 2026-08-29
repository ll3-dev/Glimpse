import { View, type ViewStyle } from 'react-native';

export type GlimpseLogoProps = {
  size?: number;
  className?: string;
  style?: ViewStyle;
};

/**
 * Glimpse 브랜드 로고 마크 컴포넌트
 * Warm minimalism & Notion archetype에 맞춘 픽셀 퍼펙트 벡터 렌더러
 */
export function GlimpseLogo({ size = 24, className = '', style }: GlimpseLogoProps) {
  const outerRadius = size * (176 / 528);
  const innerSize = size * (166 / 528);
  const innerRadius = size * (62 / 528);
  const innerTop = size * (84 / 528);
  const innerLeft = size * (286 / 528);

  return (
    <View
      className={className}
      style={[
        {
          width: size,
          height: size,
          borderRadius: outerRadius,
          backgroundColor: '#37352f',
          position: 'relative',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerRadius,
          backgroundColor: '#ffe8d4',
          position: 'absolute',
          top: innerTop,
          left: innerLeft,
        }}
      />
    </View>
  );
}
