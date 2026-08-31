import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  SquarePen,
  MessageCircle,
  Sparkles,
  Brain,
  FileText,
  Compass,
} from 'lucide-react-native';
import {
  useConversationsQuery,
  useMessagesQuery,
  useKnowledgeItemsQuery,
} from "@/src/hooks";
import {
  ChatMessage,
  ChatInput,
  ContextBadge,
  ChatStreamingMessage,
  ChatDetailDialogs,
} from "@/src/components/chat";
import { ConversationIcon } from "@/src/components/chat/chatConversationIcons";
import { useChat } from '@/src/hooks/chat/useChat';
import { useChatAISetup } from "@/src/hooks/chat/useChatAISetup";
import { useMessageActions } from "@/src/hooks/chat/useMessageActions";
import { useConversationActions } from "@/src/hooks/chat/useConversationActions";
import { useChatNavigation } from "@/src/hooks/chat/useChatNavigation";
import { ScreenHeader } from "@glimpse/ui/primitives/screen-header";
import { EmptyState } from "@glimpse/ui/primitives/empty-state";
import { useSemanticColor } from "@glimpse/ui";
import * as Haptics from 'expo-haptics';

export default function ChatDetailScreen() {
  const { id, contextItem: contextItemId } = useLocalSearchParams<{ id: string; contextItem?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const appText = useSemanticColor("appText");

  const { data: conversations } = useConversationsQuery();
  const { data: messages, isLoading: isLoadingMessages } = useMessagesQuery(id);
  const { data: knowledgeItems } = useKnowledgeItemsQuery();
  const conversation = conversations?.find((item) => item.id === id) ?? null;

  const effectiveContextItemId = contextItemId ?? conversation?.contextItemId ?? undefined;
  const contextItem = effectiveContextItemId && knowledgeItems
    ? knowledgeItems.find((item) => item.id === effectiveContextItemId)
    : null;

  const { sendMessage, isGenerating, streamingText, error, abortAndSave } =
    useChat({
      conversationId: id,
      contextItem,
      knowledgeItems,
    });

  // AI Setup
  const aiSetup = useChatAISetup({
    conversationId: id,
    onNavigateBack: () => router.back(),
    onNavigateToSettings: () =>
      router.push({
        pathname: "/settings",
        params: { returnTo: `/chat/${id}` },
      }),
  });

  // Message actions
  const messageActions = useMessageActions({ conversationId: id });

  // Conversation actions
  const conversationActions = useConversationActions({
    conversationId: id,
    onNavigateBack: () => router.back(),
  });

  // Navigation & scroll
  const {
    scrollViewRef,
    ...navigation
  } = useChatNavigation({
    isGenerating,
    messages,
    streamingText,
    onAbortAndSave: abortAndSave,
    onNavigateBack: () => router.back(),
  });

  const handleSend = async (text: string) => {
    const ready = await aiSetup.ensureReady();
    if (!ready) return false;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const didSend = await sendMessage(text);
    if (didSend) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    return didSend;
  };

  const conversationTitle = conversation?.title?.trim() || "새 대화";

  return (
    <View className="bg-app-bg flex-1" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title={conversationTitle}
        icon={
          conversation?.icon ? (
            <ConversationIcon icon={conversation.icon} size={18} color={appText} />
          ) : undefined
        }
        leftElement={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="대화 목록으로 돌아가기"
            onPress={() => navigation.handleBackPress()}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-app-border/40"
          >
            <ChevronLeft size={20} color={appText} />
          </Pressable>
        }
        rightElement={
          conversation ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="대화 정보 편집"
              onPress={conversationActions.handleOpenEditModal}
              className="h-10 w-10 items-center justify-center rounded-full bg-app-border/40 active:opacity-70"
            >
              <SquarePen size={17} color={appText} />
            </Pressable>
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Context badge */}
        {contextItem && (
          <View className="pb-2">
            <ContextBadge item={contextItem} />
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 20,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {isLoadingMessages && (
            <View className="flex-1 items-center justify-center py-8">
              <Text className="text-app-muted text-sm">로딩 중...</Text>
            </View>
          )}

          {!isLoadingMessages && messages && messages.length > 0 && (
            <>
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onEdit={messageActions.handleEdit}
                  onDelete={messageActions.handleDelete}
                />
              ))}
            </>
          )}

          {!isLoadingMessages && (!messages || messages.length === 0) && (
            <View className="flex-1">
              <EmptyState
                icon={MessageCircle}
                compact
                title={
                  contextItem
                    ? "이 항목에 대해 질문해 보세요"
                    : "메시지를 입력해 대화를 시작하세요"
                }
              />

              {/* Starter Prompt Chips */}
              <View className="w-full gap-2 px-6">
                {contextItem ? (
                  <>
                    <Pressable
                      onPress={() => void handleSend("이 항목의 핵심 내용을 세 줄로 요약해줘")}
                      className="flex-row items-center p-3 rounded-xl bg-app-surface border border-app-border active:bg-app-bg"
                    >
                      <FileText size={15} color={appText} style={{ marginRight: 10 }} />
                      <Text className="text-xs font-medium text-app-text flex-1">
                        이 항목의 핵심 내용을 세 줄로 요약해줘
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleSend("이 항목과 연관될 만한 아이디어나 지식을 제안해줘")}
                      className="flex-row items-center p-3 rounded-xl bg-app-surface border border-app-border active:bg-app-bg"
                    >
                      <Compass size={15} color={appText} style={{ marginRight: 10 }} />
                      <Text className="text-xs font-medium text-app-text flex-1">
                        이 항목과 연관될 만한 아이디어 제안해줘
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      onPress={() => void handleSend("최근 저장한 지식들의 주요 흐름을 요약해줘")}
                      className="flex-row items-center p-3 rounded-xl bg-app-surface border border-app-border active:bg-app-bg"
                    >
                      <FileText size={15} color={appText} style={{ marginRight: 10 }} />
                      <Text className="text-xs font-medium text-app-text flex-1">
                        최근 저장한 지식들의 주요 흐름을 요약해줘
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleSend("오늘 복습할 내용 중에서 3문제 퀴즈를 내줘")}
                      className="flex-row items-center p-3 rounded-xl bg-app-surface border border-app-border active:bg-app-bg"
                    >
                      <Brain size={15} color={appText} style={{ marginRight: 10 }} />
                      <Text className="text-xs font-medium text-app-text flex-1">
                        오늘 복습할 내용으로 3문제 퀴즈 내줘
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleSend("보관함 지식 간의 숨겨진 연결점을 찾아줘")}
                      className="flex-row items-center p-3 rounded-xl bg-app-surface border border-app-border active:bg-app-bg"
                    >
                      <Sparkles size={15} color={appText} style={{ marginRight: 10 }} />
                      <Text className="text-xs font-medium text-app-text flex-1">
                        보관함 지식 간의 숨겨진 연결점 찾아줘
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Streaming response */}
          {isGenerating && (
            <ChatStreamingMessage content={streamingText} />
          )}
        </ScrollView>

        {/* Error */}
        {error && (
          <View className="px-6 pb-2">
            <View className="rounded-lg bg-app-surface border border-app-border px-3.5 py-2.5">
              <Text className="text-xs text-app-accent font-medium">{error}</Text>
            </View>
          </View>
        )}

        {/* Input */}
        <ChatInput onSend={handleSend} isLoading={isGenerating} />

        {/* Modals & Dialogs */}
        <ChatDetailDialogs
          aiSetup={aiSetup}
          conversation={conversation}
          conversationActions={conversationActions}
          messageActions={messageActions}
          navigation={navigation}
        />

      </KeyboardAvoidingView>
    </View>
  );
}
