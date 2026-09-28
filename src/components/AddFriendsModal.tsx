import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  UserPlus,
  UserCheck,
  Users,
  Check,
  Clock,
  Sparkles
} from 'lucide-react';
import AvatarProfileIcon from './AvatarProfileIcon';
import VerifiedBadge, { isVerifiedUser } from './VerifiedBadge';
import {
  UserProfile,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  subscribeFriendsList
} from '../services/firebase';

interface AddFriendsModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

export default function AddFriendsModal({
  currentUser,
  isOpen,
  onClose,
  onOpenProfile,
}: AddFriendsModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'requests' | 'my-friends'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<UserProfile[]>([]);

  // Real-time friends list
  useEffect(() => {
    if (!currentUser.friends || currentUser.friends.length === 0) {
      setFriends([]);
      return;
    }
    const unsub = subscribeFriendsList(currentUser.friends, (list) => {
      setFriends(list);
    });
    return () => unsub?.();
  }, [currentUser.friends]);

  // Live search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(searchQuery);
        setSearchResults(results.filter((u) => u.id !== currentUser.id));
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser.id]);

  if (!isOpen) return null;

  const pendingRequests = currentUser.friendRequests || [];

  const handleSendFriendRequest = async (targetUser: UserProfile) => {
    try {
      await sendFriendRequest(currentUser, targetUser.id);
      setSentRequests((prev) => new Set(prev).add(targetUser.id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAccept = async (fromUid: string) => {
    await acceptFriendRequest(currentUser.id, fromUid);
  };

  const handleDecline = async (fromUid: string) => {
    await declineFriendRequest(currentUser.id, fromUid);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#140e28] border border-purple-500/30 shadow-2xl p-6 relative flex flex-col max-h-[85vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-900/50 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-display font-extrabold text-white">Friends &amp; Players</h2>
            <p className="text-xs text-purple-300/70">Find friends, manage requests, and play together</p>
          </div>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#1a1235] rounded-xl border border-purple-500/20 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-purple-300 hover:text-white hover:bg-purple-900/30'
            }`}
          >
            Find Friends
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer relative ${
              activeTab === 'requests'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-purple-300 hover:text-white hover:bg-purple-900/30'
            }`}
          >
            Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-[10px] text-black font-extrabold">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('my-friends')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'my-friends'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-purple-300 hover:text-white hover:bg-purple-900/30'
            }`}
          >
            All Friends ({friends.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto min-h-[260px] space-y-3 pr-1">
          {/* 1. SEARCH TAB */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-purple-400/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username or display name..."
                  autoFocus
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#1b1437] border border-purple-500/30 text-sm text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-colors"
                />
              </div>

              {isSearching && (
                <div className="text-center py-8 text-xs text-purple-300/60 animate-pulse">
                  Searching community members...
                </div>
              )}

              {!isSearching && searchQuery && searchResults.length === 0 && (
                <div className="text-center py-8 text-xs text-purple-300/60">
                  No users found matching "{searchQuery}"
                </div>
              )}

              <div className="space-y-2">
                {searchResults.map((user) => {
                  const isFriend = (currentUser.friends || []).includes(user.id);
                  const isSent = sentRequests.has(user.id);

                  return (
                    <div
                      key={user.id}
                      className="p-3 rounded-xl bg-[#1a1235]/70 border border-purple-500/20 flex items-center justify-between gap-3 hover:border-purple-500/40 transition-colors"
                    >
                      <div
                        onClick={() => {
                          onOpenProfile(user.id);
                          onClose();
                        }}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <AvatarProfileIcon
                          colors={user.avatarColors}
                          selectedFaceId={user.selectedFaceId}
                          shirtDataUrl={user.shirtDataUrl}
                          pantsDataUrl={user.pantsDataUrl}
                          selectedHairId={user.selectedHairId}
                          hairColor={user.hairColor}
                          customHairObj={user.customHairObj}
                          selectedAccessoryId={user.selectedAccessoryId}
                          size={36}
                          shape="circle"
                          border={false}
                        />
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-purple-300 flex items-center gap-1">
                            <span>{user.displayName || user.username}</span>
                            {isVerifiedUser(user.username) && <VerifiedBadge username={user.username} size="sm" />}
                          </p>
                          <p className="text-xs text-purple-300/60">@{user.username}</p>
                        </div>
                      </div>

                      <div>
                        {isFriend ? (
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Friends</span>
                          </span>
                        ) : isSent ? (
                          <span className="px-3 py-1.5 rounded-lg bg-purple-950/60 text-purple-300 text-xs font-semibold border border-purple-500/30 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Sent</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendFriendRequest(user)}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-purple-600/30"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add Friend</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. REQUESTS TAB */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-purple-300/60 text-xs space-y-1">
                  <p className="font-semibold text-purple-200">No pending friend requests</p>
                  <p>When other builders add you, their invitations will appear here.</p>
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <div
                    key={req.fromUid}
                    className="p-3 rounded-xl bg-[#1b1437] border border-purple-500/20 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">@{req.fromUsername}</p>
                      <p className="text-[11px] text-purple-300/60">Sent a friend request</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAccept(req.fromUid)}
                        className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                        title="Accept"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDecline(req.fromUid)}
                        className="p-2 rounded-lg bg-purple-950 hover:bg-red-950/60 text-purple-300 hover:text-red-200 border border-purple-500/20 transition-colors cursor-pointer"
                        title="Decline"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 3. ALL FRIENDS TAB */}
          {activeTab === 'my-friends' && (
            <div className="space-y-2">
              {friends.length === 0 ? (
                <div className="text-center py-12 text-purple-300/60 text-xs space-y-1">
                  <p className="font-semibold text-purple-200">No friends added yet</p>
                  <p>Use the "Find Friends" tab to search and connect with other players!</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => {
                      onOpenProfile(friend.id);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-[#1a1235]/60 hover:bg-[#201742] border border-purple-500/20 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <AvatarProfileIcon
                        colors={friend.avatarColors}
                        selectedFaceId={friend.selectedFaceId}
                        shirtDataUrl={friend.shirtDataUrl}
                        pantsDataUrl={friend.pantsDataUrl}
                        selectedHairId={friend.selectedHairId}
                        hairColor={friend.hairColor}
                        customHairObj={friend.customHairObj}
                        selectedAccessoryId={friend.selectedAccessoryId}
                        size={36}
                        shape="circle"
                        border={false}
                      />
                      <div>
                        <p className="text-sm font-bold text-white flex items-center gap-1">
                          <span>{friend.displayName || friend.username}</span>
                          {isVerifiedUser(friend.username) && <VerifiedBadge username={friend.username} size="sm" />}
                        </p>
                        <p className="text-xs text-purple-300/60">@{friend.username}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-purple-400 font-medium">View Profile &rarr;</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
