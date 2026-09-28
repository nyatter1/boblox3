import { collection, doc, setDoc, onSnapshot, updateDoc, increment, deleteDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { StudioPart } from './experience';

export type AccessoryCategory =
  | 'hair'
  | 'hat'
  | 'face'
  | 'back'
  | 'shoulder'
  | 'waist'
  | 'gear'
  | 'custom';

export type AttachmentBone =
  | 'Head'
  | 'Torso'
  | 'UpperTorso'
  | 'Back'
  | 'LeftArm'
  | 'RightArm'
  | 'LeftLeg'
  | 'RightLeg';

export interface FittedAccessoryOffset {
  parentBone: AttachmentBone;
  position: [number, number, number]; // [x, y, z] relative offset
  rotation: [number, number, number]; // [rx, ry, rz] Euler angles in radians
  scale: [number, number, number];    // [sx, sy, sz]
}

export interface FittedAccessoryItem {
  id: string;
  name: string;
  category: AccessoryCategory;
  creatorId: string;
  creatorUsername: string;
  createdAt: number;
  price: number; // 0 for free, or Bobux
  boughtCount: number;
  onSale: boolean;
  // Mesh / Part Geometry Data
  meshType: 'obj' | 'primitive' | 'studio_parts';
  objText?: string;
  color?: string;
  parts?: StudioPart[]; // composite Studio parts assembled into model
  offset: FittedAccessoryOffset;
  previewUrl?: string;
}

export const FITTED_ACCESSORIES_STORAGE_KEY = 'boblox_fitted_accessories_v2';
export const EQUIPPED_ACCESSORIES_STORAGE_KEY = 'boblox_equipped_accessories_v2';
export const ACCESSORY_UPLOAD_FEE = 100; // 100 BOBUX fee

let accessoryMemoryCache: FittedAccessoryItem[] | null = null;

export function getSavedFittedAccessories(): FittedAccessoryItem[] {
  if (accessoryMemoryCache && accessoryMemoryCache.length > 0) {
    return accessoryMemoryCache;
  }
  try {
    const raw = localStorage.getItem(FITTED_ACCESSORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        accessoryMemoryCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load saved fitted accessories:', e);
  }
  return [];
}

export function saveFittedAccessoryLocally(item: FittedAccessoryItem): FittedAccessoryItem[] {
  try {
    const current = getSavedFittedAccessories();
    const updated = [item, ...current.filter((a) => a.id !== item.id)];
    accessoryMemoryCache = updated;
    localStorage.setItem(FITTED_ACCESSORIES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save fitted accessory locally:', e);
    return getSavedFittedAccessories();
  }
}

export async function publishFittedAccessoryToMarketplace(
  item: FittedAccessoryItem,
  publisherUsername: string
): Promise<{ success: boolean; error?: string; remainingBobux?: number }> {
  try {
    const { getSavedBobux, saveBobux } = await import('../components/BobuxCurrency');
    const currentBobux = getSavedBobux(publisherUsername);

    if (currentBobux < ACCESSORY_UPLOAD_FEE) {
      return {
        success: false,
        error: `Uploading accessories costs ${ACCESSORY_UPLOAD_FEE} BOBUX. You currently have ${currentBobux} BOBUX.`,
      };
    }

    // Deduct 100 Bobux
    const newBobux = currentBobux - ACCESSORY_UPLOAD_FEE;
    saveBobux(newBobux, publisherUsername);

    // Save locally
    const updatedList = saveFittedAccessoryLocally(item);

    // Sync to Firestore collection 'fitted_accessories'
    try {
      const ref = doc(db, 'fitted_accessories', item.id);
      await setDoc(ref, item, { merge: true });
    } catch (err) {
      console.warn('Firestore fitted_accessories sync note:', err);
    }

    // Notify app listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('boblox-accessories-updated', { detail: { count: updatedList.length } })
      );
    }

    return { success: true, remainingBobux: newBobux };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to publish accessory.' };
  }
}

export async function getMarketplaceFittedAccessories(): Promise<FittedAccessoryItem[]> {
  const local = getSavedFittedAccessories();
  try {
    const snap = await getDocs(collection(db, 'fitted_accessories'));
    if (!snap.empty) {
      const remote = snap.docs.map((d) => d.data() as FittedAccessoryItem);
      const combinedMap = new Map<string, FittedAccessoryItem>();
      [...remote, ...local].forEach((item) => {
        if (item && item.id) combinedMap.set(item.id, item);
      });
      const result = Array.from(combinedMap.values());
      accessoryMemoryCache = result;
      localStorage.setItem(FITTED_ACCESSORIES_STORAGE_KEY, JSON.stringify(result));
      return result;
    }
  } catch {
    // offline or connection delay
  }
  return local;
}

export async function buyFittedAccessory(
  item: FittedAccessoryItem,
  buyerUsername: string
): Promise<{ success: boolean; error?: string }> {
  const price = item.price || 0;
  try {
    const { getSavedBobux, saveBobux } = await import('../components/BobuxCurrency');
    const buyerBobux = getSavedBobux(buyerUsername);

    if (price > 0) {
      if (buyerBobux < price) {
        return { success: false, error: `Insufficient Bobux! Item costs ${price} Bobux, but you have ${buyerBobux} Bobux.` };
      }
      // Deduct from buyer
      saveBobux(buyerBobux - price, buyerUsername);

      // Credit creator
      if (item.creatorUsername && item.creatorUsername.toLowerCase() !== buyerUsername.toLowerCase()) {
        const creatorBobux = getSavedBobux(item.creatorUsername);
        saveBobux(creatorBobux + price, item.creatorUsername);
      }
    }

    // Add to buyer's saved accessories
    saveFittedAccessoryLocally(item);

    // Auto-equip bought item
    equipCustomAccessory(item);

    // Increment bought count in Firestore
    try {
      const ref = doc(db, 'fitted_accessories', item.id);
      await updateDoc(ref, { boughtCount: increment(1) });
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Transaction failed' };
  }
}

// Equipped Custom Accessories Storage (per user or active local)
export function getEquippedCustomAccessories(): FittedAccessoryItem[] {
  try {
    const raw = localStorage.getItem(EQUIPPED_ACCESSORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function equipCustomAccessory(accessory: FittedAccessoryItem): FittedAccessoryItem[] {
  const current = getEquippedCustomAccessories();
  // Filter out any previous item in the exact same category if singular (or replace)
  const filtered = current.filter((a) => a.id !== accessory.id && a.category !== accessory.category);
  const updated = [...filtered, accessory];
  try {
    localStorage.setItem(EQUIPPED_ACCESSORIES_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('boblox-equipped-accessories-changed', { detail: { updated } }));
    }
  } catch {}
  return updated;
}

export function unequipCustomAccessory(accessoryId: string): FittedAccessoryItem[] {
  const current = getEquippedCustomAccessories();
  const updated = current.filter((a) => a.id !== accessoryId);
  try {
    localStorage.setItem(EQUIPPED_ACCESSORIES_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('boblox-equipped-accessories-changed', { detail: { updated } }));
    }
  } catch {}
  return updated;
}
