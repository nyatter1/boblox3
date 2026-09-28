import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, Users, Play } from 'lucide-react';
import AvatarProfileIcon from './AvatarProfileIcon';
import VerifiedBadge, { isVerifiedUser } from './VerifiedBadge';
import { UserProfile, subscribeFriendsList } from '../services/firebase';
import { AvatarColors } from './AvatarViewer';

export interface DisplayFriend {
  id: string;
  username: string;
  displayName: string;
  playingGameTitle?: string;
  playingExperienceId?: string;
  isOnline: boolean;
  avatarColors?: AvatarColors;
  selectedFaceId?: string;
  selectedHairId?: string;
  hairColor?: string;
  shirtDataUrl?: string | null;
  pantsDataUrl?: string | null;
  isVerified?: boolean;
}

interface HomeFriendsRowProps {
  currentUser: UserProfile;
  onOpenProfile: (userId: string) => void;
  onOpenAddFriends: () => void;
  onJoinGame: (experienceId: string) => void;
}

export default function HomeFriendsRow({
  currentUser,
  onOpenProfile,
  onOpenAddFriends,
  onJoinGame,
}: HomeFriendsRowProps) {
  const [firebaseFriends, setFirebaseFriends] = useState<UserProfile[]>([]);

  // Subscribe to live friends only (no fake placeholders)
  useEffect(() => {
    if (!currentUser.friends || currentUser.friends.length === 0) {
      setFirebaseFriends([]);
      return;
    }
    const unsub = subscribeFriendsList(currentUser.friends, (list) => {
      setFirebaseFriends(list);
    });
    return () => unsub?.();
  }, [currentUser.friends]);

  // Map only real live friends
  const displayFriends: DisplayFriend[] = React.useMemo(() => {
    return firebaseFriends.map((f) => ({
      id: f.id,
      username: f.username,
      displayName: f.displayName || f.username,
      playingGameTitle: f.currentExperienceName || (f.currentExperienceId ? 'Experience' : undefined),
      playingExperienceId: f.currentExperienceId || undefined,
      isOnline: Date.now() - (f.lastActive || 0) < 1000 * 60 * 10,
      avatarColors: f.avatarColors,
      selectedFaceId: f.selectedFaceId,
      selectedHairId: f.selectedHairId,
      hairColor: f.hairColor,
      shirtDataUrl: f.shirtDataUrl,
      pantsDataUrl: f.pantsDataUrl,
      isVerified: isVerifiedUser(f.username),
    }));
  }, [firebaseFriends]);

  const friendCount = displayFriends.length;

  return (
    <div className="space-y-3">
      {/* Header: Friends (how many friends u have) + ADD FRIENDS button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-display font-extrabold text-white tracking-tight flex items-center gap-2">
          <span>Friends</span>
          <span className="text-purple-300 font-normal text-sm sm:text-base">
            ({friendCount})
          </span>
        </h2>

        {/* ADD FRIENDS button on the right */}
        <button
          onClick={onOpenAddFriends}
          className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 hover:text-white font-bold text-xs tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 uppercase"
        >
          <UserPlus className="w-3.5 h-3.5 text-purple-400" />
          <span>Add Friends</span>
        </button>
      </div>

      {/* Horizontal Friends List matching specification:
          [+] [friend icon]
          [username]
          [what game there playing]
      */}
      <div className="flex items-start gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin">
        {/* First Item: [+] Add Friend Button */}
        <div
          onClick={onOpenAddFriends}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onOpenAddFriends();
          }}
          className="flex flex-col items-center text-center cursor-pointer group shrink-0 w-[84px] focus:outline-none"
          title="Add New Friends"
        >
          <div className="w-16 h-16 rounded-full bg-[#1b1238] border-2 border-dashed border-purple-500/40 group-hover:border-purple-400 group-hover:bg-purple-900/30 flex items-center justify-center transition-all shadow-inner group-hover:scale-105">
            <Plus className="w-6 h-6 text-purple-400 group-hover:text-white transition-colors" />
          </div>
          <span className="mt-2 text-xs font-bold text-purple-200 group-hover:text-white truncate max-w-[80px]">
            Add Friend
          </span>
          <span className="text-[10px] text-purple-400/60 font-medium">Find Players</span>
        </div>

        {/* Real Live Friends */}
        {displayFriends.map((friend) => (
          <div
            key={friend.id}
            onClick={() => {
              if (friend.playingExperienceId) {
                onJoinGame(friend.playingExperienceId);
              } else {
                onOpenProfile(friend.id);
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                if (friend.playingExperienceId) onJoinGame(friend.playingExperienceId);
                else onOpenProfile(friend.id);
              }
            }}
            className="flex flex-col items-center text-center cursor-pointer group shrink-0 w-[88px] sm:w-[94px] focus:outline-none"
            title={
              friend.playingGameTitle
                ? `${friend.username} is playing ${friend.playingGameTitle}. Click to join!`
                : `View @${friend.username}'s profile`
            }
          >
            {/* [friend icon] with real 3D avatar & online indicator */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#191136] border border-purple-500/25 group-hover:border-purple-400 overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 shadow-md">
                <AvatarProfileIcon
                  colors={friend.avatarColors}
                  selectedFaceId={friend.selectedFaceId}
                  shirtDataUrl={friend.shirtDataUrl}
                  pantsDataUrl={friend.pantsDataUrl}
                  selectedHairId={friend.selectedHairId}
                  hairColor={friend.hairColor}
                  size={58}
                  shape="circle"
                  border={false}
                  framing="bust"
                />
              </div>

              {/* In-Game Status Indicator / Play Badge */}
              {friend.playingGameTitle ? (
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#0c0915] flex items-center justify-center shadow-sm"
                  title="Playing Game"
                >
                  <Play className="w-2.5 h-2.5 fill-black text-black ml-0.5" />
                </div>
              ) : friend.isOnline ? (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0c0915]"
                  title="Online"
                />
              ) : null}
            </div>

            {/* [username] */}
            <p className="mt-2 text-xs font-bold text-white group-hover:text-purple-200 truncate w-full flex items-center justify-center gap-0.5">
              <span>{friend.displayName || friend.username}</span>
              {friend.isVerified && <VerifiedBadge username={friend.username} size="sm" />}
            </p>

            {/* [what game there playing] */}
            <p className="text-[10px] text-purple-300/70 truncate w-full group-hover:text-purple-200 transition-colors">
              {friend.playingGameTitle ? `Playing ${friend.playingGameTitle}` : friend.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        ))}

        {/* Empty state prompt if 0 friends */}
        {displayFriends.length === 0 && (
          <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-purple-950/20 border border-purple-500/15 text-xs text-purple-300/70 shrink-0">
            <span>No friends added yet. Click [+] or "ADD FRIENDS" to connect with live players!</span>
          </div>
        )}
      </div>
    </div>
  );
}
