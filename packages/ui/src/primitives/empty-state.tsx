import { Pressable, Text, View } from 'react-native';
import { cn } from '../lib/cn';
import { useSemanticColor } from '../theme/semantic-colors';

type EmptyStateAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  pendingLabel?: string;
  /**
   * CTA 앞에 붙는 옵셔널 아이콘 (예: Plus).
   */
  icon?: React.ComponentType<{ size?: number; color?: string }>;
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
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: EmptyStateProps) {
  const appMuted = useSemanticColor('appMuted');

  return (
    <View
      className={cn(
        'flex-1 items-center justify-center px-6',
        compact ? 'py-10 px-1' : 'py-24'
      )}
    >
      <View
        className={cn(
          'items-center justify-center bg-app-surface border border-app-border shadow-2xs',
          compact ? 'mb-3 w-12 h-12 rounded-2xl' : 'mb-4 h-14 w-14 rounded-2xl'
        )}
      >
        <Icon size={compact ? 20 : 22} color={appMuted} />
      </View>
      <Text
        className={cn(
          'text-base font-semibold text-app-text text-center tracking-tight',
          compact ? 'mb-1' : 'mb-2'
        )}
      >
        {title}
      </Text>
      {description ? (
        <Text
          className={cn(
            'text-sm text-app-muted text-center leading-relaxed',
            compact ? 'mb-6 text-xs' : 'mb-6'
          )}
        >
          {description}
        </Text>
      ) : null}
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: Boolean(action.disabled) }}
          className={cn(
            'mt-6 flex-row items-center rounded-full bg-app-text px-5 py-3 active:opacity-90',
            action.disabled && 'opacity-50'
          )}
          onPress={action.onPress}
          disabled={action.disabled}
        >
          {action.icon ? <ActionIcon icon={action.icon} /> : null}
          <Text
            className={cn(
              'font-semibold text-sm text-app-bg',
              action.icon && 'ml-2'
            )}
          >
            {action.disabled && action.pendingLabel ? action.pendingLabel : action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * action.icon을 현재 시맨틱 배경색으로 렌더하는 작은 헬퍼.
 */
function ActionIcon({ icon: Icon }: { icon: React.ComponentType<{ size?: number; color?: string }> }) {
  const appBg = useSemanticColor('appBg');
  return <Icon size={16} color={appBg} />;
}

export { EmptyState };
export type { EmptyStateProps };
