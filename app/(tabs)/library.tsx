import { View, TouchableOpacity } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useState, useMemo, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Plus } from "@/src/ui/icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import {
  EmptyLibraryState,
  KnowledgeItemCard,
  LibrarySearchInput,
} from "@/src/components/library";
import { resolveLibrarySearch } from "@/src/features/library";
import { useForegroundLabeling, useKnowledgeItemsQuery } from "@/src/hooks";
import { ScreenHeader } from "@/src/ui/primitives";
import { useLocalLLMConfig } from "@/src/features/settings";

export default function LibraryScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: items } = useKnowledgeItemsQuery();
  useForegroundLabeling(items);

  const { filteredItems, emptyState } = useMemo(() => {
    return resolveLibrarySearch(items, searchQuery);
  }, [items, searchQuery]);

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="보관함"
        subtitle={`${items?.length || 0}개의 지식`}
        rightElement={
          <TouchableOpacity
            className="p-2 -mr-2"
            onPress={() => router.push('/settings')}
          >
            <Settings size={24} color="#37352f" />
          </TouchableOpacity>
        }
      />
      <LibrarySearchInput value={searchQuery} onChangeText={setSearchQuery} />

      <View className="flex-1 px-6">
        <FlashList
          data={filteredItems}
          renderItem={({ item }) => (
            <KnowledgeItemCard
              item={item}
              onPress={() => router.push(`/library/${item.id}`)}
            />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={<EmptyLibraryState {...emptyState} />}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push("/capture")}
        className="absolute right-6 w-14 h-14 rounded-full bg-black items-center justify-center shadow-lg"
        style={{ bottom: insets.bottom + 16 }}
      >
        <Plus color="white" size={30} />
      </TouchableOpacity>
    </View>
  );
}
