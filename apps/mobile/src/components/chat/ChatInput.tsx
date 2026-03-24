/**
 * ChatInput Component
 *
 * Text input area for sending messages.
 */

import { View, TextInput, TouchableOpacity, ActivityIndicator, Platform, Keyboard } from 'react-native';
import { Send } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  const theme = {
    bg: '#ffffff',
    inputBg: '#f7f6f3',
    text: '#37352f',
    muted: '#787774',
    border: '#edece9',
    primary: '#37352f',
  };

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
      className="bg-white border-t"
      style={{ 
        borderColor: theme.border,
        paddingBottom: isKeyboardVisible ? 10 : Math.max(insets.bottom, 12),
        paddingHorizontal: 16,
        paddingTop: 12,
      }}
    >
      <View className="flex-row items-end">
        <View 
          className="flex-1 rounded-xl border px-3 mr-3"
          style={{ 
            backgroundColor: theme.inputBg,
            borderColor: theme.border,
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={theme.muted}
            multiline
            maxLength={4000}
            className="text-[16px]"
            style={{ 
              color: theme.text,
              fontSize: 16,
              paddingTop: Platform.OS === 'ios' ? 10 : 0,
              paddingBottom: Platform.OS === 'ios' ? 10 : 0,
              textAlignVertical: 'center',
              includeFontPadding: false,
            }}
            editable={!isLoading}
          />
        </View>
        <TouchableOpacity
          className="w-11 h-11 rounded-full items-center justify-center mb-0"
          style={{ 
            backgroundColor: canSend ? theme.primary : theme.inputBg,
            opacity: isLoading ? 0.7 : 1,
            borderWidth: canSend ? 0 : 1,
            borderColor: theme.border,
          }}
          onPress={handleSend}
          disabled={!canSend}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Send size={18} color={canSend ? 'white' : theme.muted} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
