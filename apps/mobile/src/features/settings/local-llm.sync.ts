import {
  RECOMMENDED_MODELS,
  ModelDownloader,
} from '@/src/features/ai/model-manager';
import {
  getLocalLLMStoreConfig,
  type LocalModel,
} from '@/src/stores/settings/local-llm.store';
import { setAvailableModels } from './local-llm.commands';

export async function syncRecommendedLocalModels(): Promise<LocalModel[]> {
  const config = getLocalLLMStoreConfig();
  const existingById = new Map(config.availableModels.map((model) => [model.id, model]));
  const recommendedIds = new Set(RECOMMENDED_MODELS.map((model) => model.id));

  const syncedRecommendedModels = await Promise.all(
    RECOMMENDED_MODELS.map(async (model) => {
      const existing = existingById.get(model.id);
      const isDownloaded = await ModelDownloader.isModelDownloaded(model.filename);
      const size = isDownloaded
        ? (await ModelDownloader.getModelSize(model.filename)) ?? existing?.size
        : existing?.size;

      return {
        id: model.id,
        name: model.name,
        family: model.family,
        repo: model.repo,
        filename: model.filename,
        isReady: isDownloaded,
        path: isDownloaded ? ModelDownloader.getModelPath(model.filename) : undefined,
        size,
      } satisfies LocalModel;
    })
  );

  const customModels = config.availableModels.filter((model) => !recommendedIds.has(model.id));
  const nextModels = [...customModels, ...syncedRecommendedModels];

  setAvailableModels(nextModels);

  return nextModels;
}
