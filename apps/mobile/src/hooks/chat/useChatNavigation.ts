/**
 * useChatNavigation Hook
 *
 * Manages scroll and back navigation for chat screen.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { ScrollView, BackHandler } from 'react-native';

interface UseChatNavigationOptions {
  isGenerating: boolean;
  messages: unknown[] | undefined;
  streamingText: string | null;
  onAbortAndSave: () => Promise<void>;
  onNavigateBack: () => void;
}

interface UseChatNavigationReturn {
  scrollViewRef: React.RefObject<ScrollView | null>;
  showBackDialog: boolean;
  handleBackPress: () => boolean;
  handleConfirmBack: () => Promise<void>;
  handleCancelBack: () => void;
}

export function useChatNavigation({
  isGenerating,
  messages,
  streamingText,
  onAbortAndSave,
  onNavigateBack,
}: UseChatNavigationOptions): UseChatNavigationReturn {
  const scrollViewRef = useRef<ScrollView>(null);
  const [showBackDialog, setShowBackDialog] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Scroll to bottom when streaming text updates
  useEffect(() => {
    if (streamingText) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [streamingText]);

  const handleBackPress = useCallback(() => {
    if (isGenerating) {
      setShowBackDialog(true);
      return true;
    }
    onNavigateBack();
    return true;
  }, [isGenerating, onNavigateBack]);

  const handleConfirmBack = useCallback(async () => {
    await onAbortAndSave();
    onNavigateBack();
  }, [onAbortAndSave, onNavigateBack]);

  const handleCancelBack = useCallback(() => {
    setShowBackDialog(false);
  }, []);

  // Intercept hardware back button on Android
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isGenerating) {
        handleBackPress();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [isGenerating, handleBackPress]);

  return {
    scrollViewRef,
    showBackDialog,
    handleBackPress,
    handleConfirmBack,
    handleCancelBack,
  };
}
