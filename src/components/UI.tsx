/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import { useGameStore, mobileInputs } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Shield, Heart, Sparkles, Dices, X, QrCode, Crosshair, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { VirtualJoystick } from './VirtualJoystick';
import { MiniMap } from './MiniMap';

const RANDOM_NAMES = [
  'ViperKing', 'CobraX', 'ShadowFang', 'ApexHydra', 'NeonPython',
  'CyberVenom', 'RajaStriker', 'TitanSerpent', 'CosmoDrake', 'BlitzAnaconda'
];

export function UI() {
  const { gameState, playerId, joinGame, selectedHeadType, setSelectedHeadType } = useGameStore();
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('snake_raja_name') || '');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [donateAmount, setDonateAmount] = useState('100');
  const [isBoostingTouch, setIsBoostingTouch] = useState(false);

  useEffect(() => {
    if (playerName) {
      localStorage.setItem('snake_raja_name', playerName);
    }
  }, [playerName]);

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
    const finalName = playerName.trim() || `Survivor_${Math.floor(Math.random() * 900 + 100)}`;
    joinGame(finalName, selectedHeadType);
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

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between overflow-hidden select-none touch-none">
      
      {/* 🟢 TOP SMARTPHONE HUD */}
      <header className="w-full flex items-start justify-between px-3 pt-3 pb-1 safe-pt safe-pl safe-pr z-40">
        
        {/* Left Stats Pill & Brand */}
        <div className="flex flex-col gap-1.5 pointer-events-auto max-w-[55%]">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-500 drop-shadow-[0_0_10px_rgba(255,170,0,0.5)]">
              SNAKE RAJA
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
              3D MOBILE
            </span>
          </div>

          {isAlive && player && (
            <div className="flex flex-col gap-1 bg-black/60 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-lg">
              {/* Length / Fuel Badge */}
              <div className="flex items-center justify-between gap-2 text-xs font-mono font-black">
                <span className="text-yellow-300 flex items-center gap-1">
                  <Sparkles size={13} className="text-yellow-400" />
                  SCORE
                </span>
                <span className="text-white text-sm font-bold drop-shadow">
                  {Math.floor(player.score)}
                </span>
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
              <div className="w-full h-2.5 bg-black/80 rounded-full border border-blue-500/30 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-cyan-600 via-blue-500 to-indigo-400 transition-all duration-200"
                  style={{ width: `${Math.max(0, Math.min(100, player.armor || 0))}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-white leading-none">
                  ARMOR {Math.floor(player.armor || 0)}
                </div>
              </div>

              {/* Power level */}
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-purple-300">
                <span className="flex items-center gap-1">
                  <Zap size={11} className="text-purple-400" /> PWR
                </span>
                <span className="text-purple-200">+{Math.floor(player.power || 0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Corner: Radar & Leaderboard Toggle */}
        <div className="flex items-start gap-2 pointer-events-auto">
          {isAlive && <MiniMap size={72} />}

          <button
            onClick={() => setShowLeaderboard(true)}
            className="flex flex-col items-center justify-center w-11 h-11 rounded-2xl bg-black/60 backdrop-blur-md border border-yellow-500/30 text-yellow-400 active:scale-95 transition-transform shadow-lg"
          >
            <Trophy size={18} />
            <span className="text-[8px] font-bold font-mono text-white/80">TOP</span>
          </button>
        </div>
      </header>

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
                      <span className="text-yellow-300 font-black">{entry.score} pts</span>
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
                    Smartphone 3D Multiplayer Action
                  </p>
                </div>
              )}

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
                    className="flex-1 bg-black/60 border border-yellow-500/40 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
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
                  className="text-white/50 hover:text-yellow-400 underline truncate max-w-[170px]"
                >
                  By Raj Kishor Mahapatra
                </a>
                <button
                  onClick={() => setShowDonate(true)}
                  className="px-2.5 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded-full font-bold text-[10px] active:scale-95 flex items-center gap-1"
                >
                  <QrCode size={11} /> Support UPI
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

              {/* Mobile Deep Link Button (Opens GPay / PhonePe / Paytm directly) */}
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
