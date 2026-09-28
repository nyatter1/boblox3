import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Play,
  Layers,
  Shirt,
  Sparkles,
  Globe,
  Lock,
  ExternalLink,
  Info,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  FolderPlus,
  ChevronRight,
  SlidersHorizontal,
  Upload,
  Check,
  Palette,
  Eye,
  Trash2,
  Save,
  Image,
  Camera
} from 'lucide-react';
import AvatarProfileIcon from './AvatarProfileIcon';
import VerifiedBadge, { isOwnerUser, isVerifiedUser } from './VerifiedBadge';
import { AvatarColors } from './AvatarViewer';
import { UserProfile } from '../services/firebase';
import {
  ExperienceData,
  StudioPart,
  formatTimeAgo
} from '../types/experience';
import {
  CustomClothingItem,
  getSavedShirtsInventory,
  saveShirtToInventory,
  getSavedPantsInventory,
  savePantsToInventory
} from '../types/avatarInventory';
import { publishItemToMarketplace } from '../types/marketplace';
import { validateShirtTemplate, generateBlankRobloxTemplateDataUrl } from '../utils/shirtTexture';
import { validatePantsTemplate, generateBlankRobloxPantsTemplateDataUrl } from '../utils/pantsTexture';
import { generateShirt2DFrontPreview, generatePants2DFrontPreview } from '../utils/preview2D';
import { uploadToCloudinary } from '../services/cloudinary';
import BulkClothingUploader from './BulkClothingUploader';
import {
  FittedAccessoryItem,
  getSavedFittedAccessories,
  publishFittedAccessoryToMarketplace,
  ACCESSORY_UPLOAD_FEE,
} from '../types/fittedAccessories';

interface BoBloxStudioProps {
  currentUser: UserProfile;
  avatarColors: AvatarColors;
  selectedFaceId: string;
  shirtDataUrl: string | null;
  pantsDataUrl: string | null;
  experiences: ExperienceData[];
  onCreateExperience: (newExp: ExperienceData) => void;
  onEditExperienceInStudio: (exp: ExperienceData) => void;
  onPlayExperience: (exp: ExperienceData) => void;
  onDeleteExperience?: (expId: string) => void;
  onResetAllExperiences?: () => void;
  onOpenAvatarEditor: () => void;
  onBackToHome: () => void;
  onSelectShirt: (url: string | null) => void;
  onSelectPants: (url: string | null) => void;
  onOpenMarketplace?: () => void;
}

type StudioTab = 'experiences' | 'avatar-items' | 'my-models' | 'bulk-upload';

export default function BoBloxStudio({
  currentUser,
  avatarColors,
  selectedFaceId,
  shirtDataUrl,
  pantsDataUrl,
  experiences,
  onCreateExperience,
  onEditExperienceInStudio,
  onPlayExperience,
  onDeleteExperience,
  onResetAllExperiences,
  onOpenAvatarEditor,
  onBackToHome,
  onSelectShirt,
  onSelectPants,
  onOpenMarketplace,
}: BoBloxStudioProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>('experiences');
  const [filterQuery, setFilterQuery] = useState('');

  // Create Experience Dialog State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExpName, setNewExpName] = useState('My BoBlox Experience');
  const [newExpTemplate, setNewExpTemplate] = useState<'baseplate' | 'flat_grass' | 'empty'>('baseplate');

  // Avatar Items Inventory State
  const [savedShirts, setSavedShirts] = useState<CustomClothingItem[]>(getSavedShirtsInventory);
  const [savedPants, setSavedPants] = useState<CustomClothingItem[]>(getSavedPantsInventory);
  const [savedFittedModels, setSavedFittedModels] = useState<FittedAccessoryItem[]>(getSavedFittedAccessories);

  // Model Marketplace Upload Modal State
  const [selectedModelForUpload, setSelectedModelForUpload] = useState<FittedAccessoryItem | null>(null);
  const [uploadBobuxPrice, setUploadBobuxPrice] = useState<number>(0);
  const [uploadingModel, setUploadingModel] = useState<boolean>(false);

  // Shirt Creation Form State
  const [shirtName, setShirtName] = useState('');
  const [shirtDataToSave, setShirtDataToSave] = useState<string | null>(null);
  const [shirtPreviewUrl, setShirtPreviewUrl] = useState<string | null>(null);
  const [shirtError, setShirtError] = useState<string | null>(null);
  const [shirtOnSale, setShirtOnSale] = useState<boolean>(true);
  const [shirtPriceType, setShirtPriceType] = useState<'free' | 'paid'>('free');
  const [shirtBobuxPrice, setShirtBobuxPrice] = useState<number>(5);

  // Pants Creation Form State
  const [pantsName, setPantsName] = useState('');
  const [pantsDataToSave, setPantsDataToSave] = useState<string | null>(null);
  const [pantsPreviewUrl, setPantsPreviewUrl] = useState<string | null>(null);
  const [pantsError, setPantsError] = useState<string | null>(null);
  const [pantsOnSale, setPantsOnSale] = useState<boolean>(true);
  const [pantsPriceType, setPantsPriceType] = useState<'free' | 'paid'>('free');
  const [pantsBobuxPrice, setPantsBobuxPrice] = useState<number>(5);

  const filteredExperiences = experiences.filter((exp) =>
    exp.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (exp.description && exp.description.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  // Handle Experience Creation -> Launches Studio
  const handleConfirmCreateExperience = () => {
    const defaultParts: StudioPart[] = [
      {
        id: `spawn-${Date.now()}`,
        name: 'SpawnLocation',
        shape: 'block',
        position: [0, 0.1, 0],
        size: [6, 0.2, 6],
        rotation: [0, 0, 0],
        color: '#64748b',
        material: 'SmoothPlastic',
        transparency: 0,
        reflectance: 0,
        anchored: true,
        canCollide: true,
      },
    ];

    if (newExpTemplate === 'flat_grass') {
      defaultParts.push({
        id: `hill-${Date.now()}`,
        name: 'GreenHill',
        shape: 'block',
        position: [0, 2, -10],
        size: [12, 4, 12],
        rotation: [0, 0, 0],
        color: '#22c55e',
        material: 'SmoothPlastic',
        transparency: 0,
        reflectance: 0,
        anchored: true,
        canCollide: true,
      });
    }

    const newExp: ExperienceData = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newExpName.trim() || 'Untitled Experience',
      description: 'Created with BoBlox Studio',
      creatorId: currentUser.id,
      creatorUsername: currentUser.username,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      published: true,
      visits: 0,
      likes: 0,
      dislikes: 0,
      favorites: 0,
      userLiked: null,
      userFavorited: false,
      parts: defaultParts,
    };

    setShowCreateModal(false);
    onCreateExperience(newExp);
  };

  // Handle Shirt Template Upload
  const handleShirtFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShirtError(null);

    const result = await validateShirtTemplate(file);
    if (!result.valid || !result.dataUrl) {
      setShirtError(result.error || 'Invalid shirt template. Must be standard 585x559 PNG.');
      return;
    }

    setShirtDataToSave(result.dataUrl);
    if (!shirtName.trim()) {
      setShirtName(file.name.replace(/\.[^/.]+$/, ''));
    }
    generateShirt2DFrontPreview(result.dataUrl).then((prev) => setShirtPreviewUrl(prev));
  };

  // Save Shirt to Inventory & Marketplace via Cloudinary
  const handleSaveShirt = async () => {
    if (!shirtDataToSave) {
      setShirtError('Please upload a 585x559 PNG shirt template first.');
      return;
    }
    const finalName = shirtName.trim() || 'Custom Shirt';
    
    // Upload texture to Cloudinary
    let cloudTextureUrl = shirtDataToSave;
    try {
      cloudTextureUrl = await uploadToCloudinary(shirtDataToSave, {
        folder: 'boblox_clothing/shirts',
        tags: ['shirt', currentUser.username],
      });
    } catch (e) {
      console.warn('Cloudinary upload warning:', e);
    }

    // Upload preview to Cloudinary if available
    let cloudPreviewUrl = shirtPreviewUrl;
    if (shirtPreviewUrl) {
      try {
        cloudPreviewUrl = await uploadToCloudinary(shirtPreviewUrl, {
          folder: 'boblox_clothing/previews',
          tags: ['preview', 'shirt'],
        });
      } catch (e) {
        console.warn('Cloudinary preview upload warning:', e);
      }
    }

    const item: CustomClothingItem = {
      id: `shirt-${Date.now()}`,
      name: finalName,
      type: 'shirt',
      dataUrl: cloudTextureUrl,
      previewUrl: cloudPreviewUrl || undefined,
      createdAt: Date.now(),
      creatorId: currentUser.id,
      creatorUsername: currentUser.username,
      isCreator: true,
    };
    const updated = saveShirtToInventory(item);
    setSavedShirts(updated);
    onSelectShirt(item.dataUrl);

    // If "On Sale" toggle is ON, publish to Marketplace!
    if (shirtOnSale) {
      publishItemToMarketplace({
        id: item.id,
        name: finalName,
        type: 'shirt',
        dataUrl: cloudTextureUrl,
        previewUrl: cloudPreviewUrl || undefined,
        creatorId: currentUser.id,
        creatorUsername: currentUser.username,
        price: shirtPriceType === 'free' ? 0 : Math.max(1, shirtBobuxPrice),
        boughtCount: 0,
        onSale: true,
        createdAt: Date.now(),
      });
    }

    setShirtDataToSave(null);
    setShirtPreviewUrl(null);
    setShirtName('');
  };

  // Handle Pants Template Upload
  const handlePantsFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPantsError(null);

    const result = await validatePantsTemplate(file);
    if (!result.valid || !result.dataUrl) {
      setPantsError(result.error || 'Invalid pants template. Must be standard 585x559 PNG.');
      return;
    }

    setPantsDataToSave(result.dataUrl);
    if (!pantsName.trim()) {
      setPantsName(file.name.replace(/\.[^/.]+$/, ''));
    }
    generatePants2DFrontPreview(result.dataUrl).then((prev) => setPantsPreviewUrl(prev));
  };

  // Save Pants to Inventory & Marketplace via Cloudinary
  const handleSavePants = async () => {
    if (!pantsDataToSave) {
      setPantsError('Please upload a 585x559 PNG pants template first.');
      return;
    }
    const finalName = pantsName.trim() || 'Custom Pants';

    // Upload texture to Cloudinary
    let cloudTextureUrl = pantsDataToSave;
    try {
      cloudTextureUrl = await uploadToCloudinary(pantsDataToSave, {
        folder: 'boblox_clothing/pants',
        tags: ['pants', currentUser.username],
      });
    } catch (e) {
      console.warn('Cloudinary upload warning:', e);
    }

    // Upload preview to Cloudinary if available
    let cloudPreviewUrl = pantsPreviewUrl;
    if (pantsPreviewUrl) {
      try {
        cloudPreviewUrl = await uploadToCloudinary(pantsPreviewUrl, {
          folder: 'boblox_clothing/previews',
          tags: ['preview', 'pants'],
        });
      } catch (e) {
        console.warn('Cloudinary preview upload warning:', e);
      }
    }

    const item: CustomClothingItem = {
      id: `pants-${Date.now()}`,
      name: finalName,
      type: 'pants',
      dataUrl: cloudTextureUrl,
      previewUrl: cloudPreviewUrl || undefined,
      createdAt: Date.now(),
      creatorId: currentUser.id,
      creatorUsername: currentUser.username,
      isCreator: true,
    };
    const updated = savePantsToInventory(item);
    setSavedPants(updated);
    onSelectPants(item.dataUrl);

    // If "On Sale" toggle is ON, publish to Marketplace!
    if (pantsOnSale) {
      publishItemToMarketplace({
        id: item.id,
        name: finalName,
        type: 'pants',
        dataUrl: cloudTextureUrl,
        previewUrl: cloudPreviewUrl || undefined,
        creatorId: currentUser.id,
        creatorUsername: currentUser.username,
        price: pantsPriceType === 'free' ? 0 : Math.max(1, pantsBobuxPrice),
        boughtCount: 0,
        onSale: true,
        createdAt: Date.now(),
      });
    }

    setPantsDataToSave(null);
    setPantsPreviewUrl(null);
    setPantsName('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* ================= STUDIO HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#1b1435] via-[#16102c] to-[#100b20] border border-purple-500/25 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-inner">
            <Boxes className="w-7 h-7 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
                BoBlox Studio
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 font-bold">
                Creator Hub
              </span>
            </div>
            <p className="text-xs sm:text-sm text-purple-300/70 mt-0.5">
              Manage your experiences, avatar clothing creations, and place settings.
            </p>
          </div>
        </div>

        {/* Right Side: Profile Icon at top right + Create Experience Button */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Top Right User Profile Icon badge (face + upper torso) */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#1f153d] border border-purple-500/30 shadow-sm">
            <AvatarProfileIcon
              colors={avatarColors}
              selectedFaceId={selectedFaceId}
              shirtDataUrl={shirtDataUrl}
              size={34}
              shape="circle"
              border={true}
            />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-extrabold text-white leading-tight flex items-center gap-1">
                <span>{currentUser.username}</span>
                {isOwnerUser(currentUser.username) && <VerifiedBadge size="sm" />}
              </div>
              <div className="text-[10px] text-purple-300/70 font-medium">
                {isOwnerUser(currentUser.username) ? 'Owner & Moderator' : 'Creator'}
              </div>
            </div>
          </div>

          {/* Primary Action Button: Create Experience */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-display font-bold text-xs sm:text-sm shadow-lg shadow-purple-900/50 hover:shadow-purple-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Experience</span>
          </button>
        </div>
      </div>

      {/* ================= STUDIO NAVIGATION TABS ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-purple-500/20 pb-2 gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('experiences')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'experiences'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/40'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Experiences</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-black/30 text-purple-200">
              {experiences.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('avatar-items')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'avatar-items'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/40'
            }`}
          >
            <Shirt className="w-4 h-4" />
            <span>Avatar Items</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-black/30 text-purple-200">
              {savedShirts.length + savedPants.length}
            </span>
          </button>

          <button
            onClick={() => {
              setSavedFittedModels(getSavedFittedAccessories());
              setActiveTab('my-models');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'my-models'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-purple-300/70 hover:text-white hover:bg-purple-950/40'
            }`}
          >
            <Boxes className="w-4 h-4 text-amber-400" />
            <span>My Models</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-black/30 text-purple-200 font-mono">
              {savedFittedModels.length}
            </span>
          </button>

          {(isVerifiedUser(currentUser?.username) ||
            isOwnerUser(currentUser?.username) ||
            currentUser?.role === 'admin' ||
            currentUser?.isAdmin === true ||
            currentUser?.email === 'haydensixseven@gmail.com') && (
            <button
              onClick={() => setActiveTab('bulk-upload')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'bulk-upload'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-emerald-300/80 hover:text-white hover:bg-emerald-950/40 border border-emerald-500/20'
              }`}
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Bulk Uploader</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-200 font-bold border border-emerald-400/30">
                ADMIN
              </span>
            </button>
          )}
        </div>

        {/* Search & Reset All Games in Experiences */}
        {activeTab === 'experiences' && (
          <div className="flex items-center gap-2">
            {onResetAllExperiences && experiences.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete all games and reset to the clean starter baseplate?')) {
                    onResetAllExperiences();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-500/30 text-red-300 hover:text-red-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Delete all games and reset"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Games</span>
              </button>
            )}
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search your places..."
              className="px-3 py-1.5 rounded-lg bg-[#18112d] border border-purple-500/20 text-xs text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-400 hidden md:block"
            />
          </div>
        )}
      </div>

      {/* ================= TAB 1: EXPERIENCES ================= */}
      {activeTab === 'experiences' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-purple-300/70 px-1">
            <span>Your created places and baseplate worlds</span>
            <span>{filteredExperiences.length} experiences</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Create New Experience Starter Card */}
            <div
              onClick={() => setShowCreateModal(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setShowCreateModal(true);
              }}
              className="group flex flex-col items-center justify-center p-8 rounded-2xl bg-[#140e28]/70 hover:bg-[#1b1236] border-2 border-dashed border-purple-500/30 hover:border-purple-400 text-center cursor-pointer transition-all duration-200 min-h-[220px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-inner mb-3">
                <FolderPlus className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-white text-base group-hover:text-purple-200 transition-colors">
                Create Experience
              </h3>
              <p className="text-xs text-purple-300/60 max-w-[200px] mt-1">
                Launch full-screen 3D Studio to build &amp; publish
              </p>
            </div>

            {/* Experience Cards */}
            {filteredExperiences.map((exp) => (
              <div
                key={exp.id}
                className="group rounded-2xl bg-[#16102c] border border-purple-500/20 hover:border-purple-400/40 overflow-hidden shadow-lg hover:shadow-purple-950/50 transition-all duration-200 flex flex-col"
              >
                {/* Card Thumbnail */}
                <div className="aspect-[16/9] w-full bg-gradient-to-br from-[#241744] via-[#170f2e] to-[#0d091a] relative flex items-center justify-center p-4">
                  <div className="w-14 h-14 rounded-xl bg-purple-900/50 border border-purple-500/40 flex items-center justify-center text-purple-200 group-hover:scale-105 transition-transform shadow-md">
                    <Boxes className="w-7 h-7 text-purple-300" />
                  </div>

                  {/* Public / Private Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-semibold text-white">
                    {exp.published ? (
                      <>
                        <Globe className="w-3 h-3 text-emerald-400" />
                        <span>Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>Draft</span>
                      </>
                    )}
                  </div>

                  {/* Last updated */}
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-purple-900/80 text-purple-200 text-[10px] font-mono font-bold border border-purple-500/30">
                    {formatTimeAgo(exp.lastUpdated)}
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-4.5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-display font-bold text-white text-base truncate">
                      {exp.name}
                    </h3>
                    <p className="text-xs text-purple-300/70 mt-0.5 line-clamp-2">
                      {exp.description || 'Custom BoBlox Sandbox world'}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-purple-400/60 mt-2 font-mono">
                      <span>{exp.parts?.length || 0} Parts</span>
                      <span>&bull;</span>
                      <span>{exp.likes || 0} Likes</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center gap-2 border-t border-purple-500/15">
                    <button
                      onClick={() => onPlayExperience(exp)}
                      className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Play</span>
                    </button>

                    <button
                      onClick={() => onEditExperienceInStudio(exp)}
                      className="py-2 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/70 border border-purple-500/30 text-purple-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Edit in 3D Studio"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-purple-300" />
                      <span>Studio</span>
                    </button>

                    {onDeleteExperience && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${exp.name}"?`)) {
                            onDeleteExperience(exp.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 text-red-300 hover:text-red-100 transition-colors cursor-pointer"
                        title="Delete Experience"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 2: AVATAR ITEMS (SHIRTS & PANTS CREATOR) ================= */}
      {activeTab === 'avatar-items' && (
        <div className="space-y-8">
          {/* Quick Bulk Upload Callout Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-[#132822] to-[#0f1f1a] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Have multiple shirts &amp; pants files to upload at once?</h3>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  Use the Bulk Uploader to drop all your files, sequence them automatically, and publish everything in one click!
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('bulk-upload')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Launch Bulk Uploader</span>
            </button>
          </div>

          {/* 1. Classic Shirts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-purple-500/15 pb-2">
              <div>
                <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Shirt className="w-5 h-5 text-purple-400" />
                  <span>Classic Shirts</span>
                </h2>
                <p className="text-xs text-purple-300/70">
                  Upload a 585x559 PNG template, give it a name, and save to your shirt inventory.
                </p>
              </div>
            </div>

            {/* Create & Save Shirt Form */}
            <div className="p-5 rounded-2xl bg-[#16102c] border border-purple-500/25 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-4">
                  <label className="text-xs font-bold text-white block mb-1">Shirt Name</label>
                  <input
                    type="text"
                    value={shirtName}
                    onChange={(e) => setShirtName(e.target.value)}
                    placeholder="e.g. Purple Galaxy Hoodie"
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1438] border border-purple-500/30 text-xs text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="md:col-span-5">
                  <label className="text-xs font-bold text-white block mb-1">Template Image (585 × 559 PNG)</label>
                  <label className="w-full cursor-pointer block">
                    <input
                      type="file"
                      accept="image/png"
                      onChange={handleShirtFileUpload}
                      className="hidden"
                    />
                    <div className="w-full py-2 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 text-xs font-bold text-purple-200 text-center flex items-center justify-center gap-2 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{shirtDataToSave ? 'Template Loaded (Click to Change)' : 'Choose 585x559 PNG File'}</span>
                    </div>
                  </label>
                </div>

                <div className="md:col-span-3 flex items-end">
                  <button
                    onClick={handleSaveShirt}
                    disabled={!shirtDataToSave}
                    className={`w-full py-2 px-4 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer ${
                      shirtDataToSave
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/50'
                        : 'bg-purple-950/30 text-purple-500/50 border border-purple-500/10 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save &amp; Equip Shirt</span>
                  </button>
                </div>
              </div>

              {/* Toggle On Sale in Marketplace */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#1d143a] border border-purple-500/25">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">On Sale in Marketplace</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                      Free for Community
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-300/70">
                    When toggled on, your shirt is published to the Marketplace so anyone can try it on in 3D and buy it for free!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShirtOnSale(!shirtOnSale)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                    shirtOnSale ? 'bg-purple-600 ring-2 ring-purple-400/40' : 'bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={shirtOnSale}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      shirtOnSale ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {shirtError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{shirtError}</span>
                </div>
              )}
            </div>

            {/* Saved Shirts Grid */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                Your Saved Shirts ({savedShirts.length})
              </h3>
              {savedShirts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                  {savedShirts.map((s) => {
                    const isEquipped = shirtDataUrl === s.dataUrl;
                    return (
                      <div
                        key={s.id}
                        onClick={() => onSelectShirt(s.dataUrl)}
                        className={`group flex flex-col rounded-xl bg-[#16102a] border transition-all p-3 cursor-pointer ${
                          isEquipped
                            ? 'border-purple-400 bg-purple-900/30 ring-2 ring-purple-500/40 shadow-md'
                            : 'border-purple-500/20 hover:border-purple-400/50'
                        }`}
                      >
                        <div className="aspect-square w-full rounded-lg bg-[#120c22] border border-white/10 flex items-center justify-center p-2 mb-2 relative overflow-hidden">
                          {s.previewUrl ? (
                            <img src={s.previewUrl} alt={s.name} className="w-full h-full object-contain" />
                          ) : (
                            <Shirt className="w-8 h-8 text-purple-400" />
                          )}
                          {isEquipped && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-white truncate">{s.name}</span>
                        <span className="text-[10px] text-purple-400/60 mt-0.5">
                          {isEquipped ? 'Equipped' : 'Click to Equip'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-purple-400/50 italic">No custom shirts created yet.</p>
              )}
            </div>
          </div>

          {/* 2. Classic Pants Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-purple-500/15 pb-2">
              <div>
                <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Shirt className="w-5 h-5 text-purple-400" />
                  <span>Classic Pants</span>
                </h2>
                <p className="text-xs text-purple-300/70">
                  Upload a 585x559 PNG template, give it a name, and save to your pants inventory.
                </p>
              </div>
            </div>

            {/* Create & Save Pants Form */}
            <div className="p-5 rounded-2xl bg-[#16102c] border border-purple-500/25 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-4">
                  <label className="text-xs font-bold text-white block mb-1">Pants Name</label>
                  <input
                    type="text"
                    value={pantsName}
                    onChange={(e) => setPantsName(e.target.value)}
                    placeholder="e.g. Tactical Cargo Pants"
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1438] border border-purple-500/30 text-xs text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="md:col-span-5">
                  <label className="text-xs font-bold text-white block mb-1">Template Image (585 × 559 PNG)</label>
                  <label className="w-full cursor-pointer block">
                    <input
                      type="file"
                      accept="image/png"
                      onChange={handlePantsFileUpload}
                      className="hidden"
                    />
                    <div className="w-full py-2 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 text-xs font-bold text-purple-200 text-center flex items-center justify-center gap-2 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{pantsDataToSave ? 'Template Loaded (Click to Change)' : 'Choose 585x559 PNG File'}</span>
                    </div>
                  </label>
                </div>

                <div className="md:col-span-3 flex items-end">
                  <button
                    onClick={handleSavePants}
                    disabled={!pantsDataToSave}
                    className={`w-full py-2 px-4 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer ${
                      pantsDataToSave
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/50'
                        : 'bg-purple-950/30 text-purple-500/50 border border-purple-500/10 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save &amp; Equip Pants</span>
                  </button>
                </div>
              </div>

              {/* Toggle On Sale in Marketplace */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#1d143a] border border-purple-500/25">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">On Sale in Marketplace</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                      Free for Community
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-300/70">
                    When toggled on, your pants are published to the Marketplace so anyone can try them on in 3D and buy them for free!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPantsOnSale(!pantsOnSale)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                    pantsOnSale ? 'bg-purple-600 ring-2 ring-purple-400/40' : 'bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={pantsOnSale}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      pantsOnSale ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {pantsError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{pantsError}</span>
                </div>
              )}
            </div>

            {/* Saved Pants Grid */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                Your Saved Pants ({savedPants.length})
              </h3>
              {savedPants.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                  {savedPants.map((p) => {
                    const isEquipped = pantsDataUrl === p.dataUrl;
                    return (
                      <div
                        key={p.id}
                        onClick={() => onSelectPants(p.dataUrl)}
                        className={`group flex flex-col rounded-xl bg-[#16102a] border transition-all p-3 cursor-pointer ${
                          isEquipped
                            ? 'border-purple-400 bg-purple-900/30 ring-2 ring-purple-500/40 shadow-md'
                            : 'border-purple-500/20 hover:border-purple-400/50'
                        }`}
                      >
                        <div className="aspect-square w-full rounded-lg bg-[#120c22] border border-white/10 flex items-center justify-center p-2 mb-2 relative overflow-hidden">
                          {p.previewUrl ? (
                            <img src={p.previewUrl} alt={p.name} className="w-full h-full object-contain" />
                          ) : (
                            <Shirt className="w-8 h-8 text-purple-400" />
                          )}
                          {isEquipped && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-white truncate">{p.name}</span>
                        <span className="text-[10px] text-purple-400/60 mt-0.5">
                          {isEquipped ? 'Equipped' : 'Click to Equip'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-purple-400/50 italic">No custom pants created yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: MY MODELS (FITTED 3D ACCESSORIES & HAIR) ================= */}
      {activeTab === 'my-models' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/60 via-[#1b1236] to-[#100a22] border border-purple-500/25 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 shrink-0">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-display font-extrabold text-white flex items-center gap-2">
                  <span>My Fitted 3D Models</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-bold border border-amber-400/30">
                    ASSET HUB
                  </span>
                </h2>
                <p className="text-xs text-purple-300/80 mt-0.5">
                  Models fitted on the Dummy in Studio. Upload your custom Hair, Hats, Back Accessories (wings, swords, backpacks) to the BoBlox Marketplace for <span className="font-bold text-amber-300">100 BOBUX</span>!
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setSavedFittedModels(getSavedFittedAccessories());
              }}
              className="px-4 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Refresh Models
            </button>
          </div>

          {savedFittedModels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {savedFittedModels.map((model) => (
                <div
                  key={model.id}
                  className="rounded-2xl bg-[#16102c] border border-purple-500/20 p-4 space-y-3 flex flex-col justify-between shadow-lg hover:border-purple-400/40 transition-all"
                >
                  <div>
                    <div className="aspect-square w-full rounded-xl bg-[#100a20] border border-white/10 flex flex-col items-center justify-center p-3 relative overflow-hidden">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border border-white/20"
                        style={{ backgroundColor: model.color || '#a855f7' }}
                      >
                        <Sparkles className="w-8 h-8 text-white" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 font-bold uppercase mt-3">
                        {model.category} • {model.offset?.parentBone || 'Head'}
                      </span>
                    </div>

                    <div className="mt-3">
                      <h3 className="font-bold text-white text-sm truncate">{model.name}</h3>
                      <p className="text-[11px] text-purple-300/70 mt-0.5">
                        By @{model.creatorUsername || currentUser.username}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-purple-500/15 flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {model.price > 0 ? `${model.price} BOBUX` : 'Free'}
                    </span>

                    <button
                      onClick={() => {
                        setSelectedModelForUpload(model);
                        setUploadBobuxPrice(model.price || 0);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload (100 BOBUX)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-[#140e28] border border-purple-500/20 space-y-3">
              <Boxes className="w-12 h-12 text-purple-400/40 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Fitted Models Yet</h3>
              <p className="text-xs text-purple-300/70 max-w-md mx-auto">
                Open any experience in 3D Studio, click "Insert Dummy", attach a 3D model, and right-click to "Save Model to BoBlox"!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Model Marketplace Upload Dialog */}
      {selectedModelForUpload && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedModelForUpload(null)}
        >
          <div
            className="w-full max-w-md bg-[#160f2e] border border-purple-500/30 rounded-2xl shadow-2xl p-6 space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedModelForUpload(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-purple-400 hover:text-white hover:bg-purple-900/40 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
                <Upload className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base text-white">
                  Upload Model to BoBlox Marketplace
                </h3>
                <p className="text-xs text-purple-300/70">
                  Listing fee: <span className="font-bold text-amber-300">100 BOBUX</span>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/20 space-y-2 text-xs">
              <div className="flex justify-between text-purple-200">
                <span>Model Name:</span>
                <span className="font-bold text-white">{selectedModelForUpload.name}</span>
              </div>
              <div className="flex justify-between text-purple-200">
                <span>Category:</span>
                <span className="font-bold text-amber-300 capitalize">{selectedModelForUpload.category}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-purple-200 block mb-1.5">Marketplace Selling Price</label>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold text-sm">B$</span>
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  value={uploadBobuxPrice}
                  onChange={(e) => setUploadBobuxPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0 for Free"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1d153a] border border-purple-500/30 text-white font-mono text-sm focus:outline-none focus:border-purple-400"
                />
              </div>
              <p className="text-[10px] text-purple-400/70 mt-1">Set to 0 for Free or enter Bobux price to earn Bobux from buyers!</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-purple-500/20">
              <button
                type="button"
                onClick={() => setSelectedModelForUpload(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-purple-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={uploadingModel}
                onClick={async () => {
                  setUploadingModel(true);
                  const updatedItem = {
                    ...selectedModelForUpload,
                    price: uploadBobuxPrice,
                    onSale: true,
                  };
                  const res = await publishFittedAccessoryToMarketplace(updatedItem, currentUser.username);
                  setUploadingModel(false);
                  if (!res.success) {
                    alert(res.error || 'Upload failed');
                  } else {
                    setSelectedModelForUpload(null);
                    setSavedFittedModels(getSavedFittedAccessories());
                    alert(`Successfully uploaded "${updatedItem.name}" to Marketplace! Remaining balance: ${res.remainingBobux} BOBUX.`);
                  }
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-900/50 flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{uploadingModel ? 'Uploading...' : 'Confirm Upload (100 BOBUX)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: BULK CLOTHING UPLOADER ================= */}
      {activeTab === 'bulk-upload' &&
        (isVerifiedUser(currentUser?.username) ||
          isOwnerUser(currentUser?.username) ||
          currentUser?.role === 'admin' ||
          currentUser?.isAdmin === true ||
          currentUser?.email === 'haydensixseven@gmail.com') && (
          <BulkClothingUploader
            currentUser={currentUser}
            onUploadComplete={() => {
              setSavedShirts(getSavedShirtsInventory());
              setSavedPants(getSavedPantsInventory());
            }}
            onOpenMarketplace={onOpenMarketplace}
            onOpenAvatarEditor={onOpenAvatarEditor}
          />
        )}

      {/* ================= CREATE EXPERIENCE MODAL ================= */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#181130] border border-purple-500/30 rounded-2xl p-6 shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-purple-400 hover:text-white hover:bg-purple-900/40 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Create New Experience
                </h3>
                <p className="text-xs text-purple-300/70">
                  Choose name &amp; starting template to launch Studio
                </p>
              </div>
            </div>

            {/* Experience Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white">Experience Name</label>
              <input
                type="text"
                value={newExpName}
                onChange={(e) => setNewExpName(e.target.value)}
                placeholder="e.g. My Epic Obby World"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1438] border border-purple-500/30 text-sm text-white focus:outline-none focus:border-purple-400"
                autoFocus
              />
            </div>

            {/* Starting Template */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white">Starting Template</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewExpTemplate('baseplate')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    newExpTemplate === 'baseplate'
                      ? 'border-purple-400 bg-purple-900/40 text-white shadow-md'
                      : 'border-purple-500/20 bg-[#1c1438] text-purple-300/70 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">Classic Baseplate</div>
                  <div className="text-[10px] text-purple-400/60 mt-0.5">512x512 stud sandbox</div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewExpTemplate('flat_grass')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    newExpTemplate === 'flat_grass'
                      ? 'border-purple-400 bg-purple-900/40 text-white shadow-md'
                      : 'border-purple-500/20 bg-[#1c1438] text-purple-300/70 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">Flat Terrain</div>
                  <div className="text-[10px] text-purple-400/60 mt-0.5">Starter grass &amp; hills</div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateExperience}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-display font-bold text-xs shadow-md shadow-purple-600/30 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create &amp; Launch Studio</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
