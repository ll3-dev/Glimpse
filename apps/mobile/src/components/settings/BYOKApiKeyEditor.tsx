import { ActivityIndicator, Pressable, View } from 'react-native';
import { Eye, EyeOff, Radio } from 'lucide-react-native';
import { Button, Input, Text } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';

type BYOKApiKeyEditorProps = {
  state: {
    apiKey: string;
    showKey: boolean;
    hasStoredApiKey: boolean;
    maskedStoredApiKey: string;
    isEditingApiKey: boolean;
    connectionTestStatus: 'idle' | 'testing';
  };
  actions: {
    changeApiKey: (value: string) => void;
    toggleShowKey: () => void;
    startEdit: () => void;
    cancelEdit: () => void;
    saveKey: () => void | Promise<void>;
    testConnection?: () => void;
  };
};

export function BYOKApiKeyEditor({
  state,
  actions,
}: BYOKApiKeyEditorProps) {
  const {
    apiKey,
    showKey,
    hasStoredApiKey,
    maskedStoredApiKey,
    isEditingApiKey,
    connectionTestStatus,
  } = state;
  const isTestingConnection = connectionTestStatus === 'testing';
  const appText = useSemanticColor('appText');
  const appMuted = useSemanticColor('appMuted');
  const hasAnyKey = Boolean(apiKey.trim() || hasStoredApiKey);

  return (
    <>
      <View className="mb-4">
        <Text className="text-xs font-bold text-app-muted mb-2 uppercase tracking-tight">
          API 키
        </Text>
        {hasStoredApiKey && !isEditingApiKey ? (
          <View className="rounded-lg bg-app-bg/50 px-3.5 py-3">
            <Text className="text-xs text-app-subtle font-medium mb-3">
              저장된 키: {maskedStoredApiKey}
            </Text>
            <Button onPress={actions.startEdit} variant="outline">
              <Text>API 키 변경</Text>
            </Button>
          </View>
        ) : (
          <View>
            <View className="relative">
              <Input
                accessibilityLabel="API 키"
                className="pr-12"
                placeholder="새 API 키를 입력하세요"
                value={apiKey}
                onChangeText={actions.changeApiKey}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showKey ? 'API 키 숨기기' : 'API 키 표시'}
                className="absolute right-0 top-0 bottom-0 min-w-11 px-4 justify-center"
                onPress={actions.toggleShowKey}
              >
                {showKey ? (
                  <EyeOff size={16} color={appMuted} />
                ) : (
                  <Eye size={16} color={appMuted} />
                )}
              </Pressable>
            </View>
            {hasStoredApiKey && (
              <Button onPress={actions.cancelEdit} variant="ghost" className="mt-2">
                <Text>키 변경 취소</Text>
              </Button>
            )}
          </View>
        )}
      </View>

      <View className="gap-2">
        {(!hasStoredApiKey || isEditingApiKey) && (
          <Button onPress={actions.saveKey}>
            <Text>{hasStoredApiKey ? '새 API 키 저장' : 'API 키 저장'}</Text>
          </Button>
        )}

        {actions.testConnection && hasAnyKey && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="API 연결 테스트"
            accessibilityState={{
              busy: isTestingConnection,
              disabled: isTestingConnection,
            }}
            onPress={actions.testConnection}
            disabled={isTestingConnection}
            className="min-h-11 flex-row items-center justify-center rounded-md border border-app-border bg-app-bg py-2.5 active:bg-app-border/40"
          >
            {isTestingConnection ? (
              <ActivityIndicator size="small" color={appText} className="mr-2" />
            ) : (
              <Radio size={14} color={appMuted} className="mr-2" />
            )}
            <Text className="text-xs font-semibold text-app-text">
              {isTestingConnection ? '연결 확인 중...' : 'API 연결 테스트'}
            </Text>
          </Pressable>
        )}
      </View>
    </>
  );
}
