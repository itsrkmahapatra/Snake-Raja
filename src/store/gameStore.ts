/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { GameState, Challenge, KillEvent } from '../shared/types';
import {
  UserProfile,
  loadActiveProfile,
  saveActiveProfile,
  loadAllSavedProfiles,
  loginUserProfile,
  saveAllProfiles,
} from '../shared/userProfile';

const INITIAL_CHALLENGES: Challenge[] = [
  {
    id: 'ch_first_blood',
    title: 'First Blood',
    description: 'Eliminate 1 enemy survivor in arena combat',
    icon: '⚔️',
    type: 'kills',
    target: 1,
    progress: 0,
    rewardXP: 120,
    completed: false,
  },
  {
    id: 'ch_loot_raider',
    title: 'Resource Raider',
    description: 'Collect 25 power-ups or plasma orbs',
    icon: '💎',
    type: 'loot',
    target: 25,
    progress: 0,
    rewardXP: 150,
    completed: false,
  },
  {
    id: 'ch_speed_demon',
    title: 'Turbo Master',
    description: 'Use turbo boost for 12 seconds in total',
    icon: '⚡',
    type: 'boost',
    target: 12,
    progress: 0,
    rewardXP: 100,
    completed: false,
  },
  {
    id: 'ch_titan_growth',
    title: 'Titan Evolution',
    description: 'Grow to 80+ Score in a single round',
    icon: '🐉',
    type: 'score',
    target: 80,
    progress: 0,
    rewardXP: 200,
    completed: false,
  },
  {
    id: 'ch_shield_wall',
    title: 'Iron Fortress',
    description: 'Collect 4 Shield / Armor upgrades',
    icon: '🛡️',
    type: 'shields',
    target: 4,
    progress: 0,
    rewardXP: 140,
    completed: false,
  },
  {
    id: 'ch_raja_monarch',
    title: 'Raja Apex',
    description: 'Hold the #1 Top Rank on the live leaderboard',
    icon: '👑',
    type: 'rank1',
    target: 1,
    progress: 0,
    rewardXP: 250,
    completed: false,
  },
  {
    id: 'ch_daredevil',
    title: 'Daredevil',
    description: 'Slither close to 3 hostile snakes and survive',
    icon: '🔥',
    type: 'daredevil',
    target: 3,
    progress: 0,
    rewardXP: 180,
    completed: false,
  },
  {
    id: 'ch_boss_slayer',
    title: 'Titan Slayer',
    description: 'Engage or eliminate a Golden Titan Boss',
    icon: '🗡️',
    type: 'titan_boss',
    target: 1,
    progress: 0,
    rewardXP: 300,
    completed: false,
  },
];

function loadSavedChallenges(): Challenge[] {
  try {
    const saved = localStorage.getItem('snake_raja_challenges');
    if (saved) {
      const parsed: Challenge[] = JSON.parse(saved);
      return INITIAL_CHALLENGES.map((def) => {
        const found = parsed.find((p) => p.id === def.id);
        return found ? { ...def, ...found } : def;
      });
    }
  } catch (e) {
    console.error('Failed to load challenges', e);
  }
  return INITIAL_CHALLENGES;
}

const initialProfile = loadActiveProfile();

interface GameStore {
  socket: Socket | null;
  gameState: GameState | null;
  playerId: string | null;
  userProfile: UserProfile;
  savedProfiles: UserProfile[];
  selectedHeadType: 'skull' | 'robot' | 'snake';
  challenges: Challenge[];
  playerXP: number;
  playerLevel: number;
  recentKills: KillEvent[];
  recentCompletedChallenge: Challenge | null;
  showVictoryModal: boolean;
  matchWinner: any | null;
  loginUser: (username: string, avatar: 'skull' | 'robot' | 'snake') => void;
  switchProfile: (profileId: string) => void;
  updateUserProfile: (updater: Partial<UserProfile>) => void;
  recordMatchStats: (score: number, kills: number, won: boolean) => void;
  setSelectedHeadType: (head: 'skull' | 'robot' | 'snake') => void;
  connect: () => void;
  joinGame: (name?: string, headType?: string) => void;
  sendPlayerState: (data: any) => void;
  sendCollectLoot: (lootId: string) => void;
  sendPlayerKill: (victimId: string) => void;
  updateChallengeProgress: (type: Challenge['type'], amount: number) => void;
  claimChallengeReward: (challengeId: string) => void;
  dismissCompletedChallenge: () => void;
}

export const globalGameState: { current: GameState | null } = { current: null };

export const mobileInputs = {
  active: false,
  targetAngle: 0,
  isBoosting: false,
  turnLeft: false,
  turnRight: false,
};

let lastUiUpdate = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  gameState: null,
  playerId: null,
  userProfile: initialProfile,
  savedProfiles: loadAllSavedProfiles(),
  selectedHeadType: initialProfile.avatar || 'snake',
  challenges: loadSavedChallenges(),
  playerXP: initialProfile.xp || 0,
  playerLevel: initialProfile.level || 1,
  recentKills: [],
  recentCompletedChallenge: null,
  showVictoryModal: false,
  matchWinner: null,

  loginUser: (username, avatar) => {
    const profile = loginUserProfile(username, avatar);
    set({
      userProfile: profile,
      selectedHeadType: profile.avatar,
      playerXP: profile.xp,
      playerLevel: profile.level,
      savedProfiles: loadAllSavedProfiles(),
    });
  },

  switchProfile: (profileId) => {
    const all = loadAllSavedProfiles();
    const target = all.find((p) => p.id === profileId);
    if (target) {
      saveActiveProfile(target);
      set({
        userProfile: target,
        selectedHeadType: target.avatar,
        playerXP: target.xp,
        playerLevel: target.level,
        savedProfiles: all,
      });
    }
  },

  updateUserProfile: (updater) => {
    const current = get().userProfile;
    const updated: UserProfile = { ...current, ...updater };
    saveActiveProfile(updated);
    set({ userProfile: updated });
  },

  recordMatchStats: (score, kills, won) => {
    const current = get().userProfile;
    const updated: UserProfile = {
      ...current,
      matchesPlayed: (current.matchesPlayed || 0) + 1,
      wins: won ? (current.wins || 0) + 1 : (current.wins || 0),
      highestScore: Math.max(current.highestScore || 0, Math.floor(score)),
      totalKills: (current.totalKills || 0) + (kills || 0),
    };
    saveActiveProfile(updated);
    set({
      userProfile: updated,
      savedProfiles: loadAllSavedProfiles(),
    });
  },

  setSelectedHeadType: (head) => {
    get().updateUserProfile({ avatar: head });
    set({ selectedHeadType: head });
  },

  connect: () => {
    if (get().socket) return;

    const WS_URL = import.meta.env.VITE_WS_URL || undefined;
    const socket = io(WS_URL);

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('init', (id: string) => {
      set({ playerId: id });
    });

    socket.on('state', (state: GameState) => {
      globalGameState.current = state;
      const now = Date.now();

      // Check if local player is rank #1
      const myId = get().playerId;
      if (myId && state.leaderboard && state.leaderboard.length > 0 && state.leaderboard[0].id === myId) {
        get().updateChallengeProgress('rank1', 1);
      }

      if (now - lastUiUpdate > 80) { // Throttle React updates to ~12Hz
        set({ gameState: state });
        lastUiUpdate = now;
      }
    });

    socket.on('kill_event', (event: KillEvent) => {
      set((prev) => ({
        recentKills: [event, ...prev.recentKills.slice(0, 4)],
      }));

      // If local player was killer
      const myId = get().playerId;
      if (myId && event.killerId === myId) {
        get().updateChallengeProgress('kills', 1);
        const up = get().userProfile;
        get().updateUserProfile({ totalKills: (up.totalKills || 0) + 1 });
      }
    });

    socket.on('match_won', (winner: any) => {
      set({
        matchWinner: winner,
        showVictoryModal: true,
      });

      const myId = get().playerId;
      if (myId && winner && winner.id === myId) {
        get().recordMatchStats(winner.score, winner.kills, true);
      }
    });

    socket.on('round_restart', () => {
      set({
        showVictoryModal: false,
        matchWinner: null,
      });
    });

    set({ socket });
  },

  joinGame: (name?: string, headType?: string) => {
    const { socket, userProfile, selectedHeadType } = get();
    const finalName = name || userProfile.username;
    const finalHead = (headType || selectedHeadType || userProfile.avatar || 'snake') as 'skull' | 'robot' | 'snake';

    // Auto-update profile
    get().loginUser(finalName, finalHead);

    if (socket) {
      socket.emit('join', {
        name: finalName,
        headType: finalHead,
      });
      set({ showVictoryModal: false });
    }
  },

  sendPlayerState: (data) => {
    const { socket } = get();
    if (socket) {
      socket.emit('update_state', data);
    }
    if (data.state === 'dead') {
      get().recordMatchStats(data.score || 0, 0, false);
    }
  },

  sendCollectLoot: (lootId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('collect_loot', lootId);
    }
  },

  sendPlayerKill: (victimId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('player_kill', { victimId });
    }
  },

  updateChallengeProgress: (type, amount) => {
    const currentChallenges = get().challenges;
    let newlyCompleted: Challenge | null = null;

    const updated = currentChallenges.map((ch) => {
      if (ch.type === type && !ch.completed) {
        const newProgress = Math.min(ch.target, ch.progress + amount);
        const isDone = newProgress >= ch.target;
        if (isDone && !ch.completed) {
          newlyCompleted = { ...ch, progress: newProgress, completed: true };
          return newlyCompleted;
        }
        return { ...ch, progress: newProgress };
      }
      return ch;
    });

    localStorage.setItem('snake_raja_challenges', JSON.stringify(updated));
    set({ challenges: updated });

    if (newlyCompleted) {
      set({ recentCompletedChallenge: newlyCompleted });
      if ('vibrate' in navigator) {
        try { navigator.vibrate([40, 60, 40]); } catch { /* ignore */ }
      }
    }
  },

  claimChallengeReward: (challengeId) => {
    const { challenges, playerXP, userProfile } = get();
    const targetCh = challenges.find((c) => c.id === challengeId);
    if (!targetCh || !targetCh.completed || targetCh.claimed) return;

    const newXP = (userProfile.xp || 0) + targetCh.rewardXP;
    const newLevel = Math.floor(newXP / 300) + 1;

    const updated = challenges.map((c) => (c.id === challengeId ? { ...c, claimed: true } : c));

    localStorage.setItem('snake_raja_challenges', JSON.stringify(updated));

    get().updateUserProfile({
      xp: newXP,
      level: newLevel,
    });

    set({
      challenges: updated,
      playerXP: newXP,
      playerLevel: newLevel,
    });
  },

  dismissCompletedChallenge: () => {
    set({ recentCompletedChallenge: null });
  },
}));
