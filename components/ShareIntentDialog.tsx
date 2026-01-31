import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useShareIntent, ShareIntentData } from "@/hooks/useShareIntent";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { FileImage, FileText, Link as LinkIcon } from "lucide-react-native";

function getDefaultTitle(data: ShareIntentData | null): string {
  if (!data) return "";

  if (data.files && data.files.length > 0) {
    if (data.files.length === 1) {
      return data.files[0].fileName;
    }
    return `${data.files.length} files shared`;
  }
  if (data.url) {
    try {
      const url = new URL(data.url);
      return url.hostname;
    } catch {
      return "Shared Link";
    }
  }
  if (data.text) {
    const firstLine = data.text.split("\n")[0];
    return firstLine.slice(0, 50);
  }
  return "Shared content";
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <FileImage size={20} className="text-foreground" />;
  }
  return <FileText size={20} className="text-foreground" />;
}

function isImage(mimeType: string | undefined): boolean {
  return mimeType?.startsWith("image/") ?? false;
}

export function ShareIntentDialog() {
  const { hasShareIntent, shareIntent, saveSharedContent, dismiss } =
    useShareIntent();
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const hasShownModal = useRef(false);

  useEffect(() => {
    if (hasShareIntent && !hasShownModal.current) {
      hasShownModal.current = true;
      setTitle(getDefaultTitle(shareIntent));
    }
  }, [hasShareIntent, shareIntent]);

  const handleSave = async () => {
    if (!shareIntent) return;

    setIsSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const newGlint = await saveSharedContent(title);
      dismiss();
      // Navigate to the new glint
      if (newGlint) {
        router.push(`/glint/${newGlint.id}`);
      }
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dismiss();
  };

  if (!hasShareIntent) return null;

  const hasText = !!shareIntent?.text || !!shareIntent?.url;
  const hasFiles = shareIntent?.files && shareIntent.files.length > 0;
  const hasImages =
    shareIntent?.files?.some((f) => isImage(f.mimeType)) ?? false;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={hasShareIntent}
      onRequestClose={handleDismiss}
    >
      <Pressable
        onPress={handleDismiss}
        className="flex-1 justify-end bg-black/50"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full rounded-t-3xl bg-background p-6 pb-12 shadow-lg"
        >
          <View className="mb-4">
            <View className="mb-4 h-1 w-12 self-center rounded-full bg-muted" />
            <Text className="mb-2 text-2xl font-bold text-foreground">
              New Glint
            </Text>
            <Text className="mb-4 text-muted-foreground">
              Something was shared with Glimpse
            </Text>
          </View>

          {/* Title Input */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              Title
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter a title..."
              placeholderTextColor="#888888"
              className="rounded-xl bg-muted px-4 py-3 text-base text-foreground"
            />
          </View>

          {/* Shared Content Preview */}
          {(hasText || hasFiles) && (
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-muted-foreground">
                Content
              </Text>

              {/* URL */}
              {shareIntent?.url && (
                <View className="mb-2 flex-row items-center gap-3 rounded-xl bg-muted px-4 py-3">
                  <LinkIcon size={18} className="text-muted-foreground" />
                  <Text className="flex-1 text-sm text-blue-400" numberOfLines={2}>
                    {shareIntent.url}
                  </Text>
                </View>
              )}

              {/* Text */}
              {shareIntent?.text && (
                <View className="mb-2 rounded-xl bg-muted px-4 py-3">
                  <Text className="text-sm text-foreground" numberOfLines={4}>
                    {shareIntent.text}
                  </Text>
                </View>
              )}

              {/* Files */}
              {hasFiles && (
                <ScrollView
                  horizontal={hasImages}
                  showsHorizontalScrollIndicator={false}
                  className={hasImages ? "flex-row gap-2" : ""}
                >
                  {shareIntent.files?.map((file, index) => (
                    <View
                      key={index}
                      className={hasImages ? "" : "mb-2"}
                      style={
                        hasImages
                          ? {}
                          : { width: "100%", flexDirection: "row" }
                      }
                    >
                      {isImage(file.mimeType) ? (
                        <Image
                          source={{ uri: file.filePath }}
                          className="h-24 w-24 rounded-xl bg-muted"
                          contentFit="cover"
                        />
                      ) : (
                        <View className="flex-row items-center gap-3 rounded-xl bg-muted px-4 py-3">
                          {getFileIcon(file.mimeType)}
                          <View className="flex-1">
                            <Text
                              className="text-sm text-foreground"
                              numberOfLines={1}
                            >
                              {file.fileName}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                              {file.mimeType}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Buttons */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={handleDismiss}
              className="flex-1 items-center rounded-xl bg-muted px-4 py-4"
            >
              <Text className="font-semibold text-foreground">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={isSaving || !title.trim()}
              className="flex-1 items-center rounded-xl bg-foreground px-4 py-4 disabled:opacity-50"
            >
              <Text className="font-semibold text-background">
                {isSaving ? "Saving..." : "Save"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
