import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  User,
  Users,
  UserPlus,
  UserCheck,
  Play,
  Shirt,
  Boxes,
  Calendar,
  Sparkles,
  Share2,
  Check,
  ExternalLink,
  Edit3,
  Save,
  RotateCcw,
  Tag,
  ShieldCheck,
  Trophy,
  Award,
  Flame,
  Clock,
  ArrowRight,
  Send,
  MoreHorizontal,
  MessageSquare,
  Gamepad2,
  History,
  AlertTriangle,
  Layers,
  ChevronRight,
  Heart
} from 'lucide-react';
import AvatarProfileIcon from './AvatarProfileIcon';
import ProfileAvatarShowcase from './ProfileAvatarShowcase';
import ClothingItemThumb from './ClothingItemThumb';
import VerifiedBadge, { isOwnerUser, isCoOwnerUser, isVerifiedUser } from './VerifiedBadge';
import {
  UserProfile,
  sendFriendRequest,
  toggleFollowUser,
  subscribeUserProfile,
  updateUserBio,
  subscribeFriendsList
} from '../services/firebase';
import { ExperienceData, formatTimeAgo } from '../types/experience';
import { AvatarColors, DEFAULT_GREY } from './AvatarViewer';
import { getSavedShirtsInventory, getSavedPantsInventory, CustomClothingItem, deduplicateCustomClothingItems } from '../types/avatarInventory';
import { getSavedMarketplaceItems, MarketplaceClothingItem, subscribeMarketplaceFromFirestore } from '../types/marketplace';
import { getFaceTexture, createFaceMesh, getFacePreviewUrl } from '../utils/faceTexture';
import { attachShirtToLimbs } from '../utils/shirtTexture';
import { attachPantsToLimbs } from '../utils/pantsTexture';
import { createHairMesh } from '../utils/hairMesh';
import { openTransferBobuxModal } from './BobuxCurrency';
import bobuxImg from '../assets/bobux.png';

interface ProfilePageProps {
  userId: string;
  currentUserId: string;
  currentUserProfile: UserProfile | null;
  onOpenAvatarEditor: () => void;
  onOpenStudio: () => void;
  onOpenMarketplace: () => void;
  onPlayExperience: (exp: ExperienceData) => void;
  allExperiences: ExperienceData[];
  onEquipShirt: (url: string | null) => void;
  onEquipPants: (url: string | null) => void;
  onNavigateToUser?: (uid: string) => void;
}

export default function ProfilePage({
  userId,
  currentUserId,
  currentUserProfile,
  onOpenAvatarEditor,
  onOpenStudio,
  onOpenMarketplace,
  onPlayExperience,
  allExperiences = [],
  onEquipShirt,
  onEquipPants,
  onNavigateToUser
}: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'creations'>('about');
  const [requestSent, setRequestSent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Bio & Alias Editing State
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [showAliasInput, setShowAliasInput] = useState(false);
  const [userAlias, setUserAlias] = useState('');

  // Currently Wearing 3D Preview vs 2D mode & Pagination
  const [wearing3DMode, setWearing3DMode] = useState<boolean>(true);
  const [wearingPage, setWearingPage] = useState<number>(0);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState<boolean>(false);

  // Creations sub-filter
  const [creationsFilter, setCreationsFilter] = useState<'experiences' | 'clothing'>('experiences');

  const isSelf = userId === currentUserId;

  // Real-time profile subscription
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeUserProfile(userId, (data) => {
      setProfile(data);
      if (data) {
        setBioText(data.bio || '');
        document.title = `BoBlox | ${data.username}'s Profile`;
      }
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceClothingItem[]>([]);
  const [resolvedFriends, setResolvedFriends] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!profile?.friends || profile.friends.length === 0) {
      setResolvedFriends([]);
      return;
    }
    const unsub = subscribeFriendsList(profile.friends, (friends) => {
      setResolvedFriends(friends);
    });
    return () => unsub?.();
  }, [profile?.friends]);

  useEffect(() => {
    getSavedMarketplaceItems().then((items) => setMarketplaceItems(items));
    const unsub = subscribeMarketplaceFromFirestore((items) => setMarketplaceItems(items));
    return () => unsub?.();
  }, []);

  const isFriend = currentUserProfile?.friends?.includes(profile?.id || '') || profile?.friends?.includes(currentUserId);
  const hasSentRequest = profile?.friendRequests?.some((r) => r.fromUid === currentUserId) || requestSent;
  const isFollowing = currentUserProfile?.following?.includes(profile?.id || '');

  // User's experiences (ONLY created by this user)
  const userExperiences = allExperiences.filter(
    (exp) => exp.creatorId === profile?.id || exp.creatorUsername === profile?.username
  );

  // User's created clothing ONLY (Items made by this user in inventory or marketplace)
  const allShirts = getSavedShirtsInventory();
  const allPants = getSavedPantsInventory();

  const marketShirtsByUser: CustomClothingItem[] = marketplaceItems
    .filter(
      (m) =>
        m.type === 'shirt' &&
        (m.creatorId === profile?.id ||
          (m.creatorUsername && profile?.username && m.creatorUsername.toLowerCase() === profile.username.toLowerCase()))
    )
    .map((m) => ({
      id: m.id,
      name: m.name,
      type: 'shirt',
      dataUrl: m.dataUrl,
      previewUrl: m.previewUrl,
      createdAt: m.createdAt,
      creatorId: m.creatorId,
      creatorUsername: m.creatorUsername,
      isCreator: true,
    }));

  const marketPantsByUser: CustomClothingItem[] = marketplaceItems
    .filter(
      (m) =>
        m.type === 'pants' &&
        (m.creatorId === profile?.id ||
          (m.creatorUsername && profile?.username && m.creatorUsername.toLowerCase() === profile.username.toLowerCase()))
    )
    .map((m) => ({
      id: m.id,
      name: m.name,
      type: 'pants',
      dataUrl: m.dataUrl,
      previewUrl: m.previewUrl,
      createdAt: m.createdAt,
      creatorId: m.creatorId,
      creatorUsername: m.creatorUsername,
      isCreator: true,
    }));

  const userCreatedShirts = deduplicateCustomClothingItems([
    ...allShirts.filter(
      (s) =>
        s.isCreator &&
        (s.creatorId === profile?.id ||
          (s.creatorUsername && profile?.username && s.creatorUsername.toLowerCase() === profile.username.toLowerCase()))
    ),
    ...marketShirtsByUser,
  ]);

  const userCreatedPants = deduplicateCustomClothingItems([
    ...allPants.filter(
      (p) =>
        p.isCreator &&
        (p.creatorId === profile?.id ||
          (p.creatorUsername && profile?.username && p.creatorUsername.toLowerCase() === profile.username.toLowerCase()))
    ),
    ...marketPantsByUser,
  ]);

  const totalUserCreations = userExperiences.length + userCreatedShirts.length + userCreatedPants.length;

  const handleSendFriendReq = async () => {
    if (!currentUserProfile || !profile) return;
    setRequestSent(true);
    await sendFriendRequest(currentUserProfile, profile.id);
  };

  const handleFollowToggle = async () => {
    if (!currentUserProfile || !profile) return;
    await toggleFollowUser(currentUserId, profile.id);
  };

  const handleSaveBio = async () => {
    if (!currentUserProfile || !profile) return;
    setSavingBio(true);
    await updateUserBio(profile.id, bioText);
    setSavingBio(false);
    setIsEditingBio(false);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  if (loading || !profile) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading BoBlox Profile...</p>
      </div>
    );
  }

  const effectiveProfile: UserProfile = (isSelf && currentUserProfile)
    ? {
        ...profile,
        ...currentUserProfile,
        avatarColors: currentUserProfile.avatarColors || profile.avatarColors,
        selectedFaceId: currentUserProfile.selectedFaceId || profile.selectedFaceId,
        shirtDataUrl: currentUserProfile.shirtDataUrl !== undefined ? currentUserProfile.shirtDataUrl : profile.shirtDataUrl,
        pantsDataUrl: currentUserProfile.pantsDataUrl !== undefined ? currentUserProfile.pantsDataUrl : profile.pantsDataUrl,
        selectedHairId: currentUserProfile.selectedHairId || profile.selectedHairId,
        hairColor: currentUserProfile.hairColor || profile.hairColor,
        customHairObj: currentUserProfile.customHairObj !== undefined ? currentUserProfile.customHairObj : profile.customHairObj,
        selectedAccessoryId: currentUserProfile.selectedAccessoryId || profile.selectedAccessoryId,
      }
    : profile;

  const isOwner = isOwnerUser(effectiveProfile.username);
  const isCoOwner = isCoOwnerUser(effectiveProfile.username);
  const isVerified = isVerifiedUser(effectiveProfile.username);

  // Status quote
  const statusQuote = effectiveProfile.bio ? `"${effectiveProfile.bio.split('\n')[0]}"` : '"Got Root? Didn\'t think so!"';

  // Currently Worn Items List (Accessories, Clothing, Animations/Poses)
  const wornItems = [
    {
      id: 'item-shirt',
      name: effectiveProfile.shirtDataUrl ? 'Custom Classic Shirt' : 'Classic Grey Shirt',
      type: 'Shirt',
      previewUrl: effectiveProfile.shirtDataUrl,
      isDefault: !effectiveProfile.shirtDataUrl,
    },
    {
      id: 'item-pants',
      name: effectiveProfile.pantsDataUrl ? 'Custom Classic Jeans' : 'Standard Denim Jeans',
      type: 'Pants',
      previewUrl: effectiveProfile.pantsDataUrl,
      isDefault: !effectiveProfile.pantsDataUrl,
    },
    {
      id: 'item-hair',
      name: effectiveProfile.selectedHairId && effectiveProfile.selectedHairId !== 'none' ? effectiveProfile.selectedHairId.replace('-', ' ') : 'Bare Head',
      type: 'Hair',
      previewUrl: null,
      isDefault: false,
    },
    {
      id: 'item-face',
      name: effectiveProfile.selectedFaceId ? effectiveProfile.selectedFaceId.replace('-', ' ') : 'Classic Smile',
      type: 'Face',
      previewUrl: null,
      isDefault: false,
    },
    {
      id: 'item-accessory',
      name: effectiveProfile.selectedAccessoryId && effectiveProfile.selectedAccessoryId !== 'none' ? effectiveProfile.selectedAccessoryId.replace('-', ' ') : 'No Accessory',
      type: 'Accessory',
      previewUrl: null,
      isDefault: !effectiveProfile.selectedAccessoryId || effectiveProfile.selectedAccessoryId === 'none',
    },
    {
      id: 'item-pose1',
      name: 'R6 Hero Pose',
      type: 'Animation',
      previewUrl: null,
      isDefault: true,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-24 animate-fadeIn font-sans text-white">
      {/* ================= 1. ROBLOX PROFILE HEADER (DARK THEME MATCHING SITE) ================= */}
      <div className="bg-[#130d24] rounded-2xl border border-purple-500/20 shadow-xl p-6 sm:p-8 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Avatar Circle + Controller Badge & User Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Big Circular Avatar with green controller badge at bottom-right */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-[#1f143a] border-2 border-purple-400/40 shadow-lg flex items-center justify-center">
                <AvatarProfileIcon
                  colors={effectiveProfile.avatarColors}
                  selectedFaceId={effectiveProfile.selectedFaceId}
                  shirtDataUrl={effectiveProfile.shirtDataUrl}
                  pantsDataUrl={effectiveProfile.pantsDataUrl}
                  selectedHairId={effectiveProfile.selectedHairId}
                  hairColor={effectiveProfile.hairColor}
                  customHairObj={effectiveProfile.customHairObj}
                  selectedAccessoryId={effectiveProfile.selectedAccessoryId}
                  size={112}
                  shape="circle"
                  border={false}
                  framing="bust"
                />
              </div>

              {/* Green Game Controller Badge (indicates online/in-game as shown in reference) */}
              {(isSelf || (profile.lastActive && Date.now() - profile.lastActive < 1000 * 150)) && (
                <div
                  className="absolute bottom-0 right-0 w-7 h-7 bg-[#00b06f] rounded-full border-2 border-[#130d24] flex items-center justify-center text-white shadow-sm"
                  title="Online in BoBlox"
                >
                  <Gamepad2 className="w-4 h-4 fill-white text-white" />
                </div>
              )}
            </div>

            {/* Username, Bio Status Quote, & Stats */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
                  {profile.displayName || profile.username}
                </h1>

                {isVerified && <VerifiedBadge username={profile.username} size="md" />}
                {isOwner && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/40">
                    OWNER
                  </span>
                )}
                {isCoOwner && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/40">
                    CO-OWNER
                  </span>
                )}
              </div>

              {/* Status Quote */}
              <p className="text-sm text-purple-300/80 italic font-medium">
                {statusQuote}
              </p>

              {/* Stats Counters: 91 Friends • 124 Followers • 11 Following */}
              <div className="flex items-center gap-4 text-xs sm:text-sm pt-1 text-purple-200/80">
                <div>
                  <span className="font-bold text-white">{profile.friends?.length || 91}</span>{' '}
                  <span className="text-purple-300/60">Friends</span>
                </div>
                <div>
                  <span className="font-bold text-white">{profile.followers?.length || 124}</span>{' '}
                  <span className="text-purple-300/60">Followers</span>
                </div>
                <div>
                  <span className="font-bold text-white">{profile.following?.length || 11}</span>{' '}
                  <span className="text-purple-300/60">Following</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Three Dots Menu + Action Buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0">
            {/* Top Three Dots Options Button */}
            <div className="relative self-end">
              <button
                onClick={() => setMenuDropdownOpen((p) => !p)}
                className="p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-900/30 transition-colors cursor-pointer"
                title="More Options"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {menuDropdownOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-xl bg-[#1b1238] border border-purple-500/30 shadow-xl py-1 z-30 text-xs">
                  <button
                    onClick={() => {
                      handleShare();
                      setMenuDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-purple-200 hover:bg-purple-900/40 flex items-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-purple-400" />
                    <span>{copiedLink ? 'Link Copied!' : 'Share Profile'}</span>
                  </button>
                  <button
                    onClick={() => {
                      openTransferBobuxModal(profile.username);
                      setMenuDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-purple-200 hover:bg-purple-900/40 flex items-center gap-2 cursor-pointer"
                  >
                    <img src={bobuxImg} alt="" className="w-4 h-4 object-contain" />
                    <span>Transfer Robux</span>
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2">
              {isSelf ? (
                <>
                  <button
                    onClick={onOpenAvatarEditor}
                    className="px-4 py-2 rounded-lg bg-[#271b48] hover:bg-[#382666] border border-purple-500/30 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Shirt className="w-3.5 h-3.5 text-purple-300" />
                    <span>Edit Avatar</span>
                  </button>
                  <button
                    onClick={onOpenStudio}
                    className="px-4 py-2 rounded-lg bg-[#1a1233] border border-purple-500/30 hover:bg-[#251a4a] text-purple-200 hover:text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Boxes className="w-3.5 h-3.5 text-purple-400" />
                    <span>BoBlox Studio</span>
                  </button>
                  <button
                    onClick={() => openTransferBobuxModal()}
                    className="px-3.5 py-2 rounded-lg bg-[#00b06f] hover:bg-[#009b61] text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Transfer Robux"
                  >
                    <img src={bobuxImg} alt="" className="w-3.5 h-3.5 object-contain" />
                    <span>Transfer</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Join Game Button */}
                  {userExperiences.length > 0 ? (
                    <button
                      onClick={() => onPlayExperience(userExperiences[0])}
                      className="px-4 py-2 rounded-lg bg-[#271b48] hover:bg-[#382666] border border-purple-500/30 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>Join Game</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onPlayExperience(allExperiences[0])}
                      className="px-4 py-2 rounded-lg bg-[#271b48] hover:bg-[#382666] border border-purple-500/30 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>Join Game</span>
                    </button>
                  )}

                  {/* Chat Button */}
                  <button
                    onClick={() => {
                      if (userExperiences.length > 0) onPlayExperience(userExperiences[0]);
                      else if (allExperiences.length > 0) onPlayExperience(allExperiences[0]);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#1a1233] border border-purple-500/30 hover:bg-[#251a4a] text-purple-200 hover:text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>Chat</span>
                  </button>

                  {/* Unfriend / Add Friend Button */}
                  <button
                    onClick={handleSendFriendReq}
                    disabled={isFriend || hasSentRequest}
                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      isFriend
                        ? 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30'
                        : hasSentRequest
                        ? 'bg-purple-950/40 border border-purple-500/20 text-purple-400 cursor-default'
                        : 'bg-[#00a2ff] hover:bg-[#008fe6] text-white'
                    }`}
                  >
                    {isFriend ? 'Unfriend' : hasSentRequest ? 'Request Sent' : 'Add Friend'}
                  </button>

                  {/* Direct Transfer Robux Button */}
                  <button
                    onClick={() => openTransferBobuxModal(profile.username)}
                    className="px-3 py-2 rounded-lg bg-[#00b06f] hover:bg-[#009b61] text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                    title={`Transfer Robux to ${profile.username}`}
                  >
                    <img src={bobuxImg} alt="" className="w-3.5 h-3.5 object-contain" />
                    <span>Transfer</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. PROFILE TAB NAVIGATION (ABOUT / CREATIONS) ================= */}
      <div className="bg-[#130d24] rounded-2xl border border-purple-500/20 shadow-xl overflow-hidden">
        {/* Top Tabs Bar */}
        <div className="flex items-center border-b border-purple-500/20 px-6">
          <button
            onClick={() => setActiveTab('about')}
            className={`py-3.5 px-6 font-bold text-sm sm:text-base transition-all cursor-pointer relative ${
              activeTab === 'about'
                ? 'text-white border-b-2 border-purple-400'
                : 'text-purple-300/60 hover:text-white'
            }`}
          >
            About
          </button>

          <button
            onClick={() => setActiveTab('creations')}
            className={`py-3.5 px-6 font-bold text-sm sm:text-base transition-all cursor-pointer relative ${
              activeTab === 'creations'
                ? 'text-white border-b-2 border-purple-400'
                : 'text-purple-300/60 hover:text-white'
            }`}
          >
            Creations
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* TAB 1: ABOUT */}
          {activeTab === 'about' && (
            <div className="space-y-8">
              {/* About Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white font-display">About</h2>
                  {isSelf && !isEditingBio && (
                    <button
                      onClick={() => setIsEditingBio(true)}
                      className="text-xs font-semibold text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {isEditingBio ? (
                  <div className="space-y-3">
                    <textarea
                      value={bioText}
                      onChange={(e) => setBioText(e.target.value)}
                      placeholder="Write your about bio..."
                      rows={3}
                      maxLength={500}
                      className="w-full p-3 rounded-xl bg-[#1b1238] border border-purple-500/30 text-sm focus:outline-none focus:border-purple-400 text-white placeholder-purple-300/40"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setBioText(profile.bio || '');
                          setIsEditingBio(false);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-300 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveBio}
                        disabled={savingBio}
                        className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
                      >
                        {savingBio ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-purple-200/90 leading-relaxed whitespace-pre-wrap">
                    {profile.bio || '*'}
                  </p>
                )}

                {/* Divider Line */}
                <div className="border-b border-purple-500/20 my-3" />

                {/* Alias Row */}
                <div className="flex items-center justify-between text-sm text-purple-300/70 py-0.5">
                  <span className="font-medium text-purple-200">Alias</span>
                  <button
                    onClick={() => setShowAliasInput((p) => !p)}
                    className="text-purple-400 hover:text-purple-200 cursor-pointer"
                    title="Edit Alias"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                {/* Footer Link Row (Report Abuse) */}
                <div className="flex items-center justify-end text-xs pt-1">
                  <button
                    onClick={() => {}}
                    className="text-red-400 hover:underline font-semibold cursor-pointer"
                  >
                    Report Abuse
                  </button>
                </div>
              </div>

              {/* ================= CURRENTLY WEARING SECTION (COMPACT DARK THEME) ================= */}
              <div className="space-y-3 pt-1">
                <h2 className="text-xl font-bold text-white font-display">Currently Wearing</h2>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                  {/* Left Column: Compact Rounded Avatar Container with Spinning 3D and 2D mode */}
                  <div className="md:col-span-5 lg:col-span-4 bg-[#0f091f] rounded-2xl p-2.5 relative flex items-center justify-center min-h-[200px] max-h-[220px] shadow-inner border border-purple-500/20 overflow-hidden">
                    <ProfileAvatarShowcase
                      colors={effectiveProfile.avatarColors}
                      selectedFaceId={effectiveProfile.selectedFaceId}
                      shirtDataUrl={effectiveProfile.shirtDataUrl}
                      pantsDataUrl={effectiveProfile.pantsDataUrl}
                      selectedHairId={effectiveProfile.selectedHairId}
                      hairColor={effectiveProfile.hairColor}
                      customHairObj={effectiveProfile.customHairObj}
                      selectedAccessoryId={effectiveProfile.selectedAccessoryId}
                      is3D={wearing3DMode}
                      onToggle3D={() => setWearing3DMode((p) => !p)}
                    />
                  </div>

                  {/* Right Column: 4x2 Grid of Worn Item Thumbnails with Folded Clothing & Pagination */}
                  <div className="md:col-span-7 lg:col-span-8 flex flex-col justify-between space-y-2.5">
                    <div className="grid grid-cols-4 gap-2.5">
                      {wornItems.slice(wearingPage * 8, wearingPage * 8 + 8).map((item) => (
                        <div
                          key={item.id}
                          className="bg-[#1b1238] hover:bg-[#26194e] border border-purple-500/20 rounded-xl p-2 flex flex-col items-center justify-center aspect-square shadow-2xs transition-all hover:scale-105 cursor-pointer relative group"
                          title={`${item.name} (${item.type})`}
                        >
                          {item.type === 'Shirt' ? (
                            <ClothingItemThumb
                              dataUrl={item.previewUrl}
                              type="shirt"
                              name={item.name}
                            />
                          ) : item.type === 'Pants' ? (
                            <ClothingItemThumb
                              dataUrl={item.previewUrl}
                              type="pants"
                              name={item.name}
                            />
                          ) : item.type === 'Face' ? (
                            <img
                              src={getFacePreviewUrl(profile.selectedFaceId || 'classic-smile')}
                              alt="Face"
                              className="w-7 h-7 object-contain"
                            />
                          ) : item.type === 'Animation' ? (
                            <div className="w-full h-full rounded bg-purple-950/40 border border-purple-500/20 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-purple-300 uppercase">R6</span>
                            </div>
                          ) : item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="w-full h-full object-contain filter drop-shadow-xs"
                            />
                          ) : (
                            <Sparkles className="w-6 h-6 text-purple-400" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Pagination Dots Below Grid: ● ○ */}
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        onClick={() => setWearingPage(0)}
                        className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                          wearingPage === 0 ? 'bg-purple-400 scale-125' : 'bg-purple-950/60 border border-purple-500/30 hover:bg-purple-700'
                        }`}
                      />
                      <button
                        onClick={() => setWearingPage(1)}
                        className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                          wearingPage === 1 ? 'bg-purple-400 scale-125' : 'bg-purple-950/60 border border-purple-500/30 hover:bg-purple-700'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= FRIENDS SECTION (HORIZONTAL ROW) ================= */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white font-display">
                    Friends ({profile.friends?.length || 91})
                  </h2>
                  <button
                    onClick={() => {}}
                    className="text-sm font-semibold text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <span>See All</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {resolvedFriends.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-4">
                    {resolvedFriends.slice(0, 8).map((friend) => (
                      <div
                        key={friend.id}
                        onClick={() => onNavigateToUser?.(friend.id)}
                        className="flex flex-col items-center text-center gap-2 group cursor-pointer"
                      >
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-[#1a1233] border border-purple-500/30 group-hover:border-purple-400 group-hover:scale-105 transition-transform flex items-center justify-center shadow-md">
                          <AvatarProfileIcon
                            colors={friend.avatarColors}
                            selectedFaceId={friend.selectedFaceId}
                            shirtDataUrl={friend.shirtDataUrl}
                            pantsDataUrl={friend.pantsDataUrl}
                            selectedHairId={friend.selectedHairId}
                            hairColor={friend.hairColor}
                            size={64}
                            shape="circle"
                            border={false}
                            framing="bust"
                          />
                        </div>
                        <span className="text-xs font-semibold text-purple-200 truncate w-full group-hover:text-white">
                          {friend.displayName || friend.username}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex flex-col items-center text-center gap-2">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#1a1233] border border-purple-500/20 flex items-center justify-center shadow-xs">
                          <User className="w-6 h-6 text-purple-400/60" />
                        </div>
                        <span className="text-xs font-semibold text-purple-300/70">Friend {i + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ================= ROBLOX BADGES & ACHIEVEMENTS ================= */}
              <div className="space-y-4 pt-4 border-t border-purple-500/20">
                <h2 className="text-xl font-bold text-white font-display">Roblox Badges</h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#1b1238] border border-purple-500/20 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center mx-auto shadow-xs font-bold text-lg">
                      🛡️
                    </div>
                    <h4 className="font-bold text-xs text-white">Administrator</h4>
                    <p className="text-[11px] text-purple-300/60">BoBlox verified member</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1b1238] border border-purple-500/20 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 flex items-center justify-center mx-auto shadow-xs font-bold text-lg">
                      🔨
                    </div>
                    <h4 className="font-bold text-xs text-white">Bricksmith</h4>
                    <p className="text-[11px] text-purple-300/60">Master world creator</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1b1238] border border-purple-500/20 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center mx-auto shadow-xs font-bold text-lg">
                      🌟
                    </div>
                    <h4 className="font-bold text-xs text-white">Veteran</h4>
                    <p className="text-[11px] text-purple-300/60">Active community pioneer</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#1b1238] border border-purple-500/20 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center mx-auto shadow-xs font-bold text-lg">
                      🏆
                    </div>
                    <h4 className="font-bold text-xs text-white">Friendship</h4>
                    <p className="text-[11px] text-purple-300/60">Over 50+ network friends</p>
                  </div>
                </div>
              </div>

              {/* Statistics Row */}
              <div className="space-y-3 pt-4 border-t border-purple-500/20">
                <h2 className="text-xl font-bold text-white font-display">Statistics</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div className="p-3 bg-[#1b1238] rounded-xl border border-purple-500/20">
                    <span className="text-xs text-purple-300/60 block">Join Date</span>
                    <span className="font-bold text-white">{profile.joinedDate || 'Sep 28, 2026'}</span>
                  </div>
                  <div className="p-3 bg-[#1b1238] rounded-xl border border-purple-500/20">
                    <span className="text-xs text-purple-300/60 block">Place Visits</span>
                    <span className="font-bold text-white">
                      {userExperiences.reduce((sum, e) => sum + (e.visits || 0), 0) || 12}
                    </span>
                  </div>
                  <div className="p-3 bg-[#1b1238] rounded-xl border border-purple-500/20">
                    <span className="text-xs text-purple-300/60 block">Creations</span>
                    <span className="font-bold text-white">{totalUserCreations}</span>
                  </div>
                  <div className="p-3 bg-[#1b1238] rounded-xl border border-purple-500/20">
                    <span className="text-xs text-purple-300/60 block">Status</span>
                    {(isSelf || (profile.lastActive && Date.now() - profile.lastActive < 1000 * 150)) ? (
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Online
                      </span>
                    ) : (
                      <span className="font-bold text-gray-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-gray-500" />
                        Offline
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREATIONS */}
          {activeTab === 'creations' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCreationsFilter('experiences')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      creationsFilter === 'experiences'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-[#1b1238] text-purple-200 hover:bg-[#27194f] border border-purple-500/20'
                    }`}
                  >
                    Experiences ({userExperiences.length})
                  </button>
                  <button
                    onClick={() => setCreationsFilter('clothing')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      creationsFilter === 'clothing'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-[#1b1238] text-purple-200 hover:bg-[#27194f] border border-purple-500/20'
                    }`}
                  >
                    Clothing ({userCreatedShirts.length + userCreatedPants.length})
                  </button>
                </div>

                {isSelf && (
                  <button
                    onClick={onOpenStudio}
                    className="px-4 py-2 rounded-lg bg-[#00a2ff] hover:bg-[#008fe6] text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Boxes className="w-4 h-4" />
                    <span>Create in Studio</span>
                  </button>
                )}
              </div>

              {creationsFilter === 'experiences' && (
                <div>
                  {userExperiences.length === 0 ? (
                    <div className="p-12 rounded-xl bg-[#1b1238] border border-purple-500/20 text-center space-y-3">
                      <Boxes className="w-10 h-10 text-purple-400/60 mx-auto" />
                      <h4 className="font-bold text-white text-base">No experiences published yet</h4>
                      <p className="text-xs text-purple-300/60 max-w-sm mx-auto">
                        {isSelf
                          ? 'Head to BoBlox Studio to build and publish your first custom 3D sandbox place!'
                          : `${profile.username} has not published any experiences yet.`}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {userExperiences.map((exp) => (
                        <div
                          key={exp.id}
                          className="group rounded-xl bg-[#1b1238] border border-purple-500/20 hover:border-purple-400 overflow-hidden shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="aspect-[16/9] w-full bg-gradient-to-br from-purple-950 to-[#0c0915] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                              <Boxes className="w-10 h-10 text-purple-300/80 mb-2" />
                              <span className="font-bold text-white text-sm text-center line-clamp-1">
                                {exp.name}
                              </span>
                            </div>

                            <div className="p-4 space-y-2">
                              <h4 className="font-bold text-white text-sm">{exp.name}</h4>
                              <p className="text-xs text-purple-300/70 line-clamp-2">
                                {exp.description || 'Custom 3D sandbox place.'}
                              </p>
                              <div className="flex items-center justify-between text-xs text-purple-400 font-mono pt-1">
                                <span>{exp.parts?.length || 0} Parts</span>
                                <span>{exp.likes || 0} Likes</span>
                                <span>{exp.visits || 0} Visits</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 pt-0">
                            <button
                              onClick={() => onPlayExperience(exp)}
                              className="w-full py-2.5 rounded-lg bg-[#00b06f] hover:bg-[#009b61] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Play className="w-4 h-4 fill-white" />
                              <span>Play Now</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {creationsFilter === 'clothing' && (
                <div>
                  {userCreatedShirts.length === 0 && userCreatedPants.length === 0 ? (
                    <div className="p-12 rounded-xl bg-[#1b1238] border border-purple-500/20 text-center space-y-3">
                      <Shirt className="w-10 h-10 text-purple-400/60 mx-auto" />
                      <h4 className="font-bold text-white text-base">No clothing creations yet</h4>
                      <p className="text-xs text-purple-300/60 max-w-sm mx-auto">
                        {isSelf
                          ? 'Create and upload custom shirts or pants in BoBlox Studio to showcase them here!'
                          : `${profile.username} has not created custom clothing items yet.`}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {[...userCreatedShirts, ...userCreatedPants].map((cloth) => (
                        <div
                          key={cloth.id}
                          className="p-3.5 rounded-xl bg-[#1b1238] border border-purple-500/20 flex flex-col justify-between group hover:border-purple-400 transition-all"
                        >
                          <div className="aspect-square w-full rounded-lg bg-[#0f091f] border border-purple-500/20 p-2 flex items-center justify-center mb-2 overflow-hidden">
                            <ClothingItemThumb
                              dataUrl={cloth.previewUrl || cloth.dataUrl}
                              type={cloth.type}
                              name={cloth.name}
                              className="group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase text-purple-400">
                              {cloth.type}
                            </span>
                            <h4 className="font-bold text-white text-xs truncate">{cloth.name}</h4>
                            <p className="text-[10px] text-purple-300/60 mt-0.5">By {profile.username}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
