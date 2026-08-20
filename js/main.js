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
import { INITIAL_CHALLENGES, WORLD_SIZE, TARGET_WIN_SCORE } from './constants.js';

class GameApp {
  constructor() {
    this.socket = null;
    this.playerId = null;
    this.gameState = null;
    this.isOfflineMode = false;

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
      onJoin: (name, headType) => this.joinGame(name, headType),
      onLogin: (name, headType) => this.loginUser(name, headType),
      onSwitchProfile: (id) => this.switchProfile(id),
      onClaimChallenge: (id) => this.claimChallengeReward(id),
    });

    this.ui.updateProfileData(this.userProfile, this.savedProfiles, this.challenges);

    // Connect to Multiplayer Server with graceful cold-start handling
    this.connect();
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

  setServerStatus(status, text) {
    const badge = document.getElementById('serverStatusBadge');
    if (!badge) return;
    if (status === 'connected') {
      badge.innerHTML = '🟢 <span style="color: #4ade80;">Online</span>';
      badge.style.borderColor = 'rgba(74, 222, 128, 0.4)';
    } else if (status === 'connecting') {
      badge.innerHTML = '🟡 <span style="color: #facc15;">Waking Server...</span>';
      badge.style.borderColor = 'rgba(250, 204, 21, 0.4)';
    } else {
      badge.innerHTML = '🔵 <span style="color: #60a5fa;">Solo Mode</span>';
      badge.style.borderColor = 'rgba(96, 165, 250, 0.4)';
    }
  }

  connect() {
    this.setServerStatus('connecting');

    const wsUrl = window.location.origin;
    try {
      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnectionAttempts: 15,
        reconnectionDelay: 2000,
      });

      this.socket.on('connect', () => {
        this.isOfflineMode = false;
        this.setServerStatus('connected');
        console.log('Connected to Snake Raja Arena Server');
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
        this.setServerStatus('connecting');
      });

      this.socket.on('connect_error', () => {
        // If server is cold sleeping, fallback to local standalone mode so user can play immediately!
        this.setServerStatus('solo');
      });
    } catch {
      this.setServerStatus('solo');
    }
  }

  joinGame(name, headType) {
    this.userProfile = loginUserProfile(name, headType);
    this.savedProfiles = loadAllSavedProfiles();
    this.ui.updateProfileData(this.userProfile, this.savedProfiles, this.challenges);

    if (this.socket && this.socket.connected) {
      this.socket.emit('join', { name, headType });
    } else {
      // Offline / Local Arena Spawn
      this.startLocalOfflineArena(name, headType);
    }
  }

  startLocalOfflineArena(name, headType) {
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

    // Spawn offline loot
    const types = ['food', 'medkit', 'armor', 'weapon', 'ammo'];
    for (let i = 0; i < 50; i++) {
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
    }
  }

  sendCollectLoot(lootId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('collect_loot', lootId);
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

// Start Game App when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.snakeRajaApp = new GameApp();
});
