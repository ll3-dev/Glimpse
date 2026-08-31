import type { KnowledgeItem } from '@glimpse/shared';
import { getDisplayLabels } from '@/src/features/labeling';

export function collectAvailableKnowledgeTags(items: KnowledgeItem[] | undefined): string[] {
  const tags = new Set<string>();
  for (const item of items ?? []) {
    for (const tag of item.tags ?? []) tags.add(tag);
    for (const label of getDisplayLabels(item)) tags.add(label);
  }
  return Array.from(tags);
}
