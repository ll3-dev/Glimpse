import { Effect } from 'effect';
import type { StoredItem } from './types';

const STORAGE_KEY = 'glimpse-knowledge-items';

function loadItemsFromStorage(): StoredItem[] {
  const effect = Effect.try({
    try: () => {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? (JSON.parse(data) as StoredItem[]) : [];
    },
    catch: () => [] as StoredItem[],
  });

  return Effect.runSync(effect);
}

export function saveItems(items: StoredItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

let currentItems: StoredItem[] = loadItemsFromStorage();

export function reloadItems(): StoredItem[] {
  currentItems = loadItemsFromStorage();
  return currentItems;
}

export function getItems(): StoredItem[] {
  return currentItems;
}

export function setItems(items: StoredItem[]): void {
  currentItems = items;
}
