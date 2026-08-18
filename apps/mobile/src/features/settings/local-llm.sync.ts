import { Effect } from "effect";
import {
  RECOMMENDED_MODELS,
  ModelDownloader,
} from "@/src/features/ai/model-manager";
import {
  getLocalLLMStoreConfig,
  type LocalModel,
} from "@/src/stores/settings/local-llm.store";
import { setAvailableModels } from "./local-llm.commands";
import { appError, type AppError } from "@/src/lib/effect-result";

export async function syncRecommendedLocalModels(): Promise<LocalModel[]> {
  const config = getLocalLLMStoreConfig();
  const existingById = new Map(
    config.availableModels.map((model) => [model.id, model]),
  );
  const recommendedIds = new Set(RECOMMENDED_MODELS.map((model) => model.id));

  const syncedRecommendedModels: LocalModel[] = await Promise.all(
    RECOMMENDED_MODELS.map(async (model) => {
      const existing = existingById.get(model.id);
      const isDownloaded = await ModelDownloader.isModelDownloaded(
        model.filename,
        model.sizeBytes,
      ).catch(() => ModelDownloader.isModelDownloaded(model.filename));
      const size = isDownloaded
        ? ((await ModelDownloader.getModelSize(model.filename)) ??
          existing?.size)
        : existing?.size;

      return {
        id: model.id,
        name: model.name,
        family: model.family,
        repo: model.repo,
        filename: model.filename,
        downloaded: isDownloaded,
        isReady: isDownloaded,
        path: isDownloaded
          ? ModelDownloader.getModelPath(model.filename)
          : undefined,
        size: size ?? 0,
      } satisfies LocalModel;
    }),
  );

  const customModels = config.availableModels.filter(
    (model) => !recommendedIds.has(model.id),
  );
  const nextModels: LocalModel[] = [
    ...customModels,
    ...syncedRecommendedModels,
  ];

  setAvailableModels(nextModels);

  return nextModels;
}

/**
 * Effect-based version of sync recommended Local Models
 *
 * Synchronizes the list of recommended Models with the local store
 * and returns the updated model list.
 */
export function syncRecommendedLocalModelsEffect(): Effect.Effect<
  LocalModel[],
  AppError
> {
  return Effect.gen(function* (_) {
    const config = getLocalLLMStoreConfig();
    const existingById = new Map(
      config.availableModels.map((model) => [model.id, model]),
    );
    const recommendedIds = new Set(RECOMMENDED_MODELS.map((model) => model.id));

    // Sync each recommended model in parallel
    const syncedRecommendedModels = yield* _(
      Effect.all(
        RECOMMENDED_MODELS.map((model) =>
          Effect.gen(function* (_) {
            const existing = existingById.get(model.id);

            // Check if model is downloaded
            const isDownloaded = yield* _(
              Effect.tryPromise({
                try: () =>
                  ModelDownloader.isModelDownloaded(
                    model.filename,
                    model.sizeBytes,
                  ).catch(() => ModelDownloader.isModelDownloaded(model.filename)),
                catch: (e) =>
                  appError(
                    "DATABASE_ERROR",
                    "Failed to check model download status",
                    {
                      modelId: model.id,
                      cause: e,
                    },
                  ),
              }),
            );

            // Get model size if downloaded
            const size = isDownloaded
              ? yield* _(
                  Effect.tryPromise({
                    try: async () => {
                      const size = await ModelDownloader.getModelSize(
                        model.filename,
                      );
                      return size ?? existing?.size;
                    },
                    catch: (e) =>
                      appError("DATABASE_ERROR", "Failed to get model size", {
                        modelId: model.id,
                        cause: e,
                      }),
                  }),
                )
              : existing?.size;

            return {
              id: model.id,
              name: model.name,
              family: model.family,
              repo: model.repo,
              filename: model.filename,
              downloaded: isDownloaded,
              isReady: isDownloaded,
              path: isDownloaded
                ? ModelDownloader.getModelPath(model.filename)
                : undefined,
              size: size ?? 0,
            } satisfies LocalModel;
          }),
        ),
      ),
    );

    // Combine custom models with synced recommended models
    const customModels = config.availableModels.filter(
      (model) => !recommendedIds.has(model.id),
    );
    const nextModels: LocalModel[] = [
      ...customModels,
      ...syncedRecommendedModels,
    ];

    // Update the store
    setAvailableModels(nextModels);

    return nextModels;
  });
}
