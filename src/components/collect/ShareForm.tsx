import { ScrollView, TextInput, View, Text, Image as RNImage, Linking, Pressable } from 'react-native';
import { Effect } from 'effect';
import { appError, tryPromise } from '@/src/lib/effect-result';
import { Link, FileText, Image } from '@/src/ui/icons';
import { type SharedContent } from '@/src/features/capture';

type ShareFormProps = {
  sharedContent: SharedContent;
  editedTitle: string;
  editedBody: string;
  bottomInset: number;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
};

export function ShareForm({
  sharedContent,
  editedTitle,
  editedBody,
  bottomInset,
  onChangeTitle,
  onChangeBody,
}: ShareFormProps) {
  const hasContent =
    sharedContent.text || sharedContent.url || sharedContent.imageUri;

  const handleOpenUrl = async () => {
    if (!sharedContent.url) return;

    const program = Effect.gen(function* () {
      const supported = yield* tryPromise(
        () => Linking.canOpenURL(sharedContent.url as string),
        (error) => appError('UNKNOWN_ERROR', 'Failed to check URL support', error)
      );
      if (!supported) {
        return;
      }

      yield* tryPromise(
        () => Linking.openURL(sharedContent.url as string),
        (error) => appError('UNKNOWN_ERROR', 'Failed to open URL', error)
      );
    });

    await Effect.runPromise(program);
  };

  const getContentTypeLabel = () => {
    if (sharedContent.imageUri) return '이미지';
    if (sharedContent.url) return '링크';
    if (sharedContent.text) return '텍스트';
    return '공유 콘텐츠';
  };

  const getContentTypeIcon = () => {
    if (sharedContent.imageUri) return <Image size={16} className="text-muted-foreground" />;
    if (sharedContent.url) return <Link size={16} className="text-muted-foreground" />;
    return <FileText size={16} className="text-muted-foreground" />;
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingHorizontal: 24, // px-6
        paddingTop: 20,
        paddingBottom: bottomInset + 100,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {!hasContent ? (
        <View className="items-center justify-center py-12">
          <View className="mb-4 rounded-md bg-app-border/30 p-4">
            <Link size={32} color="#787774" />
          </View>
          <Text className="mb-2 text-lg font-bold text-app-text">
            공유 대기 중
          </Text>
          <Text className="text-center text-sm font-medium text-app-muted">
            다른 앱에서 공유 버튼을 눌러{"\n"}Glimpse로 내용을 보내세요
          </Text>
        </View>
      ) : (
        <>
          {/* 수신된 콘텐츠 미리보기 */}
          <View className="mb-6 rounded-md border border-app-border bg-white p-4">
            <View className="mb-3 flex-row items-center gap-2">
              <View className="p-1 rounded bg-app-border/30">
                {getContentTypeIcon()}
              </View>
              <Text className="text-xs font-bold text-app-muted uppercase tracking-tight">
                {getContentTypeLabel()} 수신됨
              </Text>
            </View>

            {sharedContent.imageUri && (
              <RNImage
                source={{ uri: sharedContent.imageUri }}
                className="mb-3 h-45 w-full rounded-md"
                resizeMode="cover"
              />
            )}

            {sharedContent.url && (
              <Pressable onPress={handleOpenUrl} className="mb-2">
                <Text
                  className="text-sm text-app-primary underline"
                  numberOfLines={1}
                >
                  {sharedContent.url}
                </Text>
              </Pressable>
            )}

            {sharedContent.text && !sharedContent.url && (
              <Text
                className="text-sm leading-5 text-app-text"
                numberOfLines={5}
              >
                {sharedContent.text}
              </Text>
            )}
          </View>

          {/* 제목 입력 */}
          <Text className="mb-2 text-sm font-semibold text-app-muted">
            제목 (선택)
          </Text>
          <View className="mb-4 flex-row items-center rounded-md border border-app-border bg-white px-4">
            <TextInput
              className="flex-1 py-3 text-base text-app-text"
              value={editedTitle}
              onChangeText={onChangeTitle}
              placeholder="제목을 입력하세요..."
              placeholderTextColor="#d3d2d1"
              multiline={false}
            />
          </View>

          {/* 본문 편집 */}
          <Text className="mb-2 text-sm font-semibold text-app-muted">
            본문
          </Text>
          <View className="min-h-37.5 rounded-md border border-app-border bg-white p-4">
            <TextInput
              className="text-base leading-6 text-app-text"
              value={editedBody}
              onChangeText={onChangeBody}
              placeholder="내용을 편집하세요..."
              placeholderTextColor="#d3d2d1"
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}
