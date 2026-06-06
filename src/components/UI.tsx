/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Trophy } from 'lucide-react';
import { useState } from 'react';

export function UI() {
  const { gameState, playerId, joinGame } = useGameStore();
  const [playerName, setPlayerName] = useState('');
  const [showDonate, setShowDonate] = useState(false);
  const [donateAmount, setDonateAmount] = useState('100');

  const upiString = `upi://pay?pa=Q169118772@ybl&pn=Raj%20Kishor%20Mahapatra&am=${donateAmount || 0}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`;

  const player = playerId && gameState ? gameState.players[playerId] : null;
  const isAlive = player?.state === 'alive';
  const isDead = player?.state === 'dead';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto relative">
        <div className="flex flex-col gap-2 z-10">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 tracking-tighter" style={{ textShadow: '0 0 20px rgba(255, 165, 0, 0.3)' }}>
            SNAKE RAJA
          </h1>
          {isAlive && player && (
            <div className="flex flex-col gap-2 mt-2 w-48 z-20">
              <div className="text-xl font-mono text-yellow-200 font-bold drop-shadow-[0_0_8px_rgba(255,255,0,0.8)]">
                Length/Fuel: {Math.floor(player.score)}
              </div>
              <div className="w-full h-4 bg-black/50 rounded-full border border-white/20 overflow-hidden relative shadow-[0_0_5px_rgba(255,0,0,0.5)]">
                <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, player.health || 0))}%` }} />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">HP: {Math.floor(player.health || 0)}</div>
              </div>
              <div className="w-full h-4 bg-black/50 rounded-full border border-white/20 overflow-hidden relative shadow-[0_0_5px_rgba(0,100,255,0.5)]">
                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, player.armor || 0))}%` }} />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">ARMOR: {Math.floor(player.armor || 0)}</div>
              </div>
              <div className="text-xs font-mono text-purple-300 font-bold drop-shadow-[0_0_5px_rgba(150,0,255,0.8)] mt-1">
                ATTACK PWR: {Math.floor(player.power || 0)}
              </div>
            </div>
          )}
        </div>
        
        {/* Controls Hint */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 flex gap-2 opacity-80 pointer-events-none hidden sm:flex">
          <div className="flex items-center gap-2 text-xs font-mono text-white bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">A</span>
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">D</span>
            <span className="text-white/70 uppercase tracking-wider text-[10px]">Turn</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-white bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
            <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">SPACE</span>
            <span className="text-white/70 uppercase tracking-wider text-[10px]">Boost</span>
          </div>
        </div>

      </div>

      {/* Mobile Controls */}
      {isAlive && (
        <div className="absolute bottom-10 left-4 right-4 flex justify-between pointer-events-auto sm:hidden z-50">
          <div className="flex gap-4">
            <button
              onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); }}
              onPointerUp={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' })); }}
              onPointerCancel={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' })); }}
              onContextMenu={(e) => e.preventDefault()}
              className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white text-2xl font-black backdrop-blur-md active:bg-white/40 shadow-lg border border-white/10"
              style={{ touchAction: 'none' }}
            >
              {'<'}
            </button>
            <button
              onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); }}
              onPointerUp={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' })); }}
              onPointerCancel={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' })); }}
              onContextMenu={(e) => e.preventDefault()}
              className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white text-2xl font-black backdrop-blur-md active:bg-white/40 shadow-lg border border-white/10"
              style={{ touchAction: 'none' }}
            >
              {'>'}
            </button>
          </div>
          <button
            onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); }}
            onPointerUp={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' })); }}
            onPointerCancel={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' })); }}
            onContextMenu={(e) => e.preventDefault()}
            className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white text-xs font-bold backdrop-blur-md active:bg-white/40 shadow-lg border border-white/10"
            style={{ touchAction: 'none' }}
          >
            BOOST
          </button>
        </div>
      )}

      {/* Leaderboard */}
      {gameState && gameState.leaderboard.length > 0 && (
        <div className="absolute top-20 right-4 w-64 bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-yellow-500/30 pointer-events-auto shadow-[0_0_15px_rgba(255,165,0,0.1)]">
          <div className="flex items-center gap-2 mb-4 text-yellow-400 font-bold tracking-widest">
            <Trophy size={18} className="text-yellow-500" />
            <h2>TOP SURVIVORS</h2>
          </div>
          <div className="flex flex-col gap-2">
            {gameState.leaderboard.map((entry, i) => (
              <div key={entry.id} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-white/40 w-4">{i + 1}.</span>
                  <span style={{ color: entry.color }} className="font-medium truncate max-w-[120px]">
                    {entry.name}
                  </span>
                </div>
                <span className="font-mono text-white/80">{entry.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menus */}
      <AnimatePresence>
        {(!player || isDead) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-black/80 p-8 rounded-3xl border border-yellow-500/30 shadow-[0_0_30px_rgba(255,165,0,0.2)] max-w-md w-full flex flex-col items-center gap-6">
              {isDead && (
                <div className="text-center">
                  <h2 className="text-4xl font-black text-red-600 mb-2 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">ELIMINATED</h2>
                  <p className="text-yellow-200">Total Loot: {Math.floor(player.score)}</p>
                </div>
              )}
              
              {!isDead && (
                <div className="text-center w-full">
                  <h2 className="text-3xl font-black text-yellow-400 mb-2 drop-shadow-[0_0_10px_rgba(255,165,0,0.5)]">DEPLOY TO BATTLEGROUND</h2>
                  <p className="text-yellow-100 text-sm mb-6">Fully 3D Graphics. Use Keyboard or Touch to Steer.</p>
                  
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter Survivor Name..."
                    maxLength={16}
                    className="w-full bg-black/50 border-2 border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-500/30 transition-all font-bold tracking-wide"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') joinGame(playerName);
                    }}
                  />
                </div>
              )}
              
              <button
                onClick={() => joinGame(playerName)}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-black rounded-xl hover:from-yellow-400 hover:to-orange-500 transition-colors shadow-[0_0_15px_rgba(255,165,0,0.4)] active:scale-95 tracking-widest mt-2"
              >
                {isDead ? 'PLAY AGAIN' : 'DROP IN'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Donation Modal */}
      <AnimatePresence>
        {showDonate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-auto bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDonate(false);
            }}
          >
            <div className="bg-black/90 p-8 rounded-3xl border border-yellow-500/30 shadow-[0_0_30px_rgba(255,165,0,0.2)] max-w-sm w-full flex flex-col items-center gap-4 relative">
              <button onClick={() => setShowDonate(false)} className="absolute top-4 right-4 text-white/50 hover:text-white text-xl">✕</button>
              <h2 className="text-2xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(255,165,0,0.5)]">DONATE VIA UPI</h2>
              <p className="text-white/70 text-sm text-center">Support the developer to keep servers running!</p>
              
              <div className="w-full flex items-center gap-2 bg-white/10 rounded-xl p-2 border border-white/20">
                <span className="text-white font-bold ml-2">₹</span>
                <input
                  type="number"
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full bg-transparent text-white font-bold text-xl outline-none"
                />
              </div>

              <div className="bg-white p-2 rounded-xl mt-2 shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                <img src={qrUrl} alt="UPI QR Code" className="w-[200px] h-[200px]" />
              </div>
              <p className="text-xs text-white/40 mt-2 font-mono">Scan with GPay, PhonePe, Paytm, etc.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Developer Credits */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto z-50 drop-shadow-md">
        <p className="text-white/60 text-xs font-mono mb-0.5">
          Developed by <a href="https://itsrkmahapatra.qzz.io/" target="_blank" rel="noreferrer" className="text-yellow-500 hover:text-yellow-400 hover:underline font-bold transition-colors">Raj Kishor Mahapatra</a>
        </p>
        <div className="flex gap-4 items-center">
          <p className="text-white/40 text-[10px] font-mono">
            <a href="mailto:dev@itsrkmahapatra.qzz.io" className="hover:text-white/80 transition-colors">dev@itsrkmahapatra.qzz.io</a>
          </p>
          <button onClick={() => setShowDonate(true)} className="text-[10px] font-bold bg-yellow-500 text-black px-2 py-0.5 rounded-full hover:bg-yellow-400 transition-colors shadow-lg">
            Donate UPI
          </button>
        </div>
      </div>
    </div>
  );
}
