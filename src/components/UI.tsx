/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import { useGameStore, mobileInputs } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Zap,
  Shield,
  Heart,
  Sparkles,
  Dices,
  X,
  QrCode,
  Crosshair,
  Target,
  Crown,
  Users,
  Flame,
  Award,
  ChevronRight,
  Swords,
  User,
  LogIn,
  LogOut,
  UserCheck,
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

  // Auto-dismiss challenge toast after 4s
  useEffect(() => {
    if (recentCompletedChallenge) {
      const timer = setTimeout(() => {
        dismissCompletedChallenge();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [recentCompletedChallenge, dismissCompletedChallenge]);

  const player = playerId && gameState ? gameState.players[playerId] : null;
  const isAlive = player?.state === 'alive';
  const isDead = player?.state === 'dead';

  const upiString = `upi://pay?pa=Q169118772@ybl&pn=Raj%20Kishor%20Mahapatra&am=${donateAmount || 0}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiString)}`;

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

      {/* 🔴 TOP DYNAMIC KILLFEED (Top Right) */}
      <div className="absolute top-14 right-3 z-30 flex flex-col gap-1 pointer-events-none max-w-[200px] sm:max-w-[260px]">
        <AnimatePresence>
          {recentKills.slice(0, 3).map((kill) => (
            <motion.div
              key={kill.id}
              initial={{ opacity: 0, x: 30, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30 }}
              className="px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-red-500/30 shadow-lg flex items-center gap-1.5 text-[10px] font-mono"
            >
              <Swords size={11} className="text-red-400 shrink-0" />
              <span style={{ color: kill.killerColor }} className="font-black truncate max-w-[70px]">
                {kill.killerName}
              </span>
              <span className="text-white/40 text-[9px]">⚔️</span>
              <span style={{ color: kill.victimColor }} className="font-bold truncate max-w-[70px]">
                {kill.victimName}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ⚡ TOP GLOBAL ARENA EVENT BANNER */}
      {gameState?.currentEvent && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-1 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
        >
          <div className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-red-500/30 to-amber-500/20 backdrop-blur-md border border-amber-400/50 shadow-[0_0_25px_rgba(255,170,0,0.4)] flex items-center gap-2">
            <span className="text-base animate-bounce">{gameState.currentEvent.icon}</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-yellow-300 font-mono tracking-wider">
                  {gameState.currentEvent.title}
                </span>
                <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-yellow-200 px-1.5 py-0.2 rounded-full border border-amber-400/40">
                  {gameState.currentEvent.timeRemaining}s
                </span>
              </div>
              <span className="text-[9px] text-white/80 font-mono font-medium">
                {gameState.currentEvent.description}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 🟢 TOP SMARTPHONE HUD */}
      <header className="w-full flex items-start justify-between px-3 pt-2.5 pb-1 safe-pt safe-pl safe-pr z-30">

        {/* Left: Brand + Profile Login Quick Pill + Stats */}
        <div className="flex flex-col gap-1.5 pointer-events-auto max-w-[55%]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-500 drop-shadow-[0_0_10px_rgba(255,170,0,0.5)]">
              SNAKE RAJA
            </span>

            {/* Profile Login Chip */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-400/50 text-cyan-300 text-[10px] font-mono font-bold active:scale-95 shadow"
              title="Device User Profile & Login"
            >
              <span>{getAvatarEmoji(userProfile.avatar)}</span>
              <span className="truncate max-w-[70px]">{userProfile.username}</span>
              <span className="bg-cyan-500/30 px-1 rounded text-[8px]">Lv.{userProfile.level}</span>
            </button>
          </div>

          {isAlive && player && (
            <div className="flex flex-col gap-1 bg-black/75 backdrop-blur-md p-2 rounded-2xl border border-white/15 shadow-xl">
              {/* Score & Victory Target */}
              <div className="flex items-center justify-between gap-2 text-xs font-mono font-black">
                <span className="text-yellow-300 flex items-center gap-1">
                  <Sparkles size={13} className="text-yellow-400" />
                  SCORE
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-sm font-bold drop-shadow">
                    {Math.floor(player.score)}
                  </span>
                  <span className="text-[9px] text-white/40 font-normal">
                    /{TARGET_WIN_SCORE}
                  </span>
                </div>
              </div>

              {/* Victory Progress Bar */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-orange-500 transition-all duration-200 shadow-[0_0_8px_rgba(255,170,0,0.6)]"
                  style={{ width: `${Math.min(100, (player.score / TARGET_WIN_SCORE) * 100)}%` }}
                />
              </div>

              {/* Health Bar */}
              <div className="w-full h-2.5 bg-black/80 rounded-full border border-red-500/30 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-red-400 transition-all duration-200"
                  style={{ width: `${Math.max(0, Math.min(100, player.health || 0))}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-white leading-none">
                  HP {Math.floor(player.health || 0)}
                </div>
              </div>

              {/* Armor Bar */}
              <div className="w-full h-2 bg-black/80 rounded-full border border-blue-500/30 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-cyan-600 via-blue-500 to-indigo-400 transition-all duration-200"
                  style={{ width: `${Math.max(0, Math.min(100, player.armor || 0))}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-[7px] font-mono font-bold text-white leading-none">
                  ARMOR {Math.floor(player.armor || 0)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Corner Buttons: Profile + Quests + Roster + Radar + Leaderboard */}
        <div className="flex items-start gap-1.5 pointer-events-auto">
          {/* User Profile Button */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-2xl bg-black/70 backdrop-blur-md border border-cyan-500/40 text-cyan-300 active:scale-95 transition-transform shadow-lg"
            title="Player Device Profile"
          >
            <User size={16} />
            <span className="text-[7px] font-bold font-mono text-white/80">USER</span>
          </button>

          {/* Challenges Button */}
          <button
            onClick={() => setShowChallengesModal(true)}
            className="relative flex flex-col items-center justify-center w-10 h-10 rounded-2xl bg-black/70 backdrop-blur-md border border-amber-500/40 text-amber-400 active:scale-95 transition-transform shadow-lg"
            title="Active Challenges"
          >
            <Target size={16} />
            <span className="text-[7px] font-bold font-mono text-white/80">QUEST</span>
            {completedUnclaimedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse border border-white">
                {completedUnclaimedCount}
              </span>
            )}
          </button>

          {/* All Users Roster Button */}
          <button
            onClick={() => setShowRosterModal(true)}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-2xl bg-black/70 backdrop-blur-md border border-purple-500/40 text-purple-300 active:scale-95 transition-transform shadow-lg"
            title="All Players"
          >
            <Users size={16} />
            <span className="text-[7px] font-bold font-mono text-white/80">{activePlayersList.length}</span>
          </button>

          {/* Radar */}
          {isAlive && <MiniMap size={68} />}

          {/* Leaderboard Button */}
          <button
            onClick={() => setShowLeaderboard(true)}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-2xl bg-black/70 backdrop-blur-md border border-yellow-500/40 text-yellow-400 active:scale-95 transition-transform shadow-lg"
            title="Leaderboard"
          >
            <Trophy size={16} />
            <span className="text-[7px] font-bold font-mono text-white/80">TOP</span>
          </button>
        </div>
      </header>

      {/* 🌟 PERSISTENT ON-SCREEN ACTIVE PLAYERS ROSTER CHIP ROW (Top Center-Left) */}
      <div className="w-full px-3 py-1 pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar z-20">
        <div className="flex items-center gap-1.5 flex-nowrap py-0.5">
          <span className="text-[9px] font-mono font-bold text-white/50 uppercase tracking-widest shrink-0 flex items-center gap-1">
            <Users size={10} className="text-cyan-400" /> PLAYERS ({activePlayersList.length}):
          </span>
          {activePlayersList.map((p) => {
            const isMe = p.id === playerId;
            const isRaja = topLeader?.id === p.id;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold shrink-0 transition-all ${
                  isRaja
                    ? 'bg-amber-500/25 border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(255,200,0,0.3)]'
                    : isMe
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                    : 'bg-black/60 border-white/15 text-white/90 backdrop-blur-sm'
                }`}
              >
                {isRaja && <Crown size={10} className="text-yellow-400 animate-bounce" />}
                {p.isTitanBoss && <span>🐉</span>}
                <span style={{ color: p.color }} className="truncate max-w-[85px]">
                  {isMe ? `${p.name} (You)` : p.name}
                </span>
                <span className="text-white/60 text-[8px] bg-white/10 px-1 rounded">
                  {Math.floor(p.score)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🏆 CHALLENGE COMPLETED NOTIFICATION CELEBRATION TOAST */}
      <AnimatePresence>
        {recentCompletedChallenge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -40 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
          >
            <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-black px-4 py-2.5 rounded-2xl shadow-[0_0_35px_rgba(255,200,0,0.8)] flex items-center gap-3 border-2 border-yellow-200">
              <span className="text-2xl">{recentCompletedChallenge.icon}</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase font-mono tracking-wider">
                  🎉 CHALLENGE COMPLETED!
                </span>
                <span className="text-xs font-bold font-mono">
                  {recentCompletedChallenge.title} (+{recentCompletedChallenge.rewardXP} XP)
                </span>
              </div>
              <button
                onClick={() => {
                  claimChallengeReward(recentCompletedChallenge.id);
                  dismissCompletedChallenge();
                }}
                className="ml-2 px-2.5 py-1 bg-black text-yellow-300 rounded-xl text-xs font-mono font-black shadow active:scale-95"
              >
                CLAIM
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎯 IN-GAME MINI CHALLENGE PROGRESS TRACKER (Bottom Left Overlay) */}
      {isAlive && (
        <div className="px-3 mb-1 pointer-events-none z-20 flex flex-col gap-1 max-w-[220px]">
          {challenges
            .filter((c) => !c.claimed)
            .slice(0, 2)
            .map((ch) => (
              <div
                key={ch.id}
                className="px-2.5 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 shadow-lg flex flex-col gap-0.5"
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-white/90 font-bold flex items-center gap-1">
                    <span>{ch.icon}</span> {ch.title}
                  </span>
                  <span className="text-yellow-300 font-bold text-[9px]">
                    {ch.completed ? 'DONE! ✅' : `${ch.progress}/${ch.target}`}
                  </span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      ch.completed
                        ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]'
                        : 'bg-yellow-400'
                    }`}
                    style={{ width: `${Math.min(100, (ch.progress / ch.target) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      )}

      {/* 🎮 BOTTOM TOUCH CONTROLS (Active during gameplay) */}
      {isAlive && (
        <div className="w-full px-4 pb-4 safe-pb safe-pl safe-pr flex items-end justify-between pointer-events-auto z-40 mb-2">
          {/* Left Thumb Turbo Boost Button */}
          <div className="flex flex-col items-center">
            <button
              onPointerDown={handleBoostStart}
              onPointerUp={handleBoostEnd}
              onPointerCancel={handleBoostEnd}
              onContextMenu={(e) => e.preventDefault()}
              className={`w-20 h-20 rounded-full flex flex-col items-center justify-center select-none touch-none transition-all duration-100 border-2 active:scale-90 shadow-2xl ${
                isBoostingTouch
                  ? 'bg-gradient-to-tr from-amber-500 to-red-500 border-yellow-200 text-white shadow-[0_0_30px_rgba(255,100,0,0.9)]'
                  : 'bg-black/60 backdrop-blur-md border-amber-500/50 text-yellow-400 shadow-[0_0_15px_rgba(255,170,0,0.3)]'
              }`}
            >
              <Zap size={26} className={isBoostingTouch ? 'animate-bounce text-white' : 'text-yellow-400'} />
              <span className="text-[10px] font-black tracking-wider uppercase font-mono mt-0.5">
                BOOST
              </span>
            </button>
            <span className="text-[9px] font-mono font-bold text-white/40 mt-1 uppercase tracking-wider">
              Hold Sprint
            </span>
          </div>

          {/* Right Thumb Virtual Joystick */}
          <div className="flex flex-col items-center">
            <VirtualJoystick size={120} />
            <span className="text-[9px] font-mono font-bold text-white/40 mt-1 uppercase tracking-wider">
              Drag to Steer
            </span>
          </div>
        </div>
      )}

      {/* 👤 USER DEVICE PROFILE & LOGIN MODAL */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md pointer-events-auto"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-neutral-950 border border-cyan-500/40 rounded-3xl p-5 shadow-[0_0_40px_rgba(0,255,255,0.25)] flex flex-col gap-3.5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-cyan-300 font-black tracking-wider text-base">
                  <User size={20} className="text-cyan-400" />
                  DEVICE USER ACCOUNT
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 active:bg-white/20"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tabs: Career Stats / Switch Accounts */}
              <div className="grid grid-cols-2 gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10">
                <button
                  onClick={() => setProfileTab('stats')}
                  className={`py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
                    profileTab === 'stats'
                      ? 'bg-cyan-500 text-black shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <BarChart3 size={13} /> Profile Stats
                </button>
                <button
                  onClick={() => setProfileTab('accounts')}
                  className={`py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
                    profileTab === 'accounts'
                      ? 'bg-cyan-500 text-black shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <LogIn size={13} /> Switch Account
                </button>
              </div>

              {profileTab === 'stats' ? (
                <div className="flex flex-col gap-3">
                  {/* Current Logged In Profile Card */}
                  <div className="bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/40 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-black/60 border border-cyan-400 flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(0,255,255,0.3)]">
                      {getAvatarEmoji(userProfile.avatar)}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black text-white font-mono">{userProfile.username}</span>
                        <span className="px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 text-[9px] font-mono font-bold">
                          Lv.{userProfile.level}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/50 font-mono">
                        Saved locally on this device ✓
                      </span>
                      {/* XP mini bar */}
                      <div className="w-36 h-1.5 bg-black/60 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-cyan-400"
                          style={{ width: `${Math.min(100, ((userProfile.xp % 300) / 300) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Career Stats Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex flex-col">
                      <span className="text-[10px] font-mono text-yellow-400 font-bold flex items-center gap-1">
                        👑 RAJA WINS
                      </span>
                      <span className="text-xl font-black text-white font-mono mt-0.5">{userProfile.wins || 0}</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex flex-col">
                      <span className="text-[10px] font-mono text-red-400 font-bold flex items-center gap-1">
                        ⚔️ TOTAL KILLS
                      </span>
                      <span className="text-xl font-black text-white font-mono mt-0.5">{userProfile.totalKills || 0}</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex flex-col">
                      <span className="text-[10px] font-mono text-amber-300 font-bold flex items-center gap-1">
                        🏆 HIGHEST SCORE
                      </span>
                      <span className="text-xl font-black text-white font-mono mt-0.5">{userProfile.highestScore || 0}</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex flex-col">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                        ⚡ WIN RATE
                      </span>
                      <span className="text-xl font-black text-white font-mono mt-0.5">{winRate}% ({userProfile.matchesPlayed} games)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                  {/* Saved Device Profiles List */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-white/50 uppercase">
                      Accounts on this device ({savedProfiles.length})
                    </span>
                    {savedProfiles.map((p) => {
                      const isActive = p.id === userProfile.id;
                      return (
                        <div
                          key={p.id}
                          className={`p-2.5 rounded-2xl border flex items-center justify-between ${
                            isActive
                              ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.2)]'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getAvatarEmoji(p.avatar)}</span>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white font-mono">
                                {p.username} {isActive && '(Active)'}
                              </span>
                              <span className="text-[9px] text-white/50 font-mono">
                                Lv.{p.level} • {p.wins || 0} Wins • High {p.highestScore || 0}
                              </span>
                            </div>
                          </div>
                          {!isActive && (
                            <button
                              onClick={() => {
                                switchProfile(p.id);
                                setShowProfileModal(false);
                              }}
                              className="px-3 py-1 bg-cyan-400 text-black rounded-xl text-xs font-mono font-black active:scale-95"
                            >
                              Login
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Create / Login with another name */}
                  <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
                    <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase flex items-center gap-1">
                      <PlusCircle size={12} /> Login / New Profile
                    </span>
                    <input
                      type="text"
                      placeholder="Enter new nickname..."
                      maxLength={16}
                      value={newLoginName}
                      onChange={(e) => setNewLoginName(e.target.value)}
                      className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateNewAccount()}
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['snake', 'skull', 'robot'] as const).map((head) => (
                        <button
                          key={head}
                          onClick={() => setNewLoginAvatar(head)}
                          className={`py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1 ${
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
                      className="w-full py-2 bg-cyan-400 disabled:opacity-40 text-black font-black font-mono text-xs uppercase rounded-xl active:scale-95 shadow"
                    >
                      Login Profile
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowProfileModal(false)}
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs uppercase tracking-wider"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 👑 MULTIPLAYER WIN / CHAMPION VICTORY SCREEN */}
      <AnimatePresence>
        {showVictoryModal && matchWinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              className="w-full max-w-sm bg-gradient-to-b from-neutral-950 via-amber-950/40 to-neutral-950 border-2 border-yellow-400 rounded-3xl p-6 shadow-[0_0_60px_rgba(255,200,0,0.5)] flex flex-col items-center gap-4 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center shadow-[0_0_30px_rgba(255,200,0,0.8)] animate-pulse">
                <Crown size={36} className="text-black" />
              </div>

              <div>
                <div className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded-full text-[10px] font-black uppercase tracking-widest mb-1">
                  MATCH VICTORY
                </div>
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-orange-400 drop-shadow">
                  RAJA CHAMPION
                </h2>
                <p className="text-sm font-black font-mono mt-1" style={{ color: matchWinner.color }}>
                  👑 {matchWinner.name}
                </p>
                <p className="text-xs text-white/60 font-mono mt-0.5">
                  Conquered the arena with <span className="text-yellow-300 font-bold">{matchWinner.score} PTS</span> • {matchWinner.kills} Kills
                </p>
              </div>

              {/* Match Winner Summary Pill */}
              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-around text-center font-mono">
                <div>
                  <span className="text-[10px] text-white/50 block">WINNER</span>
                  <span className="text-xs font-bold text-white">{matchWinner.name}</span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div>
                  <span className="text-[10px] text-white/50 block">FINAL SCORE</span>
                  <span className="text-xs font-bold text-yellow-300">{matchWinner.score}</span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div>
                  <span className="text-[10px] text-white/50 block">NEXT ROUND</span>
                  <span className="text-xs font-bold text-amber-400">
                    {gameState?.match.nextRoundCountdown || 5}s
                  </span>
                </div>
              </div>

              <button
                onClick={handleStartGame}
                className="w-full py-3.5 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-black font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg active:scale-95"
              >
                JOIN NEXT ARENA ROUND
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎯 CHALLENGES & MISSIONS MODAL */}
      <AnimatePresence>
        {showChallengesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto"
            onClick={() => setShowChallengesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-neutral-950 border border-amber-500/40 rounded-3xl p-5 shadow-[0_0_40px_rgba(255,170,0,0.3)] flex flex-col gap-3.5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-black tracking-wider text-base">
                  <Target size={20} className="text-amber-400" />
                  ARENA CHALLENGES
                </div>
                <button
                  onClick={() => setShowChallengesModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 active:bg-white/20"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Player XP & Level Header */}
              <div className="w-full bg-amber-500/15 border border-amber-500/30 rounded-2xl p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-yellow-300 font-black flex items-center gap-1">
                    <Award size={14} /> LEVEL {playerLevel} SURVIVOR
                  </span>
                  <span className="text-white/80 font-bold">{playerXP % 300} / 300 XP</span>
                </div>
                <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-amber-300"
                    style={{ width: `${Math.min(100, ((playerXP % 300) / 300) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Challenges List */}
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {challenges.map((ch) => (
                  <div
                    key={ch.id}
                    className={`p-3 rounded-2xl border flex flex-col gap-1.5 ${
                      ch.claimed
                        ? 'bg-white/5 border-white/5 opacity-60'
                        : ch.completed
                        ? 'bg-amber-500/20 border-yellow-400 shadow-[0_0_15px_rgba(255,170,0,0.2)]'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{ch.icon}</span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white font-mono">{ch.title}</span>
                          <span className="text-[10px] text-white/60">{ch.description}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-yellow-400">
                        +{ch.rewardXP} XP
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-1">
                      <div className="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${ch.completed ? 'bg-green-400' : 'bg-yellow-400'}`}
                          style={{ width: `${Math.min(100, (ch.progress / ch.target) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-white/70 shrink-0">
                        {ch.progress}/{ch.target}
                      </span>

                      {ch.completed && !ch.claimed && (
                        <button
                          onClick={() => claimChallengeReward(ch.id)}
                          className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-[10px] font-mono rounded-lg active:scale-95 shadow shrink-0 uppercase"
                        >
                          Claim
                        </button>
                      )}
                      {ch.claimed && (
                        <span className="text-[9px] font-mono font-bold text-green-400 shrink-0">
                          Claimed ✓
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowChallengesModal(false)}
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs uppercase tracking-wider"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 👥 ALL USERS IN SCREEN ROSTER MODAL */}
      <AnimatePresence>
        {showRosterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto"
            onClick={() => setShowRosterModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-neutral-950 border border-purple-500/40 rounded-3xl p-5 shadow-[0_0_40px_rgba(168,85,247,0.2)] flex flex-col gap-3.5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-purple-300 font-black tracking-wider text-base">
                  <Users size={20} className="text-purple-400" />
                  ALL USERS IN SCREEN ({activePlayersList.length})
                </div>
                <button
                  onClick={() => setShowRosterModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 active:bg-white/20"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {activePlayersList.map((p) => {
                  const isMe = p.id === playerId;
                  const isRaja = topLeader?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-mono ${
                        isRaja
                          ? 'bg-yellow-500/20 border-yellow-400 font-bold'
                          : isMe
                          ? 'bg-cyan-500/20 border-cyan-400 font-bold'
                          : 'bg-white/5 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate max-w-[70%]">
                        <span className="text-base">{isRaja ? '👑' : p.isTitanBoss ? '🐉' : getAvatarEmoji(p.headType)}</span>
                        <div className="flex flex-col truncate">
                          <span style={{ color: p.color }} className="font-bold truncate">
                            {p.name} {isMe && '(You)'}
                          </span>
                          <span className="text-[9px] text-white/50">
                            HP {Math.floor(p.health)} • Armor {Math.floor(p.armor)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-yellow-300 font-black">{Math.floor(p.score)} pts</span>
                        <span className="text-[9px] text-white/50">{p.kills || 0} kills</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setShowRosterModal(false)}
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs uppercase tracking-wider"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📋 MOBILE SLIDE-OVER LEADERBOARD */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md pointer-events-auto"
            onClick={() => setShowLeaderboard(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-neutral-950/90 border border-yellow-500/40 rounded-3xl p-5 shadow-[0_0_40px_rgba(255,170,0,0.25)] flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-yellow-400 font-black tracking-wider text-base">
                  <Trophy size={20} className="text-yellow-400" />
                  SURVIVOR LEADERBOARD
                </div>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 active:bg-white/20"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {gameState && gameState.leaderboard && gameState.leaderboard.length > 0 ? (
                  gameState.leaderboard.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono ${
                        entry.id === playerId
                          ? 'bg-yellow-500/20 border-yellow-400 font-bold'
                          : 'bg-white/5 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate max-w-[70%]">
                        <span className="w-5 text-center font-bold text-white/50">{idx + 1}</span>
                        <span style={{ color: entry.color }} className="font-bold truncate">
                          {entry.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-300 font-black">{entry.score} pts</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-white/40 py-6 font-mono">No survivors ranked yet</p>
                )}
              </div>

              <button
                onClick={() => setShowLeaderboard(false)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs uppercase tracking-wider"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 SMARTPHONE DEPLOY / RESPAWN MODAL */}
      <AnimatePresence>
        {(!player || isDead) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto safe-pt safe-pb"
          >
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              className="w-full max-w-sm bg-neutral-950/95 border border-yellow-500/40 rounded-3xl p-5 shadow-[0_0_50px_rgba(255,170,0,0.3)] flex flex-col items-center gap-4"
            >
              {isDead ? (
                <div className="text-center w-full">
                  <div className="inline-block px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-black tracking-widest uppercase mb-1">
                    Defeated
                  </div>
                  <h2 className="text-3xl font-black text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
                    ELIMINATED
                  </h2>
                  <p className="text-xs font-mono text-yellow-300 mt-1">
                    Final Score: <span className="text-white font-bold text-sm">{Math.floor(player.score)}</span>
                  </p>
                </div>
              ) : (
                <div className="text-center w-full">
                  <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500 drop-shadow">
                    SURVIVAL BATTLEGROUND
                  </h2>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    3D Multiplayer Arena • Reach {TARGET_WIN_SCORE} PTS to Win
                  </p>
                </div>
              )}

              {/* Logged-In User Profile Banner */}
              <div className="w-full bg-cyan-950/40 border border-cyan-500/30 rounded-2xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getAvatarEmoji(userProfile.avatar)}</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-cyan-300 font-bold">
                      👤 Logged In Account
                    </span>
                    <span className="text-xs font-bold text-white font-mono truncate max-w-[140px]">
                      {userProfile.username} (Lv.{userProfile.level})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 rounded-xl text-[9px] font-mono font-bold active:scale-95"
                >
                  Manage / Switch
                </button>
              </div>

              {/* Player Name Input */}
              <div className="w-full flex flex-col gap-1">
                <label className="text-[10px] font-mono font-bold text-yellow-400/80 uppercase tracking-wider ml-1">
                  Survivor Nickname
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter nickname..."
                    maxLength={16}
                    className="flex-1 bg-black/60 border border-yellow-500/40 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleStartGame()}
                  />
                  <button
                    onClick={handleRandomName}
                    title="Random Name"
                    className="w-11 h-11 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-yellow-400 active:scale-95"
                  >
                    <Dices size={20} />
                  </button>
                </div>
              </div>

              {/* Head Avatar Picker */}
              <div className="w-full flex flex-col gap-1.5">
                <label className="text-[10px] font-mono font-bold text-yellow-400/80 uppercase tracking-wider ml-1">
                  Choose Your Champion
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'snake', label: 'Serpent Raja', emoji: '🐍' },
                    { id: 'skull', label: 'Shadow Reaper', emoji: '💀' },
                    { id: 'robot', label: 'Cyber Mech', emoji: '🤖' },
                  ].map((head) => (
                    <button
                      key={head.id}
                      onClick={() => setSelectedHeadType(head.id as any)}
                      className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 ${
                        selectedHeadType === head.id
                          ? 'bg-yellow-500/25 border-yellow-400 shadow-[0_0_15px_rgba(255,170,0,0.4)] text-white'
                          : 'bg-white/5 border-white/10 text-white/60'
                      }`}
                    >
                      <span className="text-2xl mb-0.5">{head.emoji}</span>
                      <span className="text-[9px] font-bold font-mono text-center leading-tight">{head.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Story Power-ups Legend */}
              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-2.5 flex items-center justify-around text-center">
                <div className="flex flex-col items-center">
                  <span className="text-base">❤️</span>
                  <span className="text-[8px] font-mono text-red-400 font-bold mt-0.5">Life Core</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-base">🛡️</span>
                  <span className="text-[8px] font-mono text-cyan-400 font-bold mt-0.5">Shield</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-base">⚔️</span>
                  <span className="text-[8px] font-mono text-purple-400 font-bold mt-0.5">Plasma</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-base">⚡</span>
                  <span className="text-[8px] font-mono text-amber-400 font-bold mt-0.5">Energy</span>
                </div>
              </div>

              {/* Large Deploy Action Button */}
              <button
                onClick={handleStartGame}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 text-black font-black text-base rounded-2xl shadow-[0_0_25px_rgba(255,170,0,0.6)] active:scale-95 transition-transform uppercase tracking-widest flex items-center justify-center gap-2 mt-1"
              >
                <Crosshair size={20} className="text-black" />
                {isDead ? 'PLAY AGAIN' : 'DROP INTO ARENA'}
              </button>

              {/* Footer Credits & Donate Button */}
              <div className="w-full pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                <a
                  href="https://itsrkmahapatra.qzz.io/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/60 hover:text-yellow-400 underline truncate max-w-[190px]"
                >
                  🇮🇳 Made in India by <span className="text-yellow-400 font-bold">Raj Kishor</span>
                </a>
                <button
                  onClick={() => setShowDonate(true)}
                  className="px-2.5 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded-full font-bold text-[10px] active:scale-95 flex items-center gap-1 shrink-0"
                >
                  <QrCode size={11} /> UPI Donate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💳 MOBILE UPI DONATION SHEET */}
      <AnimatePresence>
        {showDonate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md pointer-events-auto"
            onClick={() => setShowDonate(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-neutral-950 border border-yellow-500/40 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col items-center gap-3.5"
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mb-1 sm:hidden" />

              <div className="w-full flex items-center justify-between">
                <h3 className="text-base font-black text-yellow-400 flex items-center gap-1.5">
                  <QrCode size={18} /> DONATE VIA UPI
                </h3>
                <button
                  onClick={() => setShowDonate(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 active:bg-white/20"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-white/70 text-center">
                Keep the game servers live and support new features!
              </p>

              {/* Quick Amount Chips */}
              <div className="grid grid-cols-4 gap-2 w-full">
                {['50', '100', '200', '500'].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setDonateAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-mono font-black border transition-all ${
                      donateAmount === amt
                        ? 'bg-yellow-500 text-black border-yellow-400'
                        : 'bg-white/5 text-white/80 border-white/10'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {/* QR Code */}
              <div className="bg-white p-2 rounded-2xl shadow-xl">
                <img src={qrUrl} alt="UPI QR Code" className="w-44 h-44 block" />
              </div>

              <a
                href={upiString}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl text-center shadow-lg active:scale-95 block"
              >
                Pay ₹{donateAmount || 0} via UPI App
              </a>

              <p className="text-[10px] font-mono text-white/40 text-center">
                GPay • PhonePe • Paytm • BHIM • Any UPI App
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
