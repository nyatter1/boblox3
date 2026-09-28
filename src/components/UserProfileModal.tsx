import React, { useState, useEffect } from 'react';
import {
  X,
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
  Tag,
  Gamepad2,
  MoreHorizontal,
  ArrowRight
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
  subscribeFriendsList
} from '../services/firebase';
import { ExperienceData } from '../types/experience';
import { getFacePreviewUrl } from '../utils/faceTexture';
import { CustomClothingItem, getSavedShirtsInventory, getSavedPantsInventory, deduplicateCustomClothingItems } from '../types/avatarInventory';
import { getSavedMarketplaceItems, MarketplaceClothingItem, subscribeMarketplaceFromFirestore } from '../types/marketplace';
import { openTransferBobuxModal } from './BobuxCurrency';
import bobuxImg from '../assets/bobux.png';

interface UserProfileModalProps {
  userId: string;
  currentUserId: string;
  currentUserProfile: UserProfile | null;
  onClose: () => void;
  onOpenAvatarEditor?: () => void;
  onJoinExperience?: (experienceId: string) => void;
  allExperiences?: ExperienceData[];
  onNavigateToUser?: (uid: string) => void;
}

export default function UserProfileModal({
  userId,
  currentUserId,
  currentUserProfile,
  onClose,
  onOpenAvatarEditor,
  onJoinExperience,
  allExperiences = [],
  onNavigateToUser,
}: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'creations'>('about');
  const [requestSent, setRequestSent] = useState(false);
  const [wearingPage, setWearingPage] = useState<number>(0);
  const [wearing3DMode, setWearing3DMode] = useState<boolean>(true);

  const isSelf = userId === currentUserId;

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeUserProfile(userId, (data) => {
      setProfile(data);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  if (loading || !profile) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
        <div className="w-full max-w-lg bg-white rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
          <p className="text-sm text-gray-600 font-medium">Loading BoBlox Profile...</p>
        </div>
      </div>
    );
  }

  const isFriend = currentUserProfile?.friends?.includes(profile.id) || profile.friends?.includes(currentUserId);
  const hasSentRequest = profile.friendRequests?.some((r) => r.fromUid === currentUserId) || requestSent;

  const userExperiences = allExperiences.filter(
    (exp) => exp.creatorId === profile.id || exp.creatorUsername === profile.username
  );

  const handleSendFriendReq = async () => {
    if (!currentUserProfile || !profile) return;
    setRequestSent(true);
    await sendFriendRequest(currentUserProfile, profile.id);
  };

  const statusQuote = profile.bio ? `"${profile.bio.split('\n')[0]}"` : '"Got Root? Didn\'t think so!"';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn font-sans text-white">
      <div className="w-full max-w-4xl bg-[#130d24] rounded-2xl shadow-2xl border border-purple-500/20 overflow-hidden relative my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-300 hover:text-white transition-colors z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Header (Dark Theme) */}
        <div className="p-6 sm:p-8 border-b border-purple-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Circular Avatar + Controller Badge */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-[#1f143a] border-2 border-purple-400/40 shadow-md flex items-center justify-center">
                  <AvatarProfileIcon
                    colors={profile.avatarColors}
                    selectedFaceId={profile.selectedFaceId}
                    shirtDataUrl={profile.shirtDataUrl}
                    pantsDataUrl={profile.pantsDataUrl}
                    selectedHairId={profile.selectedHairId}
                    hairColor={profile.hairColor}
                    customHairObj={profile.customHairObj}
                    selectedAccessoryId={profile.selectedAccessoryId}
                    size={96}
                    shape="circle"
                    border={false}
                    framing="bust"
                  />
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#00b06f] rounded-full border-2 border-[#130d24] flex items-center justify-center text-white shadow-xs">
                  <Gamepad2 className="w-3.5 h-3.5 fill-white text-white" />
                </div>
              </div>

              {/* Names & Stats */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                    {profile.displayName || profile.username}
                  </h2>
                  {isVerifiedUser(profile.username) && <VerifiedBadge username={profile.username} size="sm" />}
                </div>

                <p className="text-xs text-purple-300/80 italic font-medium">{statusQuote}</p>

                <div className="flex items-center gap-3 text-xs text-purple-200/70 pt-1">
                  <span><strong className="text-white">{profile.friends?.length || 91}</strong> Friends</span>
                  <span><strong className="text-white">{profile.followers?.length || 124}</strong> Followers</span>
                  <span><strong className="text-white">{profile.following?.length || 11}</strong> Following</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
              {!isSelf && (
                <>
                  {userExperiences.length > 0 && onJoinExperience ? (
                    <button
                      onClick={() => onJoinExperience(userExperiences[0].id)}
                      className="px-4 py-2 rounded-lg bg-[#271b48] hover:bg-[#382666] border border-purple-500/30 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95"
                    >
                      Join Game
                    </button>
                  ) : null}

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
                    {isFriend ? 'Unfriend' : hasSentRequest ? 'Sent' : 'Add Friend'}
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      openTransferBobuxModal(profile.username);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#00b06f] hover:bg-[#009b61] text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <img src={bobuxImg} alt="" className="w-3.5 h-3.5 object-contain" />
                    <span>Transfer</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center border-b border-purple-500/20 px-6">
          <button
            onClick={() => setActiveTab('about')}
            className={`py-3 px-4 font-bold text-sm transition-colors cursor-pointer ${
              activeTab === 'about' ? 'text-white border-b-2 border-purple-400' : 'text-purple-300/60 hover:text-white'
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab('creations')}
            className={`py-3 px-4 font-bold text-sm transition-colors cursor-pointer ${
              activeTab === 'creations' ? 'text-white border-b-2 border-purple-400' : 'text-purple-300/60 hover:text-white'
            }`}
          >
            Creations ({userExperiences.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'about' ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-bold text-base text-white font-display">About</h3>
                <p className="text-sm text-purple-200/90 leading-relaxed whitespace-pre-wrap">{profile.bio || '*'}</p>
              </div>

              {/* Currently Wearing */}
              <div className="space-y-3">
                <h3 className="font-bold text-base text-white font-display">Currently Wearing</h3>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
                  <div className="sm:col-span-5 bg-[#0f091f] border border-purple-500/20 rounded-2xl p-2.5 relative flex items-center justify-center min-h-[190px] max-h-[210px] shadow-inner overflow-hidden">
                    <ProfileAvatarShowcase
                      colors={profile.avatarColors}
                      selectedFaceId={profile.selectedFaceId}
                      shirtDataUrl={profile.shirtDataUrl}
                      pantsDataUrl={profile.pantsDataUrl}
                      selectedHairId={profile.selectedHairId}
                      hairColor={profile.hairColor}
                      customHairObj={profile.customHairObj}
                      selectedAccessoryId={profile.selectedAccessoryId}
                      is3D={wearing3DMode}
                      onToggle3D={() => setWearing3DMode((p) => !p)}
                    />
                  </div>

                  <div className="sm:col-span-7 grid grid-cols-4 gap-2.5 self-center">
                    <div className="aspect-square bg-[#1b1238] hover:bg-[#26194e] border border-purple-500/20 rounded-xl p-2 flex items-center justify-center">
                      <ClothingItemThumb
                        dataUrl={profile.shirtDataUrl}
                        type="shirt"
                        name="Shirt"
                      />
                    </div>
                    <div className="aspect-square bg-[#1b1238] hover:bg-[#26194e] border border-purple-500/20 rounded-xl p-2 flex items-center justify-center">
                      <ClothingItemThumb
                        dataUrl={profile.pantsDataUrl}
                        type="pants"
                        name="Pants"
                      />
                    </div>
                    <div className="aspect-square bg-[#1b1238] hover:bg-[#26194e] border border-purple-500/20 rounded-xl p-2 flex items-center justify-center">
                      <img
                        src={getFacePreviewUrl(profile.selectedFaceId || 'classic-smile')}
                        alt="Face"
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                    <div className="aspect-square bg-[#1b1238] hover:bg-[#26194e] border border-purple-500/20 rounded-xl p-2 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-purple-300 uppercase">R6</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userExperiences.map((exp) => (
                <div key={exp.id} className="p-4 rounded-xl border border-purple-500/20 bg-[#1b1238] flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-bold text-sm text-white">{exp.name}</h4>
                    <p className="text-xs text-purple-300/70 line-clamp-2">{exp.description || 'Custom place'}</p>
                  </div>
                  {onJoinExperience && (
                    <button
                      onClick={() => onJoinExperience(exp.id)}
                      className="w-full py-2 rounded-lg bg-[#00b06f] text-white font-bold text-xs cursor-pointer active:scale-95"
                    >
                      Play
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
