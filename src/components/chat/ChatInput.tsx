/**
 * ChatInput Component
 *
 * Text input area for sending messages.
 */

import { View, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Send } from 'lucide-react-native';
import { useState } from 'react';
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
  const insets = useSafeAreaInsets();

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
        paddingBottom: Math.max(insets.bottom, 16),
        paddingHorizontal: 16,
        paddingTop: 12,
      }}
    >
      <View className="flex-row items-end">
        <View className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 mr-3">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={4000}
            className="text-base text-gray-900 max-h-32"
            style={{ 
              textAlignVertical: 'center',
              paddingTop: Platform.OS === 'ios' ? 7 : 0,
              paddingBottom: Platform.OS === 'ios' ? 7 : 0,
            }}
            editable={!isLoading}
          />
        </View>
        <TouchableOpacity
          className={`w-11 h-11 rounded-full items-center justify-center ${
            canSend ? 'bg-black' : 'bg-gray-200'
          }`}
          onPress={handleSend}
          disabled={!canSend}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#9ca3af" />
          ) : (
            <Send size={20} color={canSend ? 'white' : '#9ca3af'} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
