import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getAllKnowledgeItems,
  type GetItemsFailureResult,
} from "@/src/features/library";
import {
  EmptyLibraryState,
  KnowledgeItemCard,
  LibraryHeader,
  LibrarySearchInput,
} from "@/src/components/library";
import {
  filterKnowledgeItems,
  parseQueryToKeyword,
} from "@/src/features/search";

export default function LibraryScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const insets = useSafeAreaInsets();

  const { data: items } = useQuery({
    queryKey: ["knowledgeItems"],
    queryFn: async () => {
      const result = await getAllKnowledgeItems();
      if (!result.success)
        throw new Error((result as GetItemsFailureResult).error.message);
      return result.data;
    },
  });

  const filteredItems = useMemo(() => {
    if (!items) return [];
    const keyword = parseQueryToKeyword(searchQuery);
    return filterKnowledgeItems(items, keyword);
  }, [items, searchQuery]);

  return (
    <View className="flex-1 bg-app-bg" style={{ paddingTop: insets.top }}>
      <LibraryHeader totalCount={items?.length || 0} />
      <LibrarySearchInput value={searchQuery} onChangeText={setSearchQuery} />

      <View className="flex-1 px-6">
        <FlashList
          data={filteredItems}
          renderItem={({ item }) => <KnowledgeItemCard item={item} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={<EmptyLibraryState />}
        />
      </View>
    </View>
  );
}
