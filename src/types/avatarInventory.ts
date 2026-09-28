export interface CustomClothingItem {
  id: string;
  name: string;
  type: 'shirt' | 'pants';
  dataUrl: string;
  previewUrl?: string;
  createdAt: number;
  creatorId?: string;
  creatorUsername?: string;
  isCreator?: boolean;
}

export const SHIRTS_INVENTORY_KEY = 'boblox_custom_shirts_v2';
export const PANTS_INVENTORY_KEY = 'boblox_custom_pants_v2';

export function isFirebaseStorageOrDeletedUrl(url?: string | null): boolean {
  if (!url) return false;
  return (
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('firebasestorage.app') ||
    url.includes('storage.googleapis.com') ||
    url.startsWith('/clothing/') ||
    url.startsWith('\\clothing\\') ||
    url.startsWith('clothing/')
  );
}

/**
 * Deduplicate clothing items by normalized name (case-insensitive) and dataUrl.
 * Keeps the newest item among duplicates.
 */
export function deduplicateCustomClothingItems(items: CustomClothingItem[]): CustomClothingItem[] {
  if (!items || items.length === 0) return [];
  const nameMap = new Map<string, CustomClothingItem>();
  const urlMap = new Map<string, CustomClothingItem>();
  const result: CustomClothingItem[] = [];

  // Sort newest first
  const sorted = [...items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  for (const item of sorted) {
    if (!item.name || !item.dataUrl) continue;
    if (isFirebaseStorageOrDeletedUrl(item.dataUrl) || isFirebaseStorageOrDeletedUrl(item.previewUrl)) {
      continue;
    }

    const normName = `${item.type}_${item.name.trim().toLowerCase()}`;
    const normUrl = item.dataUrl.trim();

    if (nameMap.has(normName) || urlMap.has(normUrl)) {
      // duplicate detected, skip older duplicate
      continue;
    }

    nameMap.set(normName, item);
    urlMap.set(normUrl, item);
    result.push(item);
  }

  return result;
}

export function getSavedShirtsInventory(): CustomClothingItem[] {
  try {
    const raw = localStorage.getItem(SHIRTS_INVENTORY_KEY);
    if (raw) {
      const list: CustomClothingItem[] = JSON.parse(raw);
      const deduplicated = deduplicateCustomClothingItems(list);
      if (deduplicated.length !== list.length) {
        localStorage.setItem(SHIRTS_INVENTORY_KEY, JSON.stringify(deduplicated));
      }
      return deduplicated;
    }
  } catch (e) {
    console.error('Failed to load shirts inventory:', e);
  }
  return [];
}

export function saveShirtToInventory(item: CustomClothingItem) {
  try {
    const current = getSavedShirtsInventory();
    const updated = deduplicateCustomClothingItems([item, ...current.filter((i) => i.id !== item.id)]);
    localStorage.setItem(SHIRTS_INVENTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save shirt to inventory:', e);
    return [];
  }
}

export function saveMultipleShirtsToInventory(items: CustomClothingItem[]) {
  if (!items || items.length === 0) return getSavedShirtsInventory();
  try {
    const current = getSavedShirtsInventory();
    const updated = deduplicateCustomClothingItems([...items, ...current]);
    localStorage.setItem(SHIRTS_INVENTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to batch save shirts:', e);
    return getSavedShirtsInventory();
  }
}

export function getSavedPantsInventory(): CustomClothingItem[] {
  try {
    const raw = localStorage.getItem(PANTS_INVENTORY_KEY);
    if (raw) {
      const list: CustomClothingItem[] = JSON.parse(raw);
      const deduplicated = deduplicateCustomClothingItems(list);
      if (deduplicated.length !== list.length) {
        localStorage.setItem(PANTS_INVENTORY_KEY, JSON.stringify(deduplicated));
      }
      return deduplicated;
    }
  } catch (e) {
    console.error('Failed to load pants inventory:', e);
  }
  return [];
}

export function savePantsToInventory(item: CustomClothingItem) {
  try {
    const current = getSavedPantsInventory();
    const updated = deduplicateCustomClothingItems([item, ...current.filter((i) => i.id !== item.id)]);
    localStorage.setItem(PANTS_INVENTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save pants to inventory:', e);
    return [];
  }
}

export function saveMultiplePantsToInventory(items: CustomClothingItem[]) {
  if (!items || items.length === 0) return getSavedPantsInventory();
  try {
    const current = getSavedPantsInventory();
    const updated = deduplicateCustomClothingItems([...items, ...current]);
    localStorage.setItem(PANTS_INVENTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to batch save pants:', e);
    return getSavedPantsInventory();
  }
}

