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
import { INITIAL_CHALLENGES } from './constants.js';

class GameApp {
  constructor() {
    this.socket = null;
    this.playerId = null;
    this.gameState = null;

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

    // Connect to WebSocket Multiplayer Server
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

  connect() {
    // If running in browser with socket.io available
    const wsUrl = window.location.origin;
    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to Snake Raja Arena Server');
    });

    this.socket.on('init', (id) => {
      this.playerId = id;
    });

    this.socket.on('state', (state) => {
      this.gameState = state;
      this.gameScene.setGameState(state, this.playerId);

      const now = Date.now();
      // Throttle UI HUD updates to 10Hz
      if (now - this.lastUiUpdate > 100) {
        this.lastUiUpdate = now;
        this.ui.updateHUD(state, this.playerId);

        // Check if rank 1 for challenge
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
  }

  joinGame(name, headType) {
    this.userProfile = loginUserProfile(name, headType);
    this.savedProfiles = loadAllSavedProfiles();
    this.ui.updateProfileData(this.userProfile, this.savedProfiles, this.challenges);

    if (this.socket) {
      this.socket.emit('join', { name, headType });
    }
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
    if (this.socket && this.playerId) {
      this.socket.emit('update_state', stateData);
    }
  }

  sendCollectLoot(lootId) {
    if (this.socket) {
      this.socket.emit('collect_loot', lootId);
    }
  }

  sendPlayerKill(victimId) {
    if (this.socket) {
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
