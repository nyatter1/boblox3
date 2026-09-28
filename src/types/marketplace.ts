import { collection, doc, setDoc, onSnapshot, updateDoc, increment, deleteDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { getSeedMarketplaceItems } from '../utils/marketplaceClothingSeeds';
import {
  saveShirtToInventory,
  savePantsToInventory,
  getSavedShirtsInventory,
  getSavedPantsInventory,
  isFirebaseStorageOrDeletedUrl,
} from './avatarInventory';

export interface MarketplaceClothingItem {
  id: string;
  name: string;
  type: 'shirt' | 'pants';
  dataUrl: string; // The 585x559 texture template
  previewUrl?: string; // 2D front preview
  creatorId: string;
  creatorUsername: string;
  price: number; // 0 for free
  boughtCount: number; // number of times acquired
  onSale: boolean;
  createdAt: number;
}

export const MARKETPLACE_STORAGE_KEY = 'boblox_marketplace_items_v3';

let memoryCache: MarketplaceClothingItem[] | null = null;

/**
 * Deduplicate Marketplace Items by normalized name (case-insensitive) and dataUrl.
 * Keeps the newest/best item and automatically deletes duplicate documents from Firestore.
 */
export function deduplicateMarketplaceItems(
  items: MarketplaceClothingItem[],
  deleteRemoteDuplicates: boolean = false
): MarketplaceClothingItem[] {
  if (!items || items.length === 0) return [];
  const nameMap = new Map<string, MarketplaceClothingItem>();
  const urlMap = new Map<string, MarketplaceClothingItem>();
  const duplicateDocIds: string[] = [];
  const uniqueItems: MarketplaceClothingItem[] = [];

  // Sort by createdAt descending (newest first)
  const sorted = [...items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  for (const item of sorted) {
    if (!item.name || !item.dataUrl) continue;
    if (isFirebaseStorageOrDeletedUrl(item.dataUrl) || isFirebaseStorageOrDeletedUrl(item.previewUrl)) {
      duplicateDocIds.push(item.id);
      continue;
    }

    const normName = `${item.type}_${item.name.trim().toLowerCase()}`;
    const normUrl = item.dataUrl.trim();

    if (nameMap.has(normName) || urlMap.has(normUrl)) {
      // It's a duplicate of an existing newer or already registered item!
      duplicateDocIds.push(item.id);
      continue;
    }

    nameMap.set(normName, item);
    urlMap.set(normUrl, item);
    uniqueItems.push(item);
  }

  // Asynchronously clean duplicate items from Firestore if requested
  if (deleteRemoteDuplicates && duplicateDocIds.length > 0) {
    duplicateDocIds.forEach((dupId) => {
      deleteDoc(doc(db, 'marketplace_items', dupId)).catch(() => {});
    });
  }

  return uniqueItems;
}

export async function getSavedMarketplaceItems(): Promise<MarketplaceClothingItem[]> {
  if (memoryCache && memoryCache.length > 0) {
    return deduplicateMarketplaceItems(memoryCache);
  }

  let baseItems: MarketplaceClothingItem[] = [];

  // 1. Try LocalStorage for instant render
  try {
    const raw = localStorage.getItem(MARKETPLACE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        baseItems = parsed.filter(
          (item: MarketplaceClothingItem) =>
            !isFirebaseStorageOrDeletedUrl(item.dataUrl) && !isFirebaseStorageOrDeletedUrl(item.previewUrl)
        );
      }
    }
  } catch (e) {
    console.error('Failed to load local marketplace:', e);
  }

  // 2. Fetch directly from Firestore collection for fresh devices/Render builds
  try {
    const snap = await getDocs(collection(db, 'marketplace_items'));
    if (!snap.empty) {
      const remoteDocs = snap.docs
        .map((d) => d.data() as MarketplaceClothingItem)
        .filter(
          (item) => !isFirebaseStorageOrDeletedUrl(item.dataUrl) && !isFirebaseStorageOrDeletedUrl(item.previewUrl)
        );
      if (remoteDocs.length > 0) {
        baseItems = [...remoteDocs, ...baseItems];
      }
    }
  } catch (err) {
    // offline or Firestore connecting
  }

  // 3. Fallback seeds if completely empty
  if (baseItems.length === 0) {
    const seeds = await getSeedMarketplaceItems();
    baseItems = seeds;
  }

  // Ensure deduplication & clean items
  const deduplicated = deduplicateMarketplaceItems(baseItems, false);

  memoryCache = deduplicated;
  try {
    localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(deduplicated));
  } catch (e) {
    // ignore
  }
  return deduplicated;
}

export function saveLocalMarketplaceItems(items: MarketplaceClothingItem[]) {
  const cleanItems = deduplicateMarketplaceItems(items);
  memoryCache = cleanItems;
  try {
    localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(cleanItems));
  } catch (e) {
    console.error('Failed to cache marketplace items:', e);
  }
}

/**
 * Batch publish multiple clothing items into marketplace and Firestore
 */
export async function publishMultipleItemsToMarketplace(
  newItems: MarketplaceClothingItem[]
): Promise<MarketplaceClothingItem[]> {
  if (!newItems || newItems.length === 0) return await getSavedMarketplaceItems();

  try {
    const current = await getSavedMarketplaceItems();
    const merged = [...newItems, ...current];
    const deduplicated = deduplicateMarketplaceItems(merged, true);
    
    saveLocalMarketplaceItems(deduplicated);

    // Sync every item directly to Firestore
    try {
      const promises = deduplicated.map((item) => {
        const itemRef = doc(db, 'marketplace_items', item.id);
        return setDoc(itemRef, item, { merge: true });
      });
      await Promise.allSettled(promises);
    } catch (e) {
      console.warn('Firestore marketplace batch sync note:', e);
    }

    // Trigger window event so listeners update immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('boblox-marketplace-updated', { detail: { count: deduplicated.length } }));
    }

    return deduplicated;
  } catch (err) {
    console.error('Failed to batch publish items:', err);
    return [];
  }
}

/**
 * Publish clothing item into marketplace
 */
export async function publishItemToMarketplace(item: MarketplaceClothingItem) {
  try {
    const current = await getSavedMarketplaceItems();
    const merged = [item, ...current.filter((i) => i.id !== item.id)];
    const deduplicated = deduplicateMarketplaceItems(merged, true);
    saveLocalMarketplaceItems(deduplicated);

    // Sync to Firestore
    const itemRef = doc(db, 'marketplace_items', item.id);
    await setDoc(itemRef, item, { merge: true });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('boblox-marketplace-updated', { detail: { count: 1 } }));
    }

    return deduplicated;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `marketplace_items/${item.id}`);
    return [];
  }
}

/**
 * Buy/Get a marketplace item (Free).
 * Saves to user inventory and increments the bought count in Firestore and LocalStorage.
 */
export async function buyMarketplaceItem(
  item: MarketplaceClothingItem
): Promise<MarketplaceClothingItem> {
  // 1. Add permanently to user inventory
  if (item.type === 'shirt') {
    saveShirtToInventory({
      id: item.id,
      name: item.name,
      type: 'shirt',
      dataUrl: item.dataUrl,
      previewUrl: item.previewUrl,
      createdAt: Date.now(),
      creatorId: item.creatorId,
      creatorUsername: item.creatorUsername,
      isCreator: false,
    });
  } else {
    savePantsToInventory({
      id: item.id,
      name: item.name,
      type: 'pants',
      dataUrl: item.dataUrl,
      previewUrl: item.previewUrl,
      createdAt: Date.now(),
      creatorId: item.creatorId,
      creatorUsername: item.creatorUsername,
      isCreator: false,
    });
  }

  // 2. Increment bought counter
  const updatedItem: MarketplaceClothingItem = {
    ...item,
    boughtCount: (item.boughtCount || 0) + 1,
  };

  const current = await getSavedMarketplaceItems();
  const updatedList = current.map((i) => (i.id === item.id ? updatedItem : i));
  saveLocalMarketplaceItems(updatedList);

  // Firestore increment
  try {
    const itemRef = doc(db, 'marketplace_items', item.id);
    await updateDoc(itemRef, {
      boughtCount: increment(1),
    });
  } catch {
    // offline or local fallback
  }

  return updatedItem;
}

/**
 * Check if the user already owns this marketplace item in their inventory
 */
export function isItemInInventory(item: MarketplaceClothingItem): boolean {
  if (item.type === 'shirt') {
    const shirts = getSavedShirtsInventory();
    return shirts.some(
      (s) =>
        s.id === item.id ||
        s.dataUrl === item.dataUrl ||
        s.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    );
  } else {
    const pants = getSavedPantsInventory();
    return pants.some(
      (p) =>
        p.id === item.id ||
        p.dataUrl === item.dataUrl ||
        p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    );
  }
}

/**
 * Real-time subscription to marketplace items from Firestore with automatic deduplication
 */
export function subscribeMarketplaceFromFirestore(
  callback: (items: MarketplaceClothingItem[]) => void
) {
  return onSnapshot(
    collection(db, 'marketplace_items'),
    (snap) => {
      if (snap.empty) return;
      const remote = snap.docs
        .map((d) => d.data() as MarketplaceClothingItem)
        .filter(
          (item) => !isFirebaseStorageOrDeletedUrl(item.dataUrl) && !isFirebaseStorageOrDeletedUrl(item.previewUrl)
        );
      
      const deduplicated = deduplicateMarketplaceItems(remote, true);
      if (deduplicated.length > 0) {
        callback(deduplicated);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'marketplace_items');
    }
  );
}

