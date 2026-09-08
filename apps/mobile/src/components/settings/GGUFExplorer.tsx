import { useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { Check, Download, Search, Telescope } from "lucide-react-native";
import { Card, Text } from "@glimpse/ui/primitives";
import { useSemanticColor } from "@glimpse/ui";
import { useLocalLLMConfig } from "@/src/features/settings";
import {
  formatBytes,
  formatDownloadCount,
  listRepoGGUFFiles,
  searchGGUFRepos,
  type GGUFFileEntry,
  type GGUFRepoSearchResult,
} from "@/src/features/ai/model-manager/huggingface-search";
import { downloadCustomGGUF } from "@/src/features/settings/local-llm.custom-download";

/**
 * GGUF 탐색기 — 카탈로그에 없는 커뮤니티 GGUF를 HuggingFace에서
 * 검색해 바로 다운로드한다. 받은 모델은 커스텀 모델로 등록되어
 * 채팅·라벨링 타깃이 된다.
 */

export function GGUFExplorer() {
  const appText = useSemanticColor("appText");
  const appMuted = useSemanticColor("appMuted");
  const appAccent = useSemanticColor("appAccent");
  // zustand 5 셀렉터는 안정 참조를 반환해야 한다 — 객체 리터럴을 만들면
  // useSyncExternalStore의 Object.is 비교가 매번 실패해 무한 재렌더링으로
  // JS 스레드가 굳는다(release에서 UI 프리즈). 필드별로 선택한다.
  const availableModels = useLocalLLMConfig((config) => config.availableModels);
  const downloadStatus = useLocalLLMConfig((config) => config.downloadStatus);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<GGUFRepoSearchResult[]>([]);
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);
  const [files, setFiles] = useState<GGUFFileEntry[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const isBusy = downloadStatus === "downloading";

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed || searching) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    setExpandedRepo(null);
    try {
      setResults(await searchGGUFRepos(trimmed));
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "검색 실패");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectRepo = async (repoId: string) => {
    if (expandedRepo === repoId) {
      setExpandedRepo(null);
      return;
    }
    setExpandedRepo(repoId);
    setFiles([]);
    setFilesError(null);
    setFilesLoading(true);
    try {
      setFiles(await listRepoGGUFFiles(repoId));
    } catch (error) {
      setFilesError(error instanceof Error ? error.message : "조회 실패");
    } finally {
      setFilesLoading(false);
    }
  };

  const handleDownload = async (repoId: string, file: GGUFFileEntry) => {
    if (isBusy || downloadingFile) return;
    setDownloadingFile(file.filename);
    try {
      await downloadCustomGGUF(repoId, file);
    } finally {
      setDownloadingFile(null);
    }
  };

  const isFileReady = (filename: string) =>
    availableModels.some(
      (model) => model.filename === filename && model.isReady,
    );

  return (
    <Card className="mt-6 rounded-2xl border border-app-border bg-app-surface p-4">
      <View className="flex-row items-center gap-2">
        <Telescope size={16} color={appMuted} />
        <Text className="text-app-text text-sm font-semibold">GGUF 탐색</Text>
      </View>
      <Text className="text-app-muted mt-1 text-[11px] leading-4">
        HuggingFace에서 커뮤니티 GGUF를 검색해 바로 받습니다. 받은 모델은
        로컬 모델로 등록됩니다.
      </Text>

      <View className="mt-3 flex-row items-center gap-2">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="예: gemma 3n gguf"
          placeholderTextColor={appMuted}
          returnKeyType="search"
          onSubmitEditing={() => void handleSearch()}
          accessibilityLabel="GGUF 검색어"
          className="h-10 flex-1 rounded-lg border border-app-border bg-app-bg px-3 text-sm text-app-text"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="GGUF 검색"
          onPress={() => void handleSearch()}
          disabled={searching || !query.trim()}
          className="h-10 w-10 items-center justify-center rounded-lg bg-app-bg active:opacity-70"
        >
          {searching ? (
            <ActivityIndicator size="small" color={appText} />
          ) : (
            <Search size={16} color={appText} />
          )}
        </Pressable>
      </View>

      {searchError && (
        <Text className="text-app-accent mt-2 text-[11px]">{searchError}</Text>
      )}

      {results.length > 0 && (
        <View className="mt-3 gap-2">
          {results.map((repo) => {
            const expanded = expandedRepo === repo.repoId;
            return (
              <View
                key={repo.repoId}
                className="rounded-lg border border-app-border p-2.5"
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${repo.repoId} 파일 목록`}
                  onPress={() => void handleSelectRepo(repo.repoId)}
                  className="flex-row items-center active:opacity-70"
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-app-text text-xs font-semibold" numberOfLines={1}>
                      {repo.repoId}
                    </Text>
                    <Text className="text-app-muted mt-0.5 text-[10px]">
                      받기 {formatDownloadCount(repo.downloads)}
                      {repo.lastModified
                        ? ` · ${repo.lastModified.slice(0, 10)}`
                        : ""}
                    </Text>
                  </View>
                  <Text className="text-app-accent text-[11px] font-semibold">
                    {expanded ? "닫기" : "파일"}
                  </Text>
                </Pressable>

                {expanded && filesLoading && (
                  <View className="mt-2 flex-row items-center gap-2">
                    <ActivityIndicator size="small" color={appMuted} />
                    <Text className="text-app-muted text-[11px]">파일 조회 중…</Text>
                  </View>
                )}
                {expanded && filesError && (
                  <Text className="text-app-accent mt-2 text-[11px]">{filesError}</Text>
                )}
                {expanded && !filesLoading && (
                  <View className="mt-2 gap-1.5">
                    {files.map((file) => {
                      const ready = isFileReady(file.filename);
                      return (
                        <View
                          key={file.filename}
                          className="flex-row items-center gap-2 rounded-md bg-app-bg/60 px-2 py-1.5"
                        >
                          <View className="flex-1 pr-2">
                            <Text className="text-app-text text-[11px]" numberOfLines={1}>
                              {file.filename}
                            </Text>
                            <Text className="text-app-muted text-[10px]">
                              {formatBytes(file.sizeBytes)}
                              {file.isVisionProjector ? " · 비전 프로젝터" : ""}
                            </Text>
                          </View>
                          {ready ? (
                            <View className="flex-row items-center gap-1">
                              <Check size={12} color={appAccent} />
                              <Text className="text-app-accent text-[11px] font-semibold">
                                준비됨
                              </Text>
                            </View>
                          ) : (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`${file.filename} 다운로드`}
                              onPress={() => void handleDownload(repo.repoId, file)}
                              disabled={isBusy || downloadingFile !== null}
                              className="p-1.5"
                            >
                              {downloadingFile === file.filename || isBusy ? (
                                <ActivityIndicator size="small" color={appText} />
                              ) : (
                                <Download size={16} color={appText} />
                              )}
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                    {files.length === 0 && !filesError && (
                      <Text className="text-app-muted text-[11px]">
                        GGUF 파일이 없습니다.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {results.length === 0 && !searching && !searchError && (
        <Text className="text-app-muted mt-2 text-[11px]">
          I1_S·exl2 같은 전용 포맷은 받지 말고 .gguf 파일을 선택하세요.
        </Text>
      )}
    </Card>
  );
}
