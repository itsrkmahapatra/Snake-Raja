/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import { useGameStore, mobileInputs } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Zap,
  Sparkles,
  Dices,
  X,
  QrCode,
  Crosshair,
  Target,
  Crown,
  Users,
  Award,
  Swords,
  User,
  LogIn,
  PlusCircle,
  BarChart3,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { VirtualJoystick } from './VirtualJoystick';
import { MiniMap } from './MiniMap';
import { TARGET_WIN_SCORE } from '../shared/types';

const RANDOM_NAMES = [
  'ViperKing', 'CobraX', 'ShadowFang', 'ApexHydra', 'NeonPython',
  'CyberVenom', 'RajaStriker', 'TitanSerpent', 'CosmoDrake', 'BlitzAnaconda'
];

export function UI() {
  const {
    gameState,
    playerId,
    joinGame,
    userProfile,
    savedProfiles,
    loginUser,
    switchProfile,
    selectedHeadType,
    setSelectedHeadType,
    challenges,
    playerXP,
    playerLevel,
    recentKills,
    recentCompletedChallenge,
    dismissCompletedChallenge,
    claimChallengeReward,
    showVictoryModal,
    matchWinner,
  } = useGameStore();

  const [playerName, setPlayerName] = useState(() => userProfile?.username || '');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showChallengesModal, setShowChallengesModal] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState<'stats' | 'accounts'>('stats');
  const [newLoginName, setNewLoginName] = useState('');
  const [newLoginAvatar, setNewLoginAvatar] = useState<'snake' | 'skull' | 'robot'>('snake');
  const [showDonate, setShowDonate] = useState(false);
  const [donateAmount, setDonateAmount] = useState('100');
  const [isBoostingTouch, setIsBoostingTouch] = useState(false);

  useEffect(() => {
    if (userProfile?.username) {
      setPlayerName(userProfile.username);
    }
  }, [userProfile?.username]);

  // Auto-dismiss challenge toast after 3.5s
  useEffect(() => {
    if (recentCompletedChallenge) {
      const timer = setTimeout(() => {
        dismissCompletedChallenge();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [recentCompletedChallenge, dismissCompletedChallenge]);

  const player = playerId && gameState ? gameState.players[playerId] : null;
  const isAlive = player?.state === 'alive';
  const isDead = player?.state === 'dead';

  const upiString = `upi://pay?pa=Q169118772@ybl&pn=Raj%20Kishor%20Mahapatra&am=${donateAmount || 0}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiString)}`;

  const handleRandomName = () => {
    const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)] + '_' + Math.floor(Math.random() * 99);
    setPlayerName(random);
  };

  const handleStartGame = () => {
    const finalName = playerName.trim() || userProfile.username || `Survivor_${Math.floor(Math.random() * 900 + 100)}`;
    loginUser(finalName, selectedHeadType);
    joinGame(finalName, selectedHeadType);
  };

  const handleCreateNewAccount = () => {
    if (!newLoginName.trim()) return;
    loginUser(newLoginName.trim(), newLoginAvatar);
    setNewLoginName('');
    setShowProfileModal(false);
  };

  const handleBoostStart = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    mobileInputs.isBoosting = true;
    setIsBoostingTouch(true);
    if ('vibrate' in navigator) {
      try { navigator.vibrate(20); } catch { /* ignore */ }
    }
  };

  const handleBoostEnd = (e: React.PointerEvent) => {
    e.preventDefault();
    mobileInputs.isBoosting = false;
    setIsBoostingTouch(false);
  };

  const topLeader = gameState?.leaderboard && gameState.leaderboard.length > 0 ? gameState.leaderboard[0] : null;
  const activePlayersList = gameState ? Object.values(gameState.players).filter((p) => p.state === 'alive') : [];
  const completedUnclaimedCount = challenges.filter((c) => c.completed && !c.claimed).length;

  const winRate = userProfile.matchesPlayed > 0
    ? Math.round((userProfile.wins / userProfile.matchesPlayed) * 100)
    : 0;

  const getAvatarEmoji = (avatar: string) => {
    if (avatar === 'skull') return '💀';
    if (avatar === 'robot') return '🤖';
    return '🐍';
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between overflow-hidden select-none touch-none">

      {/* 🔴 TOP MICRO KILLFEED (Top-Right non-intrusive) */}
      <div className="absolute top-12 right-2.5 z-20 flex flex-col gap-1 pointer-events-none max-w-[170px] sm:max-w-[220px]">
        <AnimatePresence>
          {recentKills.slice(0, 2).map((kill) => (
            <motion.div
              key={kill.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20 }}
              className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-sm border border-red-500/25 shadow flex items-center gap-1 text-[9px] font-mono"
            >
              <Swords size={9} className="text-red-400 shrink-0" />
              <span style={{ color: kill.killerColor }} className="font-bold truncate max-w-[55px]">
                {kill.killerName}
              </span>
              <span className="text-white/30 text-[8px]">⚔️</span>
              <span style={{ color: kill.victimColor }} className="font-bold truncate max-w-[55px]">
                {kill.victimName}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ⚡ TOP GLOBAL ARENA EVENT TOAST BANNER */}
      {gameState?.currentEvent && (
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          className="absolute top-1.5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto max-w-[90vw]"
        >
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-black/80 to-amber-500/20 backdrop-blur-md border border-amber-400/50 shadow-[0_0_15px_rgba(255,170,0,0.3)] flex items-center gap-2">
            <span className="text-sm animate-bounce shrink-0">{gameState.currentEvent.icon}</span>
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[11px] font-black text-yellow-300 font-mono tracking-tight truncate">
                {gameState.currentEvent.title}
              </span>
              <span className="text-[9px] font-mono font-bold bg-amber-400/20 text-yellow-200 px-1 rounded border border-amber-400/30 shrink-0">
                {gameState.currentEvent.timeRemaining}s
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 🟢 TOP SMARTPHONE COMPACT HUD */}
      <header className="w-full flex items-start justify-between px-2.5 pt-2 pb-0.5 safe-pt safe-pl safe-pr z-30">

        {/* Left: Compact Stats & Profile Pill */}
        <div className="flex flex-col gap-1 pointer-events-auto max-w-[52%]">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400 drop-shadow">
              SNAKE RAJA
            </span>

            {/* Profile Quick Pill */}
            <button
              onClick={() => {
                setProfileTab('stats');
                setShowProfileModal(true);
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-400/40 text-cyan-300 text-[9px] font-mono font-bold active:scale-95 shadow"
              title="Player Account"
            >
              <span>{getAvatarEmoji(userProfile.avatar)}</span>
              <span className="truncate max-w-[55px]">{userProfile.username}</span>
            </button>
          </div>

          {/* Player In-Game Live HUD */}
          {isAlive && player && (
            <div className="flex flex-col gap-0.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-xl border border-white/10 shadow-lg">
              {/* Score Row */}
              <div className="flex items-center justify-between text-[11px] font-mono font-black">
                <span className="text-yellow-300 flex items-center gap-0.5 text-[10px]">
                  <Sparkles size={11} className="text-yellow-400" /> SCORE
                </span>
                <span className="text-white text-xs font-bold drop-shadow">
                  {Math.floor(player.score)} <span className="text-[8px] text-white/40 font-normal">/{TARGET_WIN_SCORE}</span>
                </span>
              </div>

              {/* Victory Progress Bar */}
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-200"
                  style={{ width: `${Math.min(100, (player.score / TARGET_WIN_SCORE) * 100)}%` }}
                />
              </div>

              {/* Health & Armor Micro Bars */}
              <div className="grid grid-cols-2 gap-1 mt-0.5">
                <div className="h-1.5 bg-black/80 rounded-full border border-red-500/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-150"
                    style={{ width: `${Math.max(0, Math.min(100, player.health || 0))}%` }}
                  />
                </div>
                <div className="h-1.5 bg-black/80 rounded-full border border-blue-500/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-150"
                    style={{ width: `${Math.max(0, Math.min(100, player.armor || 0))}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Corner Buttons: Compact Actions (Quests, Roster, Radar, Leaderboard) */}
        <div className="flex items-center gap-1 pointer-events-auto">
          {/* Quests Button */}
          <button
            onClick={() => setShowChallengesModal(true)}
            className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-black/70 backdrop-blur-md border border-amber-500/40 text-amber-400 active:scale-95 shadow"
            title="Challenges & Quests"
          >
            <Target size={14} />
            {completedUnclaimedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center animate-pulse">
                {completedUnclaimedCount}
              </span>
            )}
          </button>

          {/* Roster Button */}
          <button
            onClick={() => setShowRosterModal(true)}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-black/70 backdrop-blur-md border border-purple-500/40 text-purple-300 active:scale-95 shadow text-[10px] font-mono font-bold"
            title="All Players"
          >
            <Users size={14} />
          </button>

          {/* Leaderboard Button */}
          <button
            onClick={() => setShowLeaderboard(true)}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-black/70 backdrop-blur-md border border-yellow-500/40 text-yellow-400 active:scale-95 shadow"
            title="Leaderboard"
          >
            <Trophy size={14} />
          </button>

          {/* Radar */}
          {isAlive && <MiniMap size={52} />}
        </div>
      </header>

      {/* 🌟 PERSISTENT MICRO ROSTER STRIP (Top Non-Intrusive Pill Bar) */}
      <div className="w-full px-2.5 py-0.5 pointer-events-auto flex items-center gap-1 overflow-x-auto no-scrollbar z-20">
        <div className="flex items-center gap-1 flex-nowrap">
          <span className="text-[8px] font-mono font-bold text-white/40 uppercase tracking-wider shrink-0 flex items-center gap-0.5">
            <Users size={9} className="text-cyan-400" /> ({activePlayersList.length}):
          </span>
          {activePlayersList.map((p) => {
            const isMe = p.id === playerId;
            const isRaja = topLeader?.id === p.id;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1 px-1.5 py-0.2 rounded-full border text-[8px] font-mono font-bold shrink-0 transition-all ${
                  isRaja
                    ? 'bg-amber-500/25 border-yellow-400 text-yellow-300 shadow-[0_0_8px_rgba(255,200,0,0.3)]'
                    : isMe
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                    : 'bg-black/60 border-white/10 text-white/80 backdrop-blur-sm'
                }`}
              >
                {isRaja && <Crown size={8} className="text-yellow-400" />}
                {p.isTitanBoss && <span>🐉</span>}
                <span style={{ color: p.color }} className="truncate max-w-[65px]">
                  {isMe ? `${p.name} (You)` : p.name}
                </span>
                <span className="text-white/50 text-[7px]">
                  {Math.floor(p.score)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🏆 CHALLENGE COMPLETED CELEBRATION TOAST */}
      <AnimatePresence>
        {recentCompletedChallenge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -20 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[92vw]"
          >
            <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-black px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 border border-yellow-200">
              <span className="text-xl shrink-0">{recentCompletedChallenge.icon}</span>
              <div className="flex flex-col truncate">
                <span className="text-[8px] font-black uppercase font-mono tracking-wider">
                  QUEST COMPLETED!
                </span>
                <span className="text-[10px] font-bold font-mono truncate">
                  {recentCompletedChallenge.title} (+{recentCompletedChallenge.rewardXP} XP)
                </span>
              </div>
              <button
                onClick={() => {
                  claimChallengeReward(recentCompletedChallenge.id);
                  dismissCompletedChallenge();
                }}
                className="ml-1 px-2 py-0.5 bg-black text-yellow-300 rounded-lg text-[9px] font-mono font-black shadow active:scale-95 shrink-0"
              >
                CLAIM
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎯 IN-GAME MINI CHALLENGE PROGRESS TRACKER (Bottom Left Micro Bar) */}
      {isAlive && (
        <div className="px-2.5 mb-1 pointer-events-none z-20 flex flex-col gap-0.5 max-w-[170px]">
          {challenges
            .filter((c) => !c.claimed)
            .slice(0, 1)
            .map((ch) => (
              <div
                key={ch.id}
                className="px-2 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 shadow flex flex-col gap-0.5"
              >
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span className="text-white/90 font-bold flex items-center gap-1 truncate">
                    <span>{ch.icon}</span> {ch.title}
                  </span>
                  <span className="text-yellow-300 font-bold text-[8px] shrink-0">
                    {ch.completed ? 'DONE! ✅' : `${ch.progress}/${ch.target}`}
                  </span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${ch.completed ? 'bg-green-400' : 'bg-yellow-400'}`}
                    style={{ width: `${Math.min(100, (ch.progress / ch.target) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      )}

      {/* 🎮 BOTTOM SMARTPHONE TOUCH CONTROLS (Ergonomic Thumb Zones) */}
      {isAlive && (
        <div className="w-full px-3 pb-3 safe-pb safe-pl safe-pr flex items-end justify-between pointer-events-auto z-40 mb-1">
          {/* Left Thumb Turbo Boost Button */}
          <div className="flex flex-col items-center">
            <button
              onPointerDown={handleBoostStart}
              onPointerUp={handleBoostEnd}
              onPointerCancel={handleBoostEnd}
              onContextMenu={(e) => e.preventDefault()}
              className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex flex-col items-center justify-center select-none touch-none transition-all duration-100 border-2 active:scale-90 shadow-xl ${
                isBoostingTouch
                  ? 'bg-gradient-to-tr from-amber-500 to-red-500 border-yellow-200 text-white shadow-[0_0_20px_rgba(255,100,0,0.8)]'
                  : 'bg-black/60 backdrop-blur-md border-amber-500/50 text-yellow-400 shadow-[0_0_10px_rgba(255,170,0,0.2)]'
              }`}
            >
              <Zap size={22} className={isBoostingTouch ? 'animate-bounce text-white' : 'text-yellow-400'} />
              <span className="text-[8px] font-black tracking-wider uppercase font-mono mt-0.5">
                BOOST
              </span>
            </button>
          </div>

          {/* Right Thumb Virtual Joystick */}
          <div className="flex flex-col items-center">
            <VirtualJoystick size={105} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📱 COMPACT FLOATING SMARTPHONE POPUPS (Non-intrusive, Never Full-Screen) */}
      {/* ========================================================================= */}

      {/* 👤 USER DEVICE PROFILE & LOGIN MODAL (Compact Floating Card) */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[330px] max-h-[80vh] bg-neutral-950/95 border border-cyan-500/40 rounded-3xl p-4 shadow-2xl flex flex-col gap-2.5 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 text-cyan-300 font-black tracking-wider text-sm">
                  <User size={16} className="text-cyan-400" />
                  DEVICE PROFILE
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 active:bg-white/20"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Segmented Tab Bar */}
              <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setProfileTab('stats')}
                  className={`py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1 ${
                    profileTab === 'stats'
                      ? 'bg-cyan-500 text-black shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <BarChart3 size={11} /> Stats
                </button>
                <button
                  onClick={() => setProfileTab('accounts')}
                  className={`py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-1 ${
                    profileTab === 'accounts'
                      ? 'bg-cyan-500 text-black shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <LogIn size={11} /> Switch ({savedProfiles.length})
                </button>
              </div>

              {profileTab === 'stats' ? (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[50vh] pr-0.5">
                  {/* Current Active Account Header */}
                  <div className="bg-cyan-950/50 border border-cyan-500/40 rounded-2xl p-2.5 flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-xl bg-black/60 border border-cyan-400 flex items-center justify-center text-2xl">
                      {getAvatarEmoji(userProfile.avatar)}
                    </div>
                    <div className="flex flex-col truncate">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-black text-white font-mono truncate">{userProfile.username}</span>
                        <span className="px-1 py-0.2 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 text-[8px] font-mono font-bold">
                          Lv.{userProfile.level}
                        </span>
                      </div>
                      <span className="text-[8px] text-white/50 font-mono">Saved on this phone ✓</span>
                      <div className="w-28 h-1 bg-black/60 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-cyan-400"
                          style={{ width: `${Math.min(100, ((userProfile.xp % 300) / 300) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Career Stats Grid */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col">
                      <span className="text-[8px] font-mono text-yellow-400 font-bold">👑 RAJA WINS</span>
                      <span className="text-base font-black text-white font-mono">{userProfile.wins || 0}</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col">
                      <span className="text-[8px] font-mono text-red-400 font-bold">⚔️ TOTAL KILLS</span>
                      <span className="text-base font-black text-white font-mono">{userProfile.totalKills || 0}</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col">
                      <span className="text-[8px] font-mono text-amber-300 font-bold">🏆 HIGH SCORE</span>
                      <span className="text-base font-black text-white font-mono">{userProfile.highestScore || 0}</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col">
                      <span className="text-[8px] font-mono text-emerald-400 font-bold">⚡ WIN RATE</span>
                      <span className="text-base font-black text-white font-mono">{winRate}% <span className="text-[8px] font-normal text-white/40">({userProfile.matchesPlayed}g)</span></span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[50vh] pr-0.5">
                  <div className="flex flex-col gap-1">
                    {savedProfiles.map((p) => {
                      const isActive = p.id === userProfile.id;
                      return (
                        <div
                          key={p.id}
                          className={`p-2 rounded-xl border flex items-center justify-between text-[10px] font-mono ${
                            isActive
                              ? 'bg-cyan-500/20 border-cyan-400 font-bold'
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                            <span className="text-base">{getAvatarEmoji(p.avatar)}</span>
                            <div className="flex flex-col truncate">
                              <span className="font-bold text-white truncate">{p.username} {isActive && '(Active)'}</span>
                              <span className="text-[8px] text-white/40">Lv.{p.level} • {p.wins || 0} Wins</span>
                            </div>
                          </div>
                          {!isActive && (
                            <button
                              onClick={() => {
                                switchProfile(p.id);
                                setShowProfileModal(false);
                              }}
                              className="px-2.5 py-0.5 bg-cyan-400 text-black rounded-lg text-[9px] font-black"
                            >
                              Login
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* New Account Quick Add */}
                  <div className="border-t border-white/10 pt-2 flex flex-col gap-1.5">
                    <input
                      type="text"
                      placeholder="New nickname..."
                      maxLength={16}
                      value={newLoginName}
                      onChange={(e) => setNewLoginName(e.target.value)}
                      className="w-full bg-black/60 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateNewAccount()}
                    />
                    <div className="grid grid-cols-3 gap-1">
                      {(['snake', 'skull', 'robot'] as const).map((head) => (
                        <button
                          key={head}
                          onClick={() => setNewLoginAvatar(head)}
                          className={`py-1 rounded-lg border text-[10px] font-mono font-bold flex items-center justify-center gap-0.5 ${
                            newLoginAvatar === head
                              ? 'bg-cyan-500/25 border-cyan-400 text-white'
                              : 'bg-white/5 border-white/10 text-white/60'
                          }`}
                        >
                          <span>{getAvatarEmoji(head)}</span> {head}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleCreateNewAccount}
                      disabled={!newLoginName.trim()}
                      className="w-full py-1.5 bg-cyan-400 disabled:opacity-40 text-black font-black font-mono text-[10px] uppercase rounded-xl shadow"
                    >
                      Save & Login
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎯 CHALLENGES & QUESTS MODAL (Compact Bottom Card) */}
      <AnimatePresence>
        {showChallengesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={() => setShowChallengesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[330px] max-h-[80vh] bg-neutral-950/95 border border-amber-500/40 rounded-3xl p-4 shadow-2xl flex flex-col gap-2.5 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-black tracking-wider text-sm">
                  <Target size={16} className="text-amber-400" />
                  ARENA QUESTS
                </div>
                <button
                  onClick={() => setShowChallengesModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 active:bg-white/20"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Level XP Bar */}
              <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-2 flex flex-col gap-1 text-[10px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-yellow-300 font-black flex items-center gap-1">
                    <Award size={12} /> LEVEL {playerLevel}
                  </span>
                  <span className="text-white/80">{playerXP % 300}/300 XP</span>
                </div>
                <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-amber-300"
                    style={{ width: `${Math.min(100, ((playerXP % 300) / 300) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Scrollable Challenges List */}
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[50vh] pr-0.5">
                {challenges.map((ch) => (
                  <div
                    key={ch.id}
                    className={`p-2 rounded-xl border flex flex-col gap-1 ${
                      ch.claimed
                        ? 'bg-white/5 border-white/5 opacity-50'
                        : ch.completed
                        ? 'bg-amber-500/20 border-yellow-400'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 truncate max-w-[75%]">
                        <span className="text-sm">{ch.icon}</span>
                        <div className="flex flex-col truncate">
                          <span className="font-bold text-white truncate">{ch.title}</span>
                          <span className="text-[8px] text-white/50 truncate">{ch.description}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-yellow-400 shrink-0">+{ch.rewardXP} XP</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <div className="flex-1 h-1 bg-black/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${ch.completed ? 'bg-green-400' : 'bg-yellow-400'}`}
                          style={{ width: `${Math.min(100, (ch.progress / ch.target) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[8px] font-mono text-white/60 shrink-0">
                        {ch.progress}/{ch.target}
                      </span>
                      {ch.completed && !ch.claimed && (
                        <button
                          onClick={() => claimChallengeReward(ch.id)}
                          className="px-2 py-0.5 bg-yellow-400 text-black font-black text-[8px] font-mono rounded-lg active:scale-95 shrink-0 uppercase"
                        >
                          Claim
                        </button>
                      )}
                      {ch.claimed && (
                        <span className="text-[8px] font-mono font-bold text-green-400 shrink-0">✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 👥 ALL USERS IN SCREEN MODAL (Compact Floating Card) */}
      <AnimatePresence>
        {showRosterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={() => setShowRosterModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[320px] max-h-[75vh] bg-neutral-950/95 border border-purple-500/40 rounded-3xl p-4 shadow-2xl flex flex-col gap-2.5 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 text-purple-300 font-black tracking-wider text-sm">
                  <Users size={16} className="text-purple-400" />
                  ALL USERS IN ARENA ({activePlayersList.length})
                </div>
                <button
                  onClick={() => setShowRosterModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 active:bg-white/20"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[50vh] pr-0.5">
                {activePlayersList.map((p) => {
                  const isMe = p.id === playerId;
                  const isRaja = topLeader?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-2 rounded-xl border text-[10px] font-mono ${
                        isRaja
                          ? 'bg-yellow-500/20 border-yellow-400 font-bold'
                          : isMe
                          ? 'bg-cyan-500/20 border-cyan-400 font-bold'
                          : 'bg-white/5 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                        <span className="text-sm">{isRaja ? '👑' : p.isTitanBoss ? '🐉' : getAvatarEmoji(p.headType)}</span>
                        <div className="flex flex-col truncate">
                          <span style={{ color: p.color }} className="font-bold truncate">
                            {p.name} {isMe && '(You)'}
                          </span>
                          <span className="text-[8px] text-white/50">
                            HP {Math.floor(p.health)} • {p.kills || 0} kills
                          </span>
                        </div>
                      </div>
                      <span className="text-yellow-300 font-black">{Math.floor(p.score)} pts</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📋 LEADERBOARD MODAL (Compact Floating Card) */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={() => setShowLeaderboard(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[320px] max-h-[75vh] bg-neutral-950/95 border border-yellow-500/40 rounded-3xl p-4 shadow-2xl flex flex-col gap-2.5 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 text-yellow-400 font-black tracking-wider text-sm">
                  <Trophy size={16} className="text-yellow-400" />
                  LEADERBOARD
                </div>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 active:bg-white/20"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[50vh] pr-0.5">
                {gameState && gameState.leaderboard && gameState.leaderboard.length > 0 ? (
                  gameState.leaderboard.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-2 rounded-xl border text-[10px] font-mono ${
                        entry.id === playerId
                          ? 'bg-yellow-500/20 border-yellow-400 font-bold'
                          : 'bg-white/5 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                        <span className="w-4 text-center font-bold text-white/40">{idx + 1}</span>
                        <span style={{ color: entry.color }} className="font-bold truncate">
                          {entry.name}
                        </span>
                      </div>
                      <span className="text-yellow-300 font-black">{entry.score} pts</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-[10px] text-white/40 py-4 font-mono">No survivors ranked yet</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 👑 MULTIPLAYER WIN / CHAMPION VICTORY SCREEN (Compact Modal) */}
      <AnimatePresence>
        {showVictoryModal && matchWinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-md pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.88, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 20 }}
              className="w-full max-w-[310px] bg-gradient-to-b from-neutral-950 via-amber-950/40 to-neutral-950 border-2 border-yellow-400 rounded-3xl p-4 shadow-2xl flex flex-col items-center gap-3 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center shadow-[0_0_20px_rgba(255,200,0,0.8)]">
                <Crown size={28} className="text-black" />
              </div>

              <div>
                <div className="inline-block px-2.5 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded-full text-[8px] font-black uppercase tracking-widest mb-0.5">
                  MATCH VICTORY
                </div>
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 drop-shadow">
                  RAJA CHAMPION
                </h2>
                <p className="text-xs font-black font-mono mt-0.5" style={{ color: matchWinner.color }}>
                  👑 {matchWinner.name}
                </p>
                <p className="text-[10px] text-white/60 font-mono mt-0.5">
                  Won with <span className="text-yellow-300 font-bold">{matchWinner.score} PTS</span> • {matchWinner.kills} Kills
                </p>
              </div>

              {/* Winner Quick Stats Pill */}
              <div className="w-full bg-white/5 border border-white/10 rounded-xl p-2 flex items-center justify-around text-center font-mono text-[10px]">
                <div>
                  <span className="text-[8px] text-white/40 block">WINNER</span>
                  <span className="font-bold text-white truncate max-w-[70px] block">{matchWinner.name}</span>
                </div>
                <div className="w-px h-5 bg-white/10" />
                <div>
                  <span className="text-[8px] text-white/40 block">SCORE</span>
                  <span className="font-bold text-yellow-300">{matchWinner.score}</span>
                </div>
                <div className="w-px h-5 bg-white/10" />
                <div>
                  <span className="text-[8px] text-white/40 block">NEXT ROUND</span>
                  <span className="font-bold text-amber-400">
                    {gameState?.match.nextRoundCountdown || 5}s
                  </span>
                </div>
              </div>

              <button
                onClick={handleStartGame}
                className="w-full py-2.5 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow active:scale-95"
              >
                JOIN NEXT ARENA ROUND
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 SMARTPHONE DEPLOY / RESPAWN CARD (Compact, Clean, Never Blocks Screen) */}
      <AnimatePresence>
        {(!player || isDead) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm pointer-events-auto safe-pt safe-pb"
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              className="w-full max-w-[320px] max-h-[90vh] bg-neutral-950/95 border border-yellow-500/40 rounded-3xl p-4 shadow-2xl flex flex-col items-center gap-3 overflow-y-auto no-scrollbar"
            >
              {isDead ? (
                <div className="text-center w-full">
                  <div className="inline-block px-2.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[9px] font-black tracking-widest uppercase mb-0.5">
                    Eliminated
                  </div>
                  <h2 className="text-2xl font-black text-red-500 drop-shadow">
                    GAME OVER
                  </h2>
                  <p className="text-[10px] font-mono text-yellow-300">
                    Final Score: <span className="text-white font-bold">{Math.floor(player.score)}</span>
                  </p>
                </div>
              ) : (
                <div className="text-center w-full">
                  <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500 drop-shadow">
                    SNAKE RAJA ARENA
                  </h2>
                  <p className="text-[10px] text-white/50 mt-0.5">
                    Reach {TARGET_WIN_SCORE} PTS to Win the Raja Crown 👑
                  </p>
                </div>
              )}

              {/* Logged-In User Account Header */}
              <div className="w-full bg-cyan-950/40 border border-cyan-500/30 rounded-2xl p-2 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-lg shrink-0">{getAvatarEmoji(userProfile.avatar)}</span>
                  <div className="flex flex-col truncate">
                    <span className="text-[8px] font-mono text-cyan-300 font-bold">
                      👤 Logged In
                    </span>
                    <span className="text-xs font-bold text-white font-mono truncate max-w-[120px]">
                      {userProfile.username} (Lv.{userProfile.level})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="px-2 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 rounded-xl text-[8px] font-mono font-bold active:scale-95 shrink-0"
                >
                  Manage
                </button>
              </div>

              {/* Player Name Input */}
              <div className="w-full flex flex-col gap-1">
                <label className="text-[9px] font-mono font-bold text-yellow-400/80 uppercase tracking-wider ml-1">
                  Survivor Nickname
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter nickname..."
                    maxLength={16}
                    className="flex-1 bg-black/60 border border-yellow-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleStartGame()}
                  />
                  <button
                    onClick={handleRandomName}
                    title="Random Name"
                    className="w-9 h-9 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-yellow-400 active:scale-95 shrink-0"
                  >
                    <Dices size={16} />
                  </button>
                </div>
              </div>

              {/* Head Avatar Picker */}
              <div className="w-full flex flex-col gap-1">
                <label className="text-[9px] font-mono font-bold text-yellow-400/80 uppercase tracking-wider ml-1">
                  Choose Champion
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'snake', label: 'Serpent', emoji: '🐍' },
                    { id: 'skull', label: 'Shadow', emoji: '💀' },
                    { id: 'robot', label: 'Cyber', emoji: '🤖' },
                  ].map((head) => (
                    <button
                      key={head.id}
                      onClick={() => setSelectedHeadType(head.id as any)}
                      className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 ${
                        selectedHeadType === head.id
                          ? 'bg-yellow-500/25 border-yellow-400 text-white shadow'
                          : 'bg-white/5 border-white/10 text-white/60'
                      }`}
                    >
                      <span className="text-xl">{head.emoji}</span>
                      <span className="text-[8px] font-bold font-mono">{head.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Deploy Action Button */}
              <button
                onClick={handleStartGame}
                className="w-full py-3 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 text-black font-black text-sm rounded-xl shadow-lg active:scale-95 uppercase tracking-wider flex items-center justify-center gap-1.5 mt-0.5"
              >
                <Crosshair size={16} className="text-black" />
                {isDead ? 'PLAY AGAIN' : 'DROP INTO ARENA'}
              </button>

              {/* Footer Credits & Donate Button */}
              <div className="w-full pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] font-mono">
                <a
                  href="https://itsrkmahapatra.qzz.io/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/50 hover:text-yellow-400 underline truncate max-w-[170px]"
                >
                  🇮🇳 <span className="text-yellow-400 font-bold">Raj Kishor</span>
                </a>
                <button
                  onClick={() => setShowDonate(true)}
                  className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded-full font-bold text-[8px] active:scale-95 flex items-center gap-1 shrink-0"
                >
                  <QrCode size={9} /> UPI Donate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💳 MOBILE UPI DONATION SHEET (Compact Sheet) */}
      <AnimatePresence>
        {showDonate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={() => setShowDonate(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[310px] bg-neutral-950 border border-yellow-500/40 rounded-3xl p-4 shadow-2xl flex flex-col items-center gap-2.5"
            >
              <div className="w-full flex items-center justify-between">
                <h3 className="text-sm font-black text-yellow-400 flex items-center gap-1">
                  <QrCode size={16} /> DONATE VIA UPI
                </h3>
                <button
                  onClick={() => setShowDonate(false)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 active:bg-white/20"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1.5 w-full">
                {['50', '100', '200', '500'].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setDonateAmount(amt)}
                    className={`py-1.5 rounded-lg text-[10px] font-mono font-black border ${
                      donateAmount === amt
                        ? 'bg-yellow-500 text-black border-yellow-400'
                        : 'bg-white/5 text-white/80 border-white/10'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <div className="bg-white p-1.5 rounded-xl shadow">
                <img src={qrUrl} alt="UPI QR Code" className="w-36 h-36 block" />
              </div>

              <a
                href={upiString}
                className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-[10px] uppercase tracking-wider rounded-xl text-center shadow active:scale-95 block"
              >
                Pay ₹{donateAmount || 0} via UPI
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
