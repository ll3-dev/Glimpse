/**
 * ChatInput Component
 *
 * Text input area for sending messages.
 */

import { View, TextInput, Pressable, ActivityIndicator, Platform, Keyboard } from 'react-native';
import { Send } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSemanticColor } from '@glimpse/ui';
import { cn } from '@/src/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void | Promise<boolean | void>;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = '메시지를 입력하세요...',
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const appSubtle = useSemanticColor('appSubtle');
  const appMuted = useSemanticColor('appMuted');
  const foreground = useSemanticColor('appBg');

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (trimmed && !isLoading) {
      const result = await onSend(trimmed);
      if (result !== false) {
        setText('');
      }
    }
  };

  const canSend = text.trim().length > 0 && !isLoading;

  return (
    <View 
      className="bg-app-surface border-t border-app-border px-6 pt-2.5"
      style={{ 
        paddingBottom: isKeyboardVisible ? 10 : Math.max(insets.bottom, 12),
      }}
    >
      <View className="flex-row items-end">
        <View className="flex-1 rounded-xl border border-app-border bg-app-bg px-3.5 mr-2.5 min-h-[44px] max-h-32 justify-center">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={appSubtle}
            multiline
            maxLength={4000}
            className="text-sm leading-5 text-app-text py-2"
            style={{ 
              textAlignVertical: 'center',
            }}
            editable={!isLoading}
          />
        </View>
        <Pressable
          className={cn(
            "w-11 h-11 rounded-full items-center justify-center",
            canSend
              ? "bg-app-text"
              : "bg-app-bg border border-app-border",
            isLoading && "opacity-70"
          )}
          onPress={handleSend}
          disabled={!canSend}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={foreground} />
          ) : (
            <Send size={18} color={canSend ? foreground : appMuted} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
