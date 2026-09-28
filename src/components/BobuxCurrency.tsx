import React, { useState, useEffect, useRef } from 'react';
import { Send, Check, X, Gift, Clock, UserCheck } from 'lucide-react';
import bobuxImg from '../assets/bobux.png';
import AvatarProfileIcon from './AvatarProfileIcon';
import VerifiedBadge, { isVerifiedUser } from './VerifiedBadge';
import { UserProfile } from '../services/firebase';

export const BOBUX_STORAGE_KEY = 'boblox_user_currency_v2';
export const OWNER_BOBUX_AMOUNT = 100_000_000; // 100 Million Bobux for Boblox account
export const DEFAULT_PLAYER_BOBUX = 10; // 10 Bobux starting balance for players
export const DAILY_CLAIM_AMOUNT = 10; // Claim daily 10 Bobux

export function openTransferBobuxModal(targetUsername?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('boblox-open-transfer', { detail: { targetUsername } }));
  }
}

export function getSavedBobux(username?: string, isOwner?: boolean): number {
  const isBoblox = username?.toLowerCase() === 'boblox' || isOwner === true;
  try {
    const key = username ? `${BOBUX_STORAGE_KEY}_${username.toLowerCase()}` : BOBUX_STORAGE_KEY;
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  } catch (e) {
    // ignore
  }
  return isBoblox ? OWNER_BOBUX_AMOUNT : DEFAULT_PLAYER_BOBUX;
}

export function saveBobux(amount: number, username?: string) {
  try {
    const key = username ? `${BOBUX_STORAGE_KEY}_${username.toLowerCase()}` : BOBUX_STORAGE_KEY;
    localStorage.setItem(key, amount.toString());
    localStorage.setItem(BOBUX_STORAGE_KEY, amount.toString());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('boblox-bobux-updated', { detail: { amount, username } }));
    }
  } catch (e) {
    // ignore
  }
}

export function getLastDailyClaimTime(username?: string): number {
  try {
    const key = `boblox_daily_claim_ts_${username?.toLowerCase() || 'player'}`;
    const saved = localStorage.getItem(key);
    if (saved) return parseInt(saved, 10) || 0;
  } catch {}
  return 0;
}

export function setLastDailyClaimTime(username?: string): void {
  try {
    const key = `boblox_daily_claim_ts_${username?.toLowerCase() || 'player'}`;
    localStorage.setItem(key, Date.now().toString());
  } catch {}
}

export function canClaimDaily(username?: string): boolean {
  const lastClaim = getLastDailyClaimTime(username);
  if (!lastClaim) return true;
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  return Date.now() - lastClaim >= TWENTY_FOUR_HOURS;
}

export function getTimeUntilNextClaim(username?: string): { hours: number; minutes: number; claimable: boolean } {
  const lastClaim = getLastDailyClaimTime(username);
  if (!lastClaim) return { hours: 0, minutes: 0, claimable: true };
  const diff = 24 * 60 * 60 * 1000 - (Date.now() - lastClaim);
  if (diff <= 0) return { hours: 0, minutes: 0, claimable: true };
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  return { hours, minutes, claimable: false };
}

export function formatBobuxCompact(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}

interface BobuxCurrencyProps {
  currentUsername?: string;
  isOwnerAccount?: boolean;
  friendsList?: UserProfile[];
}

export default function BobuxCurrency({
  currentUsername = 'Player',
  isOwnerAccount = false,
  friendsList = [],
}: BobuxCurrencyProps) {
  const [bobux, setBobux] = useState<number>(() => getSavedBobux(currentUsername, isOwnerAccount));
  const [isOpen, setIsOpen] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);
  const [transferAmount, setTransferAmount] = useState<string>('10');
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [claimStatus, setClaimStatus] = useState(() => getTimeUntilNextClaim(currentUsername));

  const menuRef = useRef<HTMLDivElement>(null);

  // Sync balance when username or owner status changes
  useEffect(() => {
    const val = getSavedBobux(currentUsername, isOwnerAccount);
    setBobux(val);
  }, [currentUsername, isOwnerAccount]);

  // Listen for global bobux updates & open transfer event
  useEffect(() => {
    const handleUpdate = () => {
      setBobux(getSavedBobux(currentUsername, isOwnerAccount));
    };
    const handleOpenTransfer = (e: any) => {
      const target = e.detail?.targetUsername;
      if (target) {
        setRecipient(target);
        const match = friendsList.find((f) => f.username.toLowerCase() === target.toLowerCase());
        if (match) setSelectedFriend(match);
      }
      setShowTransferModal(true);
      setIsOpen(false);
    };

    window.addEventListener('boblox-bobux-updated', handleUpdate);
    window.addEventListener('boblox-open-transfer', handleOpenTransfer);
    return () => {
      window.removeEventListener('boblox-bobux-updated', handleUpdate);
      window.removeEventListener('boblox-open-transfer', handleOpenTransfer);
    };
  }, [currentUsername, isOwnerAccount, friendsList]);

  // Update daily claim timer
  useEffect(() => {
    setClaimStatus(getTimeUntilNextClaim(currentUsername));
    const interval = setInterval(() => {
      setClaimStatus(getTimeUntilNextClaim(currentUsername));
    }, 60000);
    return () => clearInterval(interval);
  }, [currentUsername, bonusClaimed]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleUpdateBobux = (newAmount: number) => {
    setBobux(newAmount);
    saveBobux(newAmount, currentUsername);
  };

  const handleSelectFriend = (friend: UserProfile) => {
    setSelectedFriend(friend);
    setRecipient(friend.username);
    setTransferError(null);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    setTransferSuccess(null);

    const targetUser = recipient.trim();
    if (!targetUser) {
      setTransferError('Please enter or select a friend to transfer Bobux to.');
      return;
    }
    if (targetUser.toLowerCase() === currentUsername.toLowerCase()) {
      setTransferError('You cannot transfer Bobux to yourself!');
      return;
    }

    const amountNum = parseInt(transferAmount.replace(/,/g, ''), 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTransferError('Please enter a valid amount of Bobux greater than 0.');
      return;
    }

    if (amountNum > bobux) {
      setTransferError(`Insufficient Bobux! You currently have ${bobux.toLocaleString()} Bobux.`);
      return;
    }

    const nextBalance = bobux - amountNum;
    handleUpdateBobux(nextBalance);

    // Credit recipient
    const recipientCurrent = getSavedBobux(targetUser);
    saveBobux(recipientCurrent + amountNum, targetUser);

    const displayName = selectedFriend ? (selectedFriend.displayName || selectedFriend.username) : targetUser;
    setTransferSuccess(`Successfully transferred ${amountNum.toLocaleString()} Bobux to @${targetUser} (${displayName})!`);
    setTimeout(() => {
      setTransferSuccess(null);
      setShowTransferModal(false);
      setRecipient('');
      setSelectedFriend(null);
    }, 2000);
  };

  const handleClaimDaily10 = () => {
    if (!claimStatus.claimable) return;
    const nextBalance = bobux + DAILY_CLAIM_AMOUNT;
    handleUpdateBobux(nextBalance);
    setLastDailyClaimTime(currentUsername);
    setBonusClaimed(true);
    setClaimStatus(getTimeUntilNextClaim(currentUsername));
    setTimeout(() => setBonusClaimed(false), 3000);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Top Header Bobux Icon & Balance Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Bobux Currency Menu"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg hover:bg-purple-950/50 transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        title="Bobux Balance & Daily Rewards"
      >
        <img
          src={bobuxImg}
          alt="Bobux Currency"
          className="w-5 h-5 sm:w-6 sm:h-6 object-contain drop-shadow-sm group-hover:scale-110 transition-transform"
        />
        <span className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-purple-200 tabular-nums">
          {formatBobuxCompact(bobux)}
        </span>
      </button>

      {/* Dropdown Menu (Underneath the icon) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#140e28] border border-purple-500/30 shadow-2xl shadow-purple-950/80 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex flex-col items-center text-center space-y-2.5">
            {/* The Bobux Icon */}
            <div className="w-14 h-14 rounded-2xl bg-purple-950/70 border border-purple-500/30 flex items-center justify-center p-2 shadow-inner">
              <img
                src={bobuxImg}
                alt="Bobux"
                className="w-full h-full object-contain filter drop-shadow(0 4px 8px rgba(168,85,247,0.4))"
              />
            </div>

            {/* The Robux Amount */}
            <div className="pt-0.5">
              <p className="text-2xl font-display font-black text-white tracking-tight tabular-nums">
                {bobux.toLocaleString()}
              </p>
              {/* Robux / Bobux Label */}
              <p className="text-[11px] font-bold tracking-wider text-purple-300/80 uppercase mt-0.5">
                Robux
              </p>
            </div>

            {/* Daily 10 Bobux Claim Section */}
            <div className="w-full pt-1">
              {claimStatus.claimable ? (
                <button
                  type="button"
                  onClick={handleClaimDaily10}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                >
                  <Gift className="w-4 h-4 fill-amber-200 text-amber-900" />
                  <span>{bonusClaimed ? '+10 Bobux Claimed! 🎉' : 'Claim Daily 10 Bobux'}</span>
                </button>
              ) : (
                <div className="w-full py-2 px-3 rounded-xl bg-purple-950/60 border border-purple-500/20 text-purple-300/80 font-medium text-[11px] flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Claimed today • Next in {claimStatus.hours}h {claimStatus.minutes}m</span>
                </div>
              )}
            </div>

            {/* Transfer Button */}
            <div className="w-full pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowTransferModal(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 hover:shadow-purple-600/50 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transfer Robux</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Bobux Modal (Centered on Screen) */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#140e28] border border-purple-500/30 shadow-2xl p-6 relative space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowTransferModal(false);
                setTransferError(null);
                setTransferSuccess(null);
                setSelectedFriend(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-900/50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center p-1.5 shrink-0">
                <img src={bobuxImg} alt="Bobux" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-lg font-display font-black text-white">Transfer Robux</h3>
                <p className="text-xs text-purple-300/70">Send Robux directly to another player</p>
              </div>
            </div>

            {/* Current Balance Bar */}
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-between">
              <span className="text-xs text-purple-300">Your Current Balance:</span>
              <div className="flex items-center gap-1.5">
                <img src={bobuxImg} alt="" className="w-4 h-4 object-contain" />
                <span className="font-mono font-bold text-white text-sm">{bobux.toLocaleString()}</span>
              </div>
            </div>

            {/* Transfer Form */}
            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                  Select Friend or Enter Username
                </label>

                {/* Selected Friend Card if chosen */}
                {selectedFriend ? (
                  <div className="p-2.5 rounded-xl bg-purple-900/40 border border-purple-400/40 flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarProfileIcon
                        colors={selectedFriend.avatarColors}
                        selectedFaceId={selectedFriend.selectedFaceId}
                        shirtDataUrl={selectedFriend.shirtDataUrl}
                        pantsDataUrl={selectedFriend.pantsDataUrl}
                        selectedHairId={selectedFriend.selectedHairId}
                        hairColor={selectedFriend.hairColor}
                        size={38}
                        shape="circle"
                        border={false}
                        framing="bust"
                      />
                      <div className="truncate">
                        <div className="text-xs font-bold text-white flex items-center gap-1">
                          <span>{selectedFriend.displayName || selectedFriend.username}</span>
                          {isVerifiedUser(selectedFriend.username) && (
                            <VerifiedBadge username={selectedFriend.username} size="sm" />
                          )}
                        </div>
                        <div className="text-[11px] text-purple-300 font-mono">
                          @{selectedFriend.username}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFriend(null);
                        setRecipient('');
                      }}
                      className="p-1 text-purple-400 hover:text-white rounded-lg hover:bg-purple-800/40 text-xs cursor-pointer"
                      title="Clear selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}

                {/* Recipient Input */}
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    if (selectedFriend && selectedFriend.username !== e.target.value) {
                      setSelectedFriend(null);
                    }
                  }}
                  placeholder="Enter friend's username..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1d153a] border border-purple-500/30 text-white placeholder-purple-400/40 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-colors"
                />

                {/* Real Friends Picker with Avatar Icon and Real Name */}
                {friendsList.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-purple-300 mb-1.5 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                      <span>Your Friends ({friendsList.length}):</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                      {friendsList.map((friend) => {
                        const isSelected = recipient.toLowerCase() === friend.username.toLowerCase();
                        return (
                          <button
                            key={friend.id}
                            type="button"
                            onClick={() => handleSelectFriend(friend)}
                            className={`p-2 rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-700/50 border-purple-400 text-white shadow-sm'
                                : 'bg-[#181133] border-purple-500/20 hover:border-purple-400/50 hover:bg-[#201642] text-purple-200'
                            }`}
                          >
                            <AvatarProfileIcon
                              colors={friend.avatarColors}
                              selectedFaceId={friend.selectedFaceId}
                              shirtDataUrl={friend.shirtDataUrl}
                              pantsDataUrl={friend.pantsDataUrl}
                              selectedHairId={friend.selectedHairId}
                              hairColor={friend.hairColor}
                              size={32}
                              shape="circle"
                              border={false}
                              framing="bust"
                            />
                            <div className="truncate min-w-0">
                              <p className="text-xs font-bold truncate">
                                {friend.displayName || friend.username}
                              </p>
                              <p className="text-[10px] text-purple-300/70 font-mono truncate">
                                @{friend.username}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                  Amount to Transfer
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <img src={bobuxImg} alt="" className="w-4 h-4 object-contain" />
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={bobux}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="10"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#1d153a] border border-purple-500/30 text-white font-mono text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-colors"
                  />
                </div>

                {/* Preset Amount Buttons */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[10, 50, 100, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTransferAmount(amt.toString())}
                      className="px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/20 text-purple-200 text-xs font-mono transition-colors cursor-pointer"
                    >
                      +{amt}
                    </button>
                  ))}
                  {bobux > 500 && (
                    <button
                      key="1000"
                      type="button"
                      onClick={() => setTransferAmount('1000')}
                      className="px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/20 text-purple-200 text-xs font-mono transition-colors cursor-pointer"
                    >
                      +1K
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTransferAmount(bobux.toString())}
                    className="px-2.5 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 border border-purple-500/40 text-purple-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Status Message */}
              {transferError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200 text-xs">
                  {transferError}
                </div>
              )}
              {transferSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{transferSuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2.5 rounded-xl text-purple-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
