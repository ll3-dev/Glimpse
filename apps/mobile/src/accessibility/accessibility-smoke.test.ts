import { describe, expect, test } from 'bun:test';

const workspaceRoot = new URL('../../../../', import.meta.url);

async function source(relativePath: string): Promise<string> {
  return Bun.file(new URL(relativePath, workspaceRoot)).text();
}

describe('mobile accessibility source contracts', () => {
  test('shared controls expose roles, state, and a 44pt-equivalent target', async () => {
    const [button, toggle] = await Promise.all([
      source('packages/ui/src/primitives/button.tsx'),
      source('packages/ui/src/primitives/switch.tsx'),
    ]);

    expect(button).toContain('accessibilityRole="button"');
    expect(button).toContain('accessibilityState={{ disabled: Boolean(props.disabled) }}');
    expect(toggle).toContain('accessibilityRole="switch"');
    expect(toggle).toContain('accessibilityState={{ checked, disabled }}');
    expect(toggle).toContain('hitSlop={8}');
  });

  test('destructive data actions and model controls have explicit names and state', async () => {
    const [dataSection, modelCard] = await Promise.all([
      source('apps/mobile/src/components/settings/DataManagementSection.tsx'),
      source('apps/mobile/src/components/settings/ModelDownloadCard.tsx'),
    ]);

    for (const contract of [
      'accessibilityRole="button"',
      'accessibilityLabel={title}',
      'accessibilityHint={description}',
      'accessibilityState={{ busy, disabled }}',
      'min-h-14',
    ]) {
      expect(dataSection).toContain(contract);
    }
    expect(modelCard).toContain('accessibilityState={{ disabled: !canDownload }}');
    expect(modelCard).toContain('accessibilityState={{ disabled: !canSelect }}');
    expect(modelCard).toContain('min-h-11');
    expect(modelCard).toContain('min-w-11');
  });

  test('animated status surfaces honor the system reduced-motion preference', async () => {
    const [bannerAnimation, toast] = await Promise.all([
      source(
        'apps/mobile/src/components/settings/useGlobalModelDownloadBannerAnimation.ts',
      ),
      source('apps/mobile/src/components/common/Toast.tsx'),
    ]);

    expect(bannerAnimation).toContain('useReducedMotion()');
    expect(bannerAnimation).toContain('.enabled(!reduceMotion)');
    expect(toast).toContain('useReducedMotion()');
    expect(toast).toContain('reduceMotion ? 0');
  });

  test('modernized surfaces resolve dynamic colors through semantic tokens', async () => {
    const files = await Promise.all([
      source('apps/mobile/app/settings.tsx'),
      source('apps/mobile/app/local-models.tsx'),
      source('apps/mobile/app/capture.tsx'),
      source('apps/mobile/app/library/[id].tsx'),
      source('apps/mobile/app/(tabs)/library.tsx'),
      source('apps/mobile/app/(tabs)/chat.tsx'),
      source('apps/mobile/src/components/chat/ChatInput.tsx'),
      source('apps/mobile/src/components/chat/ChatMessage.tsx'),
      source('apps/mobile/src/components/chat/ChatMessageReasoning.tsx'),
      source('apps/mobile/src/components/chat/ChatMessageActions.tsx'),
      source('apps/mobile/src/components/chat/ContextBadge.tsx'),
      source('apps/mobile/src/components/chat/ConversationEditModal.tsx'),
      source('apps/mobile/src/components/chat/MessageEditModal.tsx'),
      source('apps/mobile/src/components/chat/ChatAISetupDialog.tsx'),
      source('apps/mobile/src/components/capture/CaptureForm.tsx'),
      source('apps/mobile/src/components/capture/ShareForm.tsx'),
      source('apps/mobile/src/components/capture/ScreenshotForm.tsx'),
      source('apps/mobile/src/components/capture/HighlightForm.tsx'),
      source('apps/mobile/src/components/capture/UnifiedCaptureForm.tsx'),
      source('apps/mobile/src/components/capture/UnifiedCaptureAssistantBar.tsx'),
      source('apps/mobile/src/components/digest/RecommendationCard.tsx'),
      source('apps/mobile/src/components/library/KnowledgeItemCard.tsx'),
      source('apps/mobile/src/components/library/KnowledgeItemDetailCard.tsx'),
      source('apps/mobile/src/components/library/LibraryDetailHeaderActions.tsx'),
      source('apps/mobile/src/components/library/LibrarySortPicker.tsx'),
      source('apps/mobile/src/components/library/LibraryActiveFilterBar.tsx'),
      source('apps/mobile/src/components/library/EditKnowledgeItemModal.tsx'),
      source('apps/mobile/src/components/library/LibrarySearchInput.tsx'),
      source('apps/mobile/src/components/library/EmptyLibraryState.tsx'),
      source('apps/mobile/src/components/review/ReviewItemCard.tsx'),
      source('apps/mobile/src/components/settings/SemanticSearchSection.tsx'),
      source('apps/mobile/src/components/settings/ModelDownloadCard.tsx'),
      source('apps/mobile/src/components/settings/GlobalModelDownloadBanner.tsx'),
      source('apps/mobile/src/components/settings/LocalLLMSection.tsx'),
    ]);

    for (const contents of files) {
      expect(contents).not.toMatch(/#[0-9a-fA-F]{6}/);
    }
  });
});
