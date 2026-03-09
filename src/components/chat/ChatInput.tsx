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
  onSend: (message: string) => void;
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

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed && !isLoading) {
      onSend(trimmed);
      setText('');
    }
  };

  const canSend = text.trim().length > 0 && !isLoading;

  return (
    <View 
      className="bg-white border-t border-gray-100"
      style={{ 
        paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 8),
        paddingHorizontal: 12,
        paddingTop: 8,
      }}
    >
      <View className="flex-row items-end">
        <View className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 mr-2">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={4000}
            className="text-[16px] text-gray-900 max-h-32"
            style={{ 
              textAlignVertical: 'center',
              paddingTop: Platform.OS === 'ios' ? 4 : 0,
              paddingBottom: Platform.OS === 'ios' ? 4 : 0,
            }}
            editable={!isLoading}
          />
        </View>
        <TouchableOpacity
          className={`w-9 h-9 rounded-full items-center justify-center mb-0.5 ${
            canSend ? 'bg-black' : 'bg-gray-200'
          }`}
          onPress={handleSend}
          disabled={!canSend}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#9ca3af" />
          ) : (
            <Send size={18} color={canSend ? 'white' : '#9ca3af'} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
