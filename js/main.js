/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import { io } from 'socket.io-client';
import { GameScene } from './gameScene.js';
import { UIManager } from './ui.js';
import {
  loadActiveProfile,
  saveActiveProfile,
  loadAllSavedProfiles,
  loginUserProfile,
} from './userProfile.js';
import {
  INITIAL_CHALLENGES,
  WORLD_SIZE,
  TARGET_WIN_SCORE,
  BOT_NAMES,
  COLORS,
  roundCoord,
} from './constants.js';

class GameApp {
  constructor() {
    this.socket = null;
    this.playerId = null;
    this.gameState = null;
    this.isOfflineMode = false;
    this.offlineInterval = null;

    this.userProfile = loadActiveProfile();
    this.savedProfiles = loadAllSavedProfiles();
    this.challenges = this.loadSavedChallenges();

    this.lastUiUpdate = 0;

    // Initialize 3D Engine
    const canvasContainer = document.getElementById('canvasContainer');
    this.gameScene = new GameScene(
      canvasContainer,
      (stateData) => this.sendPlayerState(stateData),
      (lootId) => this.sendCollectLoot(lootId),
      (victimId) => this.sendPlayerKill(victimId),
      (type, amount) => this.updateChallengeProgress(type, amount)
    );

    // Initialize UI Manager
    this.ui = new UIManager(this.gameScene, {
      onJoin: (name, headType, mode, lanIp) => this.joinGame(name, headType, mode, lanIp),
      onLogin: (name, headType) => this.loginUser(name, headType),
      onSwitchProfile: (id) => this.switchProfile(id),
      onClaimChallenge: (id) => this.claimChallengeReward(id),
    });

    this.ui.updateProfileData(this.userProfile, this.savedProfiles, this.challenges);
    this.setServerStatus('ready');

    // Clean disconnect on tab visibility loss to prevent background bandwidth waste
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.socket && this.socket.connected) {
        this.disconnectSocket();
      }
    });
  }

  loadSavedChallenges() {
    try {
      const raw = localStorage.getItem('snake_raja_challenges');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return JSON.parse(JSON.stringify(INITIAL_CHALLENGES));
  }

  saveChallenges() {
    try {
      localStorage.setItem('snake_raja_challenges', JSON.stringify(this.challenges));
    } catch {
      // ignore
    }
  }

  setServerStatus(status, customText) {
    const badge = document.getElementById('serverStatusBadge');
    if (!badge) return;
    if (status === 'connected') {
      badge.innerHTML = `🟢 <span style="color: #4ade80;">${customText || 'Online Live'}</span>`;
      badge.style.borderColor = 'rgba(74, 222, 128, 0.4)';
    } else if (status === 'lan') {
      badge.innerHTML = `📡 <span style="color: #c084fc;">${customText || 'Local LAN'}</span>`;
      badge.style.borderColor = 'rgba(192, 132, 252, 0.4)';
    } else if (status === 'connecting') {
      badge.innerHTML = '🟡 <span style="color: #facc15;">Connecting...</span>';
      badge.style.borderColor = 'rgba(250, 204, 21, 0.4)';
    } else if (status === 'offline') {
      badge.innerHTML = '⚡ <span style="color: #ffd700;">Offline Solo</span>';
      badge.style.borderColor = 'rgba(255, 215, 0, 0.4)';
    } else {
      badge.innerHTML = '⚡ <span style="color: #ffd700;">Ready to Play</span>';
      badge.style.borderColor = 'rgba(255, 215, 0, 0.4)';
    }
  }

  connectSocket(targetUrl, statusMode, onConnected) {
    this.disconnectSocket();
    this.setServerStatus('connecting');

    try {
      this.socket = io(targetUrl, {
        transports: ['websocket', 'polling'],
        timeout: 6000,
        reconnectionAttempts: 2,
        reconnectionDelay: 1500,
      });

      this.socket.on('connect', () => {
        this.isOfflineMode = false;
        this.setServerStatus(statusMode === 'lan' ? 'lan' : 'connected', statusMode === 'lan' ? 'LAN Connected' : 'Online Live');
        console.log(`Connected to Snake Raja (${statusMode}) at ${targetUrl}`);
        onConnected?.();
      });

      this.socket.on('init', (id) => {
        this.playerId = id;
      });

      this.socket.on('state', (state) => {
        this.gameState = state;
        this.gameScene.setGameState(state, this.playerId);

        const now = Date.now();
        if (now - this.lastUiUpdate > 100) {
          this.lastUiUpdate = now;
          this.ui.updateHUD(state, this.playerId);

          if (this.playerId && state.leaderboard?.[0]?.id === this.playerId) {
            this.updateChallengeProgress('rank1', 1);
          }
        }
      });

      this.socket.on('kill_event', (event) => {
        this.ui.addMicroKill(event);
        if (this.playerId && event.killerId === this.playerId) {
          this.updateChallengeProgress('kills', 1);
          this.userProfile.totalKills = (this.userProfile.totalKills || 0) + 1;
          saveActiveProfile(this.userProfile);
          this.ui.updateProfileData(this.userProfile, this.savedProfiles, this.challenges);
        }
      });

      this.socket.on('match_won', (winner) => {
        const isWinner = this.playerId === winner.id;
        this.userProfile.matchesPlayed = (this.userProfile.matchesPlayed || 0) + 1;
        if (isWinner) {
          this.userProfile.wins = (this.userProfile.wins || 0) + 1;
        }
        this.userProfile.highestScore = Math.max(this.userProfile.highestScore || 0, winner.score || 0);
        saveActiveProfile(this.userProfile);
        this.ui.updateProfileData(this.userProfile, this.savedProfiles, this.challenges);

        this.ui.showVictoryModal(winner, 5);
      });

      this.socket.on('round_restart', () => {
        this.ui.hideModal('victoryModal');
      });

      this.socket.on('disconnect', () => {
        this.setServerStatus('ready');
      });

      this.socket.on('connect_error', (err) => {
        console.warn(`Connection failed to ${targetUrl}:`, err.message);
        this.setServerStatus('offline');
        this.startLocalOfflineArena(this.userProfile.username, this.userProfile.avatar);
      });
    } catch {
      this.setServerStatus('offline');
      this.startLocalOfflineArena(this.userProfile.username, this.userProfile.avatar);
    }
  }

  disconnectSocket() {
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch {
        // ignore
      }
      this.socket = null;
      this.setServerStatus('ready');
    }
  }

  joinGame(name, headType, mode = 'online', lanIp = '') {
    this.userProfile = loginUserProfile(name, headType);
    this.savedProfiles = loadAllSavedProfiles();
    this.ui.updateProfileData(this.userProfile, this.savedProfiles, this.challenges);

    if (this.offlineInterval) {
      clearInterval(this.offlineInterval);
      this.offlineInterval = null;
    }

    // 1. Model 3: Offline Solo Arena (Zero Network Traffic)
    if (mode === 'offline') {
      this.disconnectSocket();
      this.setServerStatus('offline');
      this.startLocalOfflineArena(name, headType);
      return;
    }

    // 2. Model 2: Local Network LAN (Wi-Fi / Hotspot Server)
    if (mode === 'lan') {
      let targetLan = lanIp ? lanIp.trim() : window.location.origin;
      if (!targetLan.startsWith('http://') && !targetLan.startsWith('https://')) {
        targetLan = `http://${targetLan}`;
      }
      // If user typed IP or localhost without port, auto-append :3000
      if (!targetLan.slice(8).includes(':')) {
        targetLan = `${targetLan}:3000`;
      }
      this.connectSocket(targetLan, 'lan', () => {
        if (this.socket && this.socket.connected) {
          this.socket.emit('join', { name, headType });
        }
      });
      return;
    }

    // 3. Model 1: Online Cloud Multiplayer
    const onlineUrl = window.location.origin.includes('github.io')
      ? 'https://snake-raja.onrender.com'
      : window.location.origin;

    this.connectSocket(onlineUrl, 'online', () => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('join', { name, headType });
      }
    });
  }

  startLocalOfflineArena(name, headType) {
    this.isOfflineMode = true;
    const localId = `local_${Date.now().toString(36)}`;
    this.playerId = localId;

    const startX = (Math.random() - 0.5) * (WORLD_SIZE - 30);
    const startY = (Math.random() - 0.5) * (WORLD_SIZE - 30);
    const angle = Math.random() * Math.PI * 2;

    const segments = [];
    for (let i = 0; i < 10; i++) {
      segments.push({
        x: startX - Math.cos(angle) * i * 0.5,
        y: startY - Math.sin(angle) * i * 0.5,
      });
    }

    const localState = {
      players: {
        [localId]: {
          id: localId,
          name,
          color: '#ffaa00',
          segments,
          score: 10,
          isBoosting: false,
          state: 'alive',
          currentAngle: angle,
          inputs: { left: false, right: false, boost: false },
          headType,
          health: 100,
          armor: 50,
          power: 20,
          kills: 0,
        },
      },
      loot: {},
      leaderboard: [
        { id: localId, name, score: 10, color: '#ffaa00', kills: 0, headType },
      ],
      match: {
        status: 'playing',
        targetScore: TARGET_WIN_SCORE,
        winner: null,
        roundNumber: 1,
        roundTimeRemaining: 180,
        nextRoundCountdown: 0,
      },
      currentEvent: null,
      killFeed: [],
    };

    // Spawn 3 AI bots for offline action
    const botHeads = ['snake', 'skull', 'robot'];
    for (let b = 0; b < 3; b++) {
      const bId = `bot_local_${b}`;
      const bName = BOT_NAMES[b % BOT_NAMES.length];
      const bColor = COLORS[b % COLORS.length];
      const bx = (Math.random() - 0.5) * (WORLD_SIZE - 30);
      const by = (Math.random() - 0.5) * (WORLD_SIZE - 30);
      const bAngle = Math.random() * Math.PI * 2;
      const bSegs = [];
      for (let s = 0; s < 12; s++) {
        bSegs.push({
          x: bx - Math.cos(bAngle) * s * 0.5,
          y: by - Math.sin(bAngle) * s * 0.5,
        });
      }
      localState.players[bId] = {
        id: bId,
        name: bName,
        color: bColor,
        segments: bSegs,
        score: 12,
        isBoosting: false,
        state: 'alive',
        currentAngle: bAngle,
        inputs: { left: false, right: false, boost: false },
        headType: botHeads[b % botHeads.length],
        health: 100,
        armor: 40,
        power: 15,
        kills: 0,
        isBot: true,
      };
    }

    // Spawn offline loot
    const types = ['food', 'medkit', 'armor', 'weapon', 'ammo'];
    for (let i = 0; i < 60; i++) {
      const id = `l_${i}`;
      localState.loot[id] = {
        id,
        x: (Math.random() - 0.5) * (WORLD_SIZE - 10),
        y: (Math.random() - 0.5) * (WORLD_SIZE - 10),
        value: 1,
        color: '#ffea00',
        type: types[i % types.length],
      };
    }

    this.gameState = localState;
    this.gameScene.setGameState(localState, localId);
    this.ui.updateHUD(localState, localId);

    // Simple offline local bot loop (10Hz)
    this.offlineInterval = setInterval(() => {
      if (!this.gameState || !this.isOfflineMode) return;

      for (const id in this.gameState.players) {
        const p = this.gameState.players[id];
        if (p.isBot && p.state === 'alive' && p.segments.length > 0) {
          p.currentAngle += (Math.random() - 0.5) * 0.2;
          const head = p.segments[0];
          const nx = head.x + Math.cos(p.currentAngle) * 0.5;
          const ny = head.y + Math.sin(p.currentAngle) * 0.5;
          p.segments.unshift({ x: nx, y: ny });
          if (p.segments.length > p.score) p.segments.pop();
        }
      }

      this.ui.updateHUD(this.gameState, this.playerId);
    }, 100);
  }

  loginUser(name, headType) {
    this.userProfile = loginUserProfile(name, headType);
    this.savedProfiles = loadAllSavedProfiles();
    this.ui.updateProfileData(this.userProfile, this.savedProfiles, this.challenges);
  }

  switchProfile(profileId) {
    const target = this.savedProfiles.find((p) => p.id === profileId);
    if (target) {
      this.userProfile = target;
      saveActiveProfile(target);
      this.savedProfiles = loadAllSavedProfiles();
      this.ui.updateProfileData(this.userProfile, this.savedProfiles, this.challenges);
    }
  }

  sendPlayerState(stateData) {
    if (this.socket && this.socket.connected && this.playerId) {
      this.socket.emit('update_state', stateData);
    } else if (this.isOfflineMode && this.gameState && this.playerId) {
      const p = this.gameState.players[this.playerId];
      if (p) {
        p.segments = stateData.segments;
        p.score = stateData.score;
        p.currentAngle = stateData.currentAngle;
        p.isBoosting = stateData.isBoosting;
        p.health = stateData.health;
        p.armor = stateData.armor;
        p.power = stateData.power;
      }
    }
  }

  sendCollectLoot(lootId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('collect_loot', lootId);
    } else if (this.isOfflineMode && this.gameState && this.gameState.loot) {
      delete this.gameState.loot[lootId];
    }
  }

  sendPlayerKill(victimId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('player_kill', { victimId });
    }
  }

  updateChallengeProgress(type, amount = 1) {
    let updated = false;
    this.challenges.forEach((ch) => {
      if (ch.type === type && !ch.completed) {
        ch.progress = Math.min(ch.target, ch.progress + amount);
        if (ch.progress >= ch.target) {
          ch.completed = true;
        }
        updated = true;
      }
    });

    if (updated) {
      this.saveChallenges();
      this.ui.updateProfileData(this.userProfile, this.savedProfiles, this.challenges);
    }
  }

  claimChallengeReward(challengeId) {
    const ch = this.challenges.find((c) => c.id === challengeId);
    if (ch && ch.completed && !ch.claimed) {
      ch.claimed = true;
      this.userProfile.xp = (this.userProfile.xp || 0) + ch.rewardXP;
      this.userProfile.level = 1 + Math.floor(this.userProfile.xp / 300);
      saveActiveProfile(this.userProfile);
      this.saveChallenges();
      this.ui.updateProfileData(this.userProfile, this.savedProfiles, this.challenges);
    }
  }
}

// Start Game App on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  window.snakeRajaApp = new GameApp();
});
