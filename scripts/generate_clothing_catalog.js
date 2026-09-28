/**
 * BoBlox Automatic Clothing Catalog Generator
 * Scans /public/clothing/shirts, /public/clothing/pants, /public/shirts, /public/pants
 * Validates layout dimensions (filters out invalid/unsupported layouts)
 * Automatically names them "Shirt 1", "Shirt 2", ... and "Pants 1", "Pants 2", ...
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Natural sort for alphanumeric strings (e.g., shirt1, shirt2, shirt10)
 */
function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Parse image dimensions from buffer header (PNG, JPG, WebP)
 */
function getImageDimensions(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 32) return null;

    // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height, format: 'png' };
    }

    // Check JPEG signature: FF D8
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          // SOF0 or SOF2
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height, format: 'jpeg' };
        }
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }

    // Check WebP: RIFF ... WEBP
    if (
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      if (buffer.toString('ascii', 12, 16) === 'VP8 ') {
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return { width, height, format: 'webp' };
      } else if (buffer.toString('ascii', 12, 16) === 'VP8L') {
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width, height, format: 'webp' };
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Validates if the layout is supported for Roblox clothing template wrapping
 * Standard Roblox template: 585 x 559 (ratio ~1.0465) or standard square/clothing layouts
 */
function isSupportedClothingLayout(filePath) {
  const dimensions = getImageDimensions(filePath);
  if (!dimensions) {
    console.warn(`[SKIP] Could not parse dimensions for ${filePath}`);
    return false;
  }

  const { width, height } = dimensions;
  if (width < 100 || height < 100) {
    console.warn(`[SKIP] Image too small (${width}x${height}): ${filePath}`);
    return false;
  }

  const ratio = width / height;
  // Standard Roblox clothing template is 585/559 ~= 1.0465.
  // We accept valid clothing template aspect ratios between 0.85 and 1.25.
  // Extreme widescreen (e.g. 16:9 = 1.77) or tall banners (0.4) are unsupported clothing layouts.
  const isValidRatio = ratio >= 0.82 && ratio <= 1.25;

  if (!isValidRatio) {
    console.warn(`[SKIP] Unsupported template layout ratio (${ratio.toFixed(2)}, ${width}x${height}): ${filePath}`);
    return false;
  }

  return true;
}

function scanFolders() {
  const shirtDirs = [
    { dir: path.join(rootDir, 'public', 'clothing', 'shirts'), urlPrefix: '/clothing/shirts/' },
    { dir: path.join(rootDir, 'public', 'shirts'), urlPrefix: '/shirts/' }
  ];

  const pantsDirs = [
    { dir: path.join(rootDir, 'public', 'clothing', 'pants'), urlPrefix: '/clothing/pants/' },
    { dir: path.join(rootDir, 'public', 'pants'), urlPrefix: '/pants/' }
  ];

  const validExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
  const items = [];
  const seenFiles = new Set();

  let shirtCounter = 1;
  let pantsCounter = 1;

  // Process Shirts
  for (const { dir, urlPrefix } of shirtDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).sort(naturalCompare);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const fullPath = path.join(dir, file);
        if (validExtensions.has(ext) && !seenFiles.has(`shirt-${file}`)) {
          // Verify supported layout
          if (!isSupportedClothingLayout(fullPath)) {
            continue;
          }

          seenFiles.add(`shirt-${file}`);
          const itemName = `Shirt ${shirtCounter++}`;

          items.push({
            id: `shirt-custom-${Buffer.from(file).toString('hex').slice(0, 12)}`,
            name: itemName,
            description: `Original file: ${file}`,
            type: 'shirt',
            dataUrl: `${urlPrefix}${file}`,
            creatorId: 'boblox-community',
            creatorUsername: 'BoBlox Creator',
            price: 0,
            boughtCount: Math.floor(Math.random() * 100) + 12,
            onSale: true,
            createdAt: Date.now() - (shirtCounter * 1000)
          });
        }
      }
    }
  }

  // Process Pants
  for (const { dir, urlPrefix } of pantsDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).sort(naturalCompare);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const fullPath = path.join(dir, file);
        if (validExtensions.has(ext) && !seenFiles.has(`pants-${file}`)) {
          // Verify supported layout
          if (!isSupportedClothingLayout(fullPath)) {
            continue;
          }

          seenFiles.add(`pants-${file}`);
          const itemName = `Pants ${pantsCounter++}`;

          items.push({
            id: `pants-custom-${Buffer.from(file).toString('hex').slice(0, 12)}`,
            name: itemName,
            description: `Original file: ${file}`,
            type: 'pants',
            dataUrl: `${urlPrefix}${file}`,
            creatorId: 'boblox-community',
            creatorUsername: 'BoBlox Creator',
            price: 0,
            boughtCount: Math.floor(Math.random() * 100) + 12,
            onSale: true,
            createdAt: Date.now() - (pantsCounter * 1000)
          });
        }
      }
    }
  }

  const manifestPath = path.join(rootDir, 'public', 'clothing_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(items, null, 2), 'utf-8');
  console.log(`Successfully indexed ${items.length} valid clothing items into /public/clothing_manifest.json!`);
  console.log(`- Valid Shirts: ${shirtCounter - 1}`);
  console.log(`- Valid Pants: ${pantsCounter - 1}`);
}

scanFolders();
