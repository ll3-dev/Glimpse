import { describe, expect, mock, test } from 'bun:test';

/**
 * EmptyState 프리미티브 렌더 검증.
 *
 * - setup.ts의 react-native 목이 View/Text/Pressable 기본 호스트 컴포넌트
 *   (문자열 더미)를 제공하므로 여기서 react-native를 재목킹하지 않는다.
 *   (실제 RN을 로드해 spread하면 named-export 정적 링크 검증과 충돌한다.)
 * - useSemanticColor는 uniwind JSI에 의존하므로 모듈 자체를 고정 스텁으로 대체한다
 *   (실제 uniwind를 로드하면 RN named-export 정적 링크 검증과 충돌한다).
 * - bun test 환경엔 DOM이 없으므로 react-dom/server로 정적 마크업을 렌더해
 *   카피/props 반영을 검증한다.
 */

mock.module('../theme/semantic-colors', () => ({
  useSemanticColor: (_name: string) => '#787774',
}));

const { renderToStaticMarkup } = await import('react-dom/server');
const { EmptyState } = await import('./empty-state');

const Icon = (_props: { size?: number; color?: string }) => null;

function markup(props: Parameters<typeof EmptyState>[0]): string {
  return renderToStaticMarkup(<EmptyState {...props} />);
}

describe('EmptyState', () => {
  test('title과 description을 렌더한다', () => {
    const html = markup({
      icon: Icon,
      title: '비어 있습니다',
      description: '항목을 추가해 보세요',
    });
    expect(html).toContain('비어 있습니다');
    expect(html).toContain('항목을 추가해 보세요');
  });

  test('description이 없으면 생략한다', () => {
    const html = markup({ icon: Icon, title: '비어 있습니다' });
    expect(html).toContain('비어 있습니다');
  });

  test('action 라벨을 렌더한다', () => {
    const html = markup({
      icon: Icon,
      title: '비어 있습니다',
      action: { label: '새 대화 시작', onPress: () => {} },
    });
    expect(html).toContain('새 대화 시작');
  });

  test('disabled이면 pendingLabel을 우선 렌더한다', () => {
    const html = markup({
      icon: Icon,
      title: '비어 있습니다',
      action: {
        label: '새 대화 시작',
        onPress: () => {},
        disabled: true,
        pendingLabel: '생성 중...',
      },
    });
    expect(html).toContain('생성 중...');
    expect(html).not.toContain('>새 대화 시작<');
    expect(html).toContain('opacity-50');
  });

  test('disabled인데 pendingLabel이 없으면 label을 유지한다', () => {
    const html = markup({
      icon: Icon,
      title: '비어 있습니다',
      action: { label: '새 대화 시작', onPress: () => {}, disabled: true },
    });
    expect(html).toContain('새 대화 시작');
  });

  test('compact는 py-8, 기본은 py-24 여백을 쓴다', () => {
    const compact = markup({ icon: Icon, title: '비어 있습니다', compact: true });
    const regular = markup({ icon: Icon, title: '비어 있습니다' });
    expect(compact).toContain('py-8');
    expect(regular).toContain('py-24');
    expect(compact).not.toContain('py-24');
  });
});
