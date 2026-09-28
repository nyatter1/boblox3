import { SHIRT_COORDS } from './shirtTexture';
import { PANTS_COORDS } from './pantsTexture';

const clothingPreviewCache = new Map<string, string>();

/**
 * Converts a raw 585x559 Roblox shirt or pants template dataUrl
 * into a clean, rendered item thumbnail (folded shirt/pants) instead of the unfolded flat UV sheet.
 */
export async function getFoldedClothingPreview(
  dataUrl: string,
  type: 'shirt' | 'pants'
): Promise<string> {
  const cacheKey = `${type}_${dataUrl.slice(-60)}`;
  if (clothingPreviewCache.has(cacheKey)) {
    return clothingPreviewCache.get(cacheKey)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d')!;

        if (type === 'shirt') {
          // Assembled Folded Shirt Icon
          // 1. Right Sleeve (Screen Left)
          ctx.drawImage(
            img,
            SHIRT_COORDS.rightArm.front.x,
            SHIRT_COORDS.rightArm.front.y,
            SHIRT_COORDS.rightArm.front.w,
            SHIRT_COORDS.rightArm.front.h,
            16,
            46,
            38,
            96
          );

          // 2. Left Sleeve (Screen Right)
          ctx.drawImage(
            img,
            SHIRT_COORDS.leftArm.front.x,
            SHIRT_COORDS.leftArm.front.y,
            SHIRT_COORDS.leftArm.front.w,
            SHIRT_COORDS.leftArm.front.h,
            146,
            46,
            38,
            96
          );

          // 3. Center Torso Front
          ctx.drawImage(
            img,
            SHIRT_COORDS.torso.front.x,
            SHIRT_COORDS.torso.front.y,
            SHIRT_COORDS.torso.front.w,
            SHIRT_COORDS.torso.front.h,
            48,
            36,
            104,
            116
          );

          // 4. Neckline Collar (Top slice)
          ctx.drawImage(
            img,
            SHIRT_COORDS.torso.top.x,
            SHIRT_COORDS.torso.top.y + 24,
            SHIRT_COORDS.torso.top.w,
            40,
            48,
            24,
            104,
            18
          );
        } else {
          // Assembled Pants Icon
          // 1. Pelvis / Waistband
          // Check if y: 204 or y: 154 has content
          ctx.drawImage(img, 231, 154, 128, 50, 48, 22, 104, 38);

          // 2. Right Leg (Screen Left)
          ctx.drawImage(
            img,
            PANTS_COORDS.rightLeg.front.x,
            PANTS_COORDS.rightLeg.front.y,
            PANTS_COORDS.rightLeg.front.w,
            PANTS_COORDS.rightLeg.front.h,
            48,
            60,
            50,
            116
          );

          // 3. Left Leg (Screen Right)
          ctx.drawImage(
            img,
            PANTS_COORDS.leftLeg.front.x,
            PANTS_COORDS.leftLeg.front.y,
            PANTS_COORDS.leftLeg.front.w,
            PANTS_COORDS.leftLeg.front.h,
            102,
            60,
            50,
            116
          );
        }

        const previewDataUrl = canvas.toDataURL('image/png');
        clothingPreviewCache.set(cacheKey, previewDataUrl);
        resolve(previewDataUrl);
      } catch {
        // Fallback to original dataUrl on error
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
