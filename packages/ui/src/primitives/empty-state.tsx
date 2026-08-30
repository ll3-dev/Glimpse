import { Pressable, Text, View } from 'react-native';
import { cn } from '../lib/cn';
import { useSemanticColor } from '../theme/semantic-colors';

type EmptyStateAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  pendingLabel?: string;
};

type EmptyStateProps = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  /**
   * 좁은 컨텍스트(채팅 상세 등)에서 세로 여백을 줄인다.
   */
  compact?: boolean;
};

/**
 * 흩어진 빈 상태 UI를 위한 공유 stateless 프리미티브. 아이콘·카피·CTA만
 * 주입받아 렌더하며, 색상은 내부에서 시맨틱 토큰으로 해석한다.
 * 레이아웃/스타일은 기존 EmptyLibraryState 패턴을 이식했다.
 */
function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  const appMuted = useSemanticColor('appMuted');
  const appBg = useSemanticColor('appBg');

  return (
    <View
      className={cn(
        'flex-1 items-center justify-center px-6',
        compact ? 'py-8' : 'py-24'
      )}
    >
      <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-app-surface border border-app-border">
        <Icon size={20} color={appMuted} />
      </View>
      <Text className="text-base font-semibold text-app-text text-center tracking-tight">
        {title}
      </Text>
      {description ? (
        <Text className="mt-1.5 text-sm text-app-muted text-center leading-relaxed">
          {description}
        </Text>
      ) : null}
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: Boolean(action.disabled) }}
          className={cn(
            'mt-6 flex-row items-center rounded-lg bg-app-text px-5 py-2.5 active:opacity-90',
            action.disabled && 'opacity-50'
          )}
          onPress={action.onPress}
          disabled={action.disabled}
        >
          <Text className="font-medium text-sm text-app-bg">
            {action.disabled && action.pendingLabel ? action.pendingLabel : action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export { EmptyState };
export type { EmptyStateProps };
