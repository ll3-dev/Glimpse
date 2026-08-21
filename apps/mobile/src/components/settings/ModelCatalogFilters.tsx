import { ScrollView, Text, TextInput, Pressable, View } from "react-native";
import { Search, X } from "lucide-react-native";
import type { ModelCatalogFilter } from "./local-model-catalog";
import { useSemanticColor } from "@glimpse/ui";

type ModelCatalogFiltersProps = {
  query: string;
  activeFilter: ModelCatalogFilter;
  counts: Record<ModelCatalogFilter, number>;
  onChangeQuery: (value: string) => void;
  onChangeFilter: (value: ModelCatalogFilter) => void;
};

const FILTERS: { id: ModelCatalogFilter; label: string }[] = [
  { id: "device", label: "내 기기" },
  { id: "all", label: "전체" },
  { id: "latest", label: "2026 최신" },
  { id: "korean", label: "한국어" },
  { id: "lowbit", label: "1~2bit" },
  { id: "publisher", label: "공식 GGUF" },
];

export function ModelCatalogFilters({
  query,
  activeFilter,
  counts,
  onChangeQuery,
  onChangeFilter,
}: ModelCatalogFiltersProps) {
  const appSubtle = useSemanticColor("appSubtle");
  const appMuted = useSemanticColor("appMuted");

  return (
    <View className="gap-3">
      <View className="border-app-border bg-app-card flex-row items-center rounded-xl border px-3 py-2.5">
        <Search size={16} color={appSubtle} />
        <TextInput
          className="text-app-text ml-2.5 flex-1 text-sm"
          placeholder="모델 이름이나 용도 검색"
          placeholderTextColor={appSubtle}
          value={query}
          onChangeText={onChangeQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="검색어 지우기"
            onPress={() => onChangeQuery("")}
            className="-mr-1 p-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={14} color={appMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {FILTERS.map((filter) => {
          const selected = activeFilter === filter.id;

          return (
            <Pressable
              key={filter.id}
              accessibilityRole="button"
              accessibilityLabel={`${filter.label} ${counts[filter.id]}개`}
              accessibilityState={{ selected }}
              onPress={() => onChangeFilter(filter.id)}
              className={`min-h-11 rounded-full border px-3 py-2 ${
                selected
                  ? "border-app-text bg-app-text"
                  : "border-app-border bg-app-card"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selected ? "text-white" : "text-app-muted"
                }`}
              >
                {filter.label} {counts[filter.id]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
