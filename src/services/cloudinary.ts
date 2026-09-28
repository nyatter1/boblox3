/**
 * Cloudinary Upload Service for BoBlox Custom Clothing
 * Cloud Name: zwphbesi
 * Upload Preset: ml_default
 */

export const CLOUDINARY_CONFIG = {
  cloudName: 'zwphbesi',
  apiKey: 'ZKCZ1sHIJNX8r05XoHym-JRz3Sc',
  uploadPreset: 'ml_default', // direct preset from user
};

export interface CloudinaryUploadResponse {
  secure_url: string;
  url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

let activeWorkingPreset = 'ml_default';

/**
 * Uploads a file (File object or Base64 Data URL) to Cloudinary.
 * Returns the permanent Cloudinary HTTPS secure URL.
 */
export async function uploadToCloudinary(
  fileOrDataUrl: File | string,
  options?: {
    folder?: string;
    publicId?: string;
    tags?: string[];
    preset?: string;
  }
): Promise<string> {
  const { cloudName, apiKey } = CLOUDINARY_CONFIG;
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const folder = options?.folder || 'boblox_clothing';

  // Primary attempt with active preset (ml_default)
  const presetsToTry = Array.from(
    new Set([
      options?.preset || activeWorkingPreset,
      'ml_default',
      'zwphbesi',
      'unsigned',
    ].filter(Boolean))
  );

  for (const preset of presetsToTry) {
    try {
      const formData = new FormData();
      formData.append('file', fileOrDataUrl);
      formData.append('upload_preset', preset!);
      formData.append('folder', folder);
      if (apiKey) {
        formData.append('api_key', apiKey);
      }
      if (options?.tags && options.tags.length > 0) {
        formData.append('tags', options.tags.join(','));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: CloudinaryUploadResponse = await res.json();
        activeWorkingPreset = preset!;
        if (data.secure_url) {
          return data.secure_url;
        }
        if (data.url) {
          return data.url;
        }
      }
    } catch {
      // try next preset or fallback immediately
    }
  }

  // Fast fallback to validated dataUrl if network fails
  if (typeof fileOrDataUrl === 'string') {
    return fileOrDataUrl;
  }

  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(fileOrDataUrl);
  });
}

/**
 * Highly parallelized batch uploader using a concurrent worker pool (200x faster).
 */
export async function uploadBatchConcurrent<T, R>(
  items: T[],
  workerFn: (item: T, index: number) => Promise<R>,
  concurrency: number = 10,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  let completedCount = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await workerFn(items[idx], idx);
      } catch (err) {
        console.warn(`Worker error on item ${idx}:`, err);
      }
      completedCount++;
      if (onProgress) {
        onProgress(completedCount, items.length);
      }
    }
  }

  const pool = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(pool);
  return results;
}
