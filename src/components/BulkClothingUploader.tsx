import React, { useState, useRef } from 'react';
import {
  Upload,
  Shirt,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  ArrowRight,
  Layers,
  ShoppingBag,
  Loader2,
  FileCheck,
  Eye,
  Check,
  X
} from 'lucide-react';
import { UserProfile } from '../services/firebase';
import { validateShirtTemplate } from '../utils/shirtTexture';
import { validatePantsTemplate } from '../utils/pantsTexture';
import { generateShirt2DFrontPreview, generatePants2DFrontPreview } from '../utils/preview2D';
import {
  MarketplaceClothingItem,
  publishMultipleItemsToMarketplace,
} from '../types/marketplace';
import {
  CustomClothingItem,
  saveMultipleShirtsToInventory,
  saveMultiplePantsToInventory,
} from '../types/avatarInventory';
import { uploadToCloudinary, uploadBatchConcurrent } from '../services/cloudinary';

interface QueuedItem {
  id: string;
  name: string;
  type: 'shirt' | 'pants';
  file: File;
  dataUrl: string;
  previewUrl?: string;
  status: 'ready' | 'invalid';
  error?: string;
}

interface BulkClothingUploaderProps {
  currentUser: UserProfile;
  onUploadComplete?: (stats: { shirtsCount: number; pantsCount: number }) => void;
  onOpenMarketplace?: () => void;
  onOpenAvatarEditor?: () => void;
}

export default function BulkClothingUploader({
  currentUser,
  onUploadComplete,
  onOpenMarketplace,
  onOpenAvatarEditor,
}: BulkClothingUploaderProps) {
  const [queuedShirts, setQueuedShirts] = useState<QueuedItem[]>([]);
  const [queuedPants, setQueuedPants] = useState<QueuedItem[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccessSummary, setUploadSuccessSummary] = useState<{
    shirtsCount: number;
    pantsCount: number;
  } | null>(null);

  // Pricing mode for batch upload: 'free' or 'bobux'
  const [batchPriceType, setBatchPriceType] = useState<'free' | 'bobux'>('free');
  const [batchBobuxPrice, setBatchBobuxPrice] = useState<number>(5);

  const shirtInputRef = useRef<HTMLInputElement | null>(null);
  const pantsInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to extract clean sequence names or user file names
  const processShirtFiles = async (fileList: FileList | File[]) => {
    setIsProcessingFiles(true);
    const files = Array.from(fileList);
    const startIndex = queuedShirts.length;

    // Process all files in parallel
    const newItems: QueuedItem[] = await Promise.all(
      files.map(async (file, i) => {
        const seqNumber = startIndex + i + 1;
        const cleanFileName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]/g, ' ')
          .trim();
        const defaultName = cleanFileName || `Shirt ${seqNumber}`;

        try {
          const result = await validateShirtTemplate(file);
          if (result.valid && result.dataUrl) {
            const preview = await generateShirt2DFrontPreview(result.dataUrl);
            return {
              id: `shirt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`,
              name: defaultName,
              type: 'shirt' as const,
              file,
              dataUrl: result.dataUrl,
              previewUrl: preview,
              status: 'ready' as const,
            };
          } else {
            return {
              id: `shirt-err-${Date.now()}-${i}`,
              name: file.name,
              type: 'shirt' as const,
              file,
              dataUrl: '',
              status: 'invalid' as const,
              error: result.error || 'Invalid template dimensions (must be 585x559 PNG)',
            };
          }
        } catch {
          return {
            id: `shirt-err-${Date.now()}-${i}`,
            name: file.name,
            type: 'shirt' as const,
            file,
            dataUrl: '',
            status: 'invalid' as const,
            error: 'Failed to read image file',
          };
        }
      })
    );

    setQueuedShirts((prev) => {
      const updated = [...prev, ...newItems];
      // Deduplicate queued shirts by name or dataUrl
      const seenNames = new Set<string>();
      const seenUrls = new Set<string>();
      const unique: QueuedItem[] = [];

      for (const item of updated) {
        if (item.status === 'ready') {
          const normName = item.name.trim().toLowerCase();
          const normUrl = item.dataUrl.trim();
          if (seenNames.has(normName) || seenUrls.has(normUrl)) {
            continue; // filter out duplicate
          }
          seenNames.add(normName);
          seenUrls.add(normUrl);
        }
        unique.push(item);
      }

      return unique;
    });
    setIsProcessingFiles(false);
  };

  const processPantsFiles = async (fileList: FileList | File[]) => {
    setIsProcessingFiles(true);
    const files = Array.from(fileList);
    const startIndex = queuedPants.length;

    // Process all pants in parallel
    const newItems: QueuedItem[] = await Promise.all(
      files.map(async (file, i) => {
        const cleanFileName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]/g, ' ')
          .trim();
        const defaultName = cleanFileName || `Pants ${startIndex + i + 1}`;

        try {
          const result = await validatePantsTemplate(file);
          if (result.valid && result.dataUrl) {
            const preview = await generatePants2DFrontPreview(result.dataUrl);
            return {
              id: `pants-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`,
              name: defaultName,
              type: 'pants' as const,
              file,
              dataUrl: result.dataUrl,
              previewUrl: preview,
              status: 'ready' as const,
            };
          } else {
            return {
              id: `pants-err-${Date.now()}-${i}`,
              name: file.name,
              type: 'pants' as const,
              file,
              dataUrl: '',
              status: 'invalid' as const,
              error: result.error || 'Invalid template dimensions (must be 585x559 PNG)',
            };
          }
        } catch {
          return {
            id: `pants-err-${Date.now()}-${i}`,
            name: file.name,
            type: 'pants' as const,
            file,
            dataUrl: '',
            status: 'invalid' as const,
            error: 'Failed to read image file',
          };
        }
      })
    );

    setQueuedPants((prev) => {
      const updated = [...prev, ...newItems];
      // Deduplicate queued pants by name or dataUrl
      const seenNames = new Set<string>();
      const seenUrls = new Set<string>();
      const unique: QueuedItem[] = [];

      for (const item of updated) {
        if (item.status === 'ready') {
          const normName = item.name.trim().toLowerCase();
          const normUrl = item.dataUrl.trim();
          if (seenNames.has(normName) || seenUrls.has(normUrl)) {
            continue; // filter out duplicate
          }
          seenNames.add(normName);
          seenUrls.add(normUrl);
        }
        unique.push(item);
      }

      return unique;
    });
    setIsProcessingFiles(false);
  };

  const removeShirt = (id: string) => {
    setQueuedShirts((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      let count = 0;
      return filtered.map((item) => {
        if (item.status === 'ready') {
          count++;
          return { ...item, name: `Shirt ${count}` };
        }
        return item;
      });
    });
  };

  const removePants = (id: string) => {
    setQueuedPants((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      let count = 0;
      return filtered.map((item) => {
        if (item.status === 'ready') {
          count++;
          return { ...item, name: `Pants ${count}` };
        }
        return item;
      });
    });
  };

  const clearAll = () => {
    setQueuedShirts([]);
    setQueuedPants([]);
    setUploadSuccessSummary(null);
  };

  const validShirts = queuedShirts.filter((s) => s.status === 'ready');
  const validPants = queuedPants.filter((p) => p.status === 'ready');
  const totalValidItems = validShirts.length + validPants.length;

  // Handle Upload Everything & Publish to Marketplace via Cloudinary
  const handleUploadEverything = async () => {
    if (totalValidItems === 0) return;

    // Check 100 Bobux Upload Fee
    const { getSavedBobux, saveBobux } = await import('./BobuxCurrency');
    const userBobux = getSavedBobux(currentUser.username);
    if (userBobux < 100) {
      alert(`Uploading clothing costs 100 BOBUX. You currently have ${userBobux} BOBUX. Claim your daily Bobux or earn more to upload!`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    try {
      // Deduct 100 Bobux fee
      saveBobux(userBobux - 100, currentUser.username);
      const now = Date.now();
      const totalSteps = totalValidItems * 2; // texture + preview for each
      let currentStep = 0;

      // 1. Upload all Shirts concurrently
      const customShirts: CustomClothingItem[] = await uploadBatchConcurrent(
        validShirts,
        async (s, i) => {
          let cloudTextureUrl = s.dataUrl;
          let cloudPreviewUrl = s.previewUrl;

          // Parallelize texture & preview for each item
          const [texRes, prevRes] = await Promise.all([
            uploadToCloudinary(s.dataUrl, {
              folder: 'boblox_clothing/shirts',
              tags: ['shirt', currentUser.username],
              preset: 'ml_default',
            }).catch(() => s.dataUrl),
            s.previewUrl
              ? uploadToCloudinary(s.previewUrl, {
                  folder: 'boblox_clothing/previews',
                  tags: ['preview', 'shirt'],
                  preset: 'ml_default',
                }).catch(() => s.previewUrl)
              : Promise.resolve(undefined),
          ]);

          if (texRes) cloudTextureUrl = texRes;
          if (prevRes) cloudPreviewUrl = prevRes;

          return {
            id: s.id,
            name: s.name,
            type: 'shirt' as const,
            dataUrl: cloudTextureUrl,
            previewUrl: cloudPreviewUrl,
            createdAt: now - i * 100,
            creatorId: currentUser.id,
            creatorUsername: currentUser.username,
            isCreator: true,
          };
        },
        12,
        (completed, total) => {
          const ratio = (completed / Math.max(1, totalValidItems)) * 80;
          setUploadProgress(Math.min(85, Math.round(ratio)));
        }
      );

      // 2. Upload all Pants concurrently
      const customPants: CustomClothingItem[] = await uploadBatchConcurrent(
        validPants,
        async (p, i) => {
          let cloudTextureUrl = p.dataUrl;
          let cloudPreviewUrl = p.previewUrl;

          const [texRes, prevRes] = await Promise.all([
            uploadToCloudinary(p.dataUrl, {
              folder: 'boblox_clothing/pants',
              tags: ['pants', currentUser.username],
              preset: 'ml_default',
            }).catch(() => p.dataUrl),
            p.previewUrl
              ? uploadToCloudinary(p.previewUrl, {
                  folder: 'boblox_clothing/previews',
                  tags: ['preview', 'pants'],
                  preset: 'ml_default',
                }).catch(() => p.previewUrl)
              : Promise.resolve(undefined),
          ]);

          if (texRes) cloudTextureUrl = texRes;
          if (prevRes) cloudPreviewUrl = prevRes;

          return {
            id: p.id,
            name: p.name,
            type: 'pants' as const,
            dataUrl: cloudTextureUrl,
            previewUrl: cloudPreviewUrl,
            createdAt: now - (validShirts.length + i) * 100,
            creatorId: currentUser.id,
            creatorUsername: currentUser.username,
            isCreator: true,
          };
        },
        12,
        (completed, total) => {
          const ratio = ((validShirts.length + completed) / Math.max(1, totalValidItems)) * 80;
          setUploadProgress(Math.min(85, Math.round(ratio)));
        }
      );

      // 3. Save to User Inventory
      setUploadProgress(90);
      saveMultipleShirtsToInventory(customShirts);
      saveMultiplePantsToInventory(customPants);

      // 4. Convert to Marketplace Items
      const effectivePrice = batchPriceType === 'free' ? 0 : Math.max(1, batchBobuxPrice);
      const marketplaceItems: MarketplaceClothingItem[] = [
        ...customShirts.map((s) => ({
          id: s.id,
          name: s.name,
          type: 'shirt' as const,
          dataUrl: s.dataUrl,
          previewUrl: s.previewUrl,
          creatorId: currentUser.id,
          creatorUsername: currentUser.username,
          price: effectivePrice,
          boughtCount: 0,
          onSale: true,
          createdAt: s.createdAt,
        })),
        ...customPants.map((p) => ({
          id: p.id,
          name: p.name,
          type: 'pants' as const,
          dataUrl: p.dataUrl,
          previewUrl: p.previewUrl,
          creatorId: currentUser.id,
          creatorUsername: currentUser.username,
          price: effectivePrice,
          boughtCount: 0,
          onSale: true,
          createdAt: p.createdAt,
        })),
      ];

      setUploadProgress(95);
      await publishMultipleItemsToMarketplace(marketplaceItems);

      setUploadProgress(100);

      const summary = {
        shirtsCount: validShirts.length,
        pantsCount: validPants.length,
      };

      setUploadSuccessSummary(summary);
      setQueuedShirts([]);
      setQueuedPants([]);

      if (onUploadComplete) {
        onUploadComplete(summary);
      }
    } catch (err) {
      console.error('Failed to publish all items:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/60 via-[#1c1236] to-[#120a24] border border-purple-500/25 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 shrink-0">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-extrabold text-white flex items-center gap-2">
                <span>Creator Bulk Uploader</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-400/30">
                  BATCH PUBLISHER
                </span>
              </h2>
              <p className="text-purple-300/80 text-sm mt-1 max-w-2xl">
                Upload your shirts first, then your pants. All items are automatically sequenced (
                <span className="text-white font-semibold">Shirt 1, Shirt 2... & Pants 1, Pants 2...</span>), validated, and instantly published to the Marketplace with one click!
              </p>
            </div>
          </div>

          {(queuedShirts.length > 0 || queuedPants.length > 0) && (
            <button
              onClick={clearAll}
              disabled={isUploading}
              className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-white border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start md:self-auto cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Queue</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Modal / Banner */}
      {uploadSuccessSummary && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-[#0a2e1d] border border-emerald-500/40 shadow-2xl animate-fade-in flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Successfully Uploaded & Published to Marketplace!
              </h3>
              <p className="text-emerald-200/90 text-sm mt-0.5">
                Published <span className="font-bold text-white">{uploadSuccessSummary.shirtsCount} Shirts</span> and{' '}
                <span className="font-bold text-white">{uploadSuccessSummary.pantsCount} Pants</span>. They are now live, free for all players!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onOpenMarketplace && (
              <button
                onClick={onOpenMarketplace}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>View Marketplace</span>
              </button>
            )}
            {onOpenAvatarEditor && (
              <button
                onClick={onOpenAvatarEditor}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Shirt className="w-4 h-4" />
                <span>Avatar Editor</span>
              </button>
            )}
            <button
              onClick={() => setUploadSuccessSummary(null)}
              className="p-2 text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-900/40 transition-colors"
              title="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 2-Step Bulk Upload Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================= STEP 1: SHIRTS BULK DROP ================= */}
        <div className="rounded-2xl bg-[#150f29] border border-purple-500/20 p-5 sm:p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center font-mono font-bold text-sm text-purple-300">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Shirts First</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-purple-900/60 text-purple-300 font-normal">
                      Batch
                    </span>
                  </h3>
                  <p className="text-xs text-purple-400">Upload multiple shirt template files</p>
                </div>
              </div>

              {validShirts.length > 0 && (
                <div className="px-2.5 py-1 rounded-full bg-purple-900/80 border border-purple-500/40 text-purple-200 text-xs font-bold font-mono">
                  {validShirts.length} queued
                </div>
              )}
            </div>

            {/* Dropzone Input Area */}
            <div
              onClick={() => shirtInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) {
                  processShirtFiles(e.dataTransfer.files);
                }
              }}
              className="border-2 border-dashed border-purple-500/30 hover:border-purple-400/80 rounded-2xl p-6 text-center bg-purple-950/20 hover:bg-purple-900/20 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group"
            >
              <input
                ref={shirtInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    processShirtFiles(e.target.files);
                  }
                  e.target.value = '';
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-purple-600/20 group-hover:bg-purple-600/40 text-purple-300 group-hover:text-white flex items-center justify-center transition-all group-hover:scale-110">
                <Shirt className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-purple-200">
                  Click or Drag & Drop Multiple Shirts
                </p>
                <p className="text-xs text-purple-400 mt-0.5">
                  Select all your shirt PNG files at once (585×559 standard)
                </p>
              </div>
              <span className="px-3 py-1 rounded-lg bg-purple-600/40 group-hover:bg-purple-600 text-purple-200 group-hover:text-white text-xs font-bold transition-colors">
                Browse Shirt Files
              </span>
            </div>

            {/* Queued Shirts Grid Preview */}
            {queuedShirts.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-purple-300">
                    Ready for Upload ({validShirts.length} Valid)
                  </span>
                  <button
                    onClick={() => setQueuedShirts([])}
                    className="text-[11px] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    Remove All Shirts
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto pr-1 space-y-2">
                  {queuedShirts.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                        item.status === 'ready'
                          ? 'bg-[#0e0a1e] border-purple-500/30'
                          : 'bg-red-950/30 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {item.previewUrl ? (
                          <div className="w-8 h-8 rounded-lg bg-black/40 border border-purple-500/20 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-red-950/60 flex items-center justify-center text-red-400 shrink-0">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="font-bold text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-purple-400 truncate">
                            {item.status === 'ready' ? item.file.name : item.error}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'ready' ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold">
                            OK
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 border border-red-500/40 text-red-300 font-bold">
                            Invalid
                          </span>
                        )}
                        <button
                          onClick={() => removeShirt(item.id)}
                          className="p-1 text-purple-400 hover:text-red-300 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= STEP 2: PANTS BULK DROP ================= */}
        <div className="rounded-2xl bg-[#150f29] border border-purple-500/20 p-5 sm:p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-mono font-bold text-sm text-indigo-300">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Then Pants</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-900/60 text-indigo-300 font-normal">
                      Batch
                    </span>
                  </h3>
                  <p className="text-xs text-indigo-400">Upload multiple pants template files</p>
                </div>
              </div>

              {validPants.length > 0 && (
                <div className="px-2.5 py-1 rounded-full bg-indigo-900/80 border border-indigo-500/40 text-indigo-200 text-xs font-bold font-mono">
                  {validPants.length} queued
                </div>
              )}
            </div>

            {/* Dropzone Input Area */}
            <div
              onClick={() => pantsInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) {
                  processPantsFiles(e.dataTransfer.files);
                }
              }}
              className="border-2 border-dashed border-indigo-500/30 hover:border-indigo-400/80 rounded-2xl p-6 text-center bg-indigo-950/20 hover:bg-indigo-900/20 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group"
            >
              <input
                ref={pantsInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    processPantsFiles(e.target.files);
                  }
                  e.target.value = '';
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 group-hover:bg-indigo-600/40 text-indigo-300 group-hover:text-white flex items-center justify-center transition-all group-hover:scale-110">
                <Layers className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-indigo-200">
                  Click or Drag & Drop Multiple Pants
                </p>
                <p className="text-xs text-indigo-400 mt-0.5">
                  Select all your pants PNG files at once (585×559 standard)
                </p>
              </div>
              <span className="px-3 py-1 rounded-lg bg-indigo-600/40 group-hover:bg-indigo-600 text-indigo-200 group-hover:text-white text-xs font-bold transition-colors">
                Browse Pants Files
              </span>
            </div>

            {/* Queued Pants Grid Preview */}
            {queuedPants.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-indigo-300">
                    Ready for Upload ({validPants.length} Valid)
                  </span>
                  <button
                    onClick={() => setQueuedPants([])}
                    className="text-[11px] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    Remove All Pants
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto pr-1 space-y-2">
                  {queuedPants.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                        item.status === 'ready'
                          ? 'bg-[#0e0a1e] border-indigo-500/30'
                          : 'bg-red-950/30 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {item.previewUrl ? (
                          <div className="w-8 h-8 rounded-lg bg-black/40 border border-indigo-500/20 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-red-950/60 flex items-center justify-center text-red-400 shrink-0">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="font-bold text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-indigo-400 truncate">
                            {item.status === 'ready' ? item.file.name : item.error}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'ready' ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold">
                            OK
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 border border-red-500/40 text-red-300 font-bold">
                            Invalid
                          </span>
                        )}
                        <button
                          onClick={() => removePants(item.id)}
                          className="p-1 text-purple-400 hover:text-red-300 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= STEP 3: ACTION BAR / UPLOAD EVERYTHING ================= */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#170e30] to-[#120a24] border border-purple-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">
                Queue Total: {totalValidItems} items
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 font-mono">
                {validShirts.length} Shirts + {validPants.length} Pants
              </span>
            </div>
            <p className="text-xs text-purple-400 mt-0.5">
              Clicking below will save all files to your inventory and publish them directly to the Marketplace.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Price Selector */}
          <div className="flex items-center gap-2 bg-[#0e0a1e] p-1.5 rounded-xl border border-purple-500/30">
            <button
              type="button"
              onClick={() => setBatchPriceType('free')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                batchPriceType === 'free'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Free (0 B$)
            </button>
            <button
              type="button"
              onClick={() => setBatchPriceType('bobux')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                batchPriceType === 'bobux'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Cost Bobux
            </button>
            {batchPriceType === 'bobux' && (
              <div className="flex items-center gap-1 pl-1 pr-2">
                <span className="text-amber-400 font-bold text-xs">B$</span>
                <input
                  type="number"
                  min={1}
                  max={1000000}
                  value={batchBobuxPrice}
                  onChange={(e) => setBatchBobuxPrice(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 bg-black/50 border border-amber-500/40 rounded-lg text-white font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleUploadEverything}
            disabled={totalValidItems === 0 || isUploading || isProcessingFiles}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-display font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl transition-all ${
              totalValidItems === 0 || isUploading || isProcessingFiles
                ? 'bg-purple-950/60 text-purple-500/60 border border-purple-900/40 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/40 hover:scale-[1.02] cursor-pointer'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Publishing {totalValidItems} Items ({uploadProgress}%)...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Save & Upload Everything ({totalValidItems})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isUploading && (
        <div className="w-full bg-purple-950/50 rounded-full h-2.5 overflow-hidden border border-purple-500/20">
          <div
            className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}
