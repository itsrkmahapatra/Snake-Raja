/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

export type GameState = {
  players: Record<string, Player>;
  loot: Record<string, Loot>;
  leaderboard: LeaderboardEntry[];
  match: MatchState;
  currentEvent: ArenaEvent | null;
  killFeed: KillEvent[];
};

export type MatchState = {
  status: 'playing' | 'ended';
  targetScore: number;
  winner: {
    id: string;
    name: string;
    color: string;
    score: number;
    kills: number;
    headType: string;
  } | null;
  roundNumber: number;
  roundTimeRemaining: number;
  nextRoundCountdown: number;
};

export type ArenaEvent = {
  id: string;
  type: 'frenzy' | 'bounty' | 'titan' | 'storm';
  title: string;
  description: string;
  icon: string;
  duration: number;
  timeRemaining: number;
  bountyPlayerId?: string;
  bountyPlayerName?: string;
};

export type KillEvent = {
  id: string;
  killerId: string;
  killerName: string;
  killerColor: string;
  victimId: string;
  victimName: string;
  victimColor: string;
  timestamp: number;
};

export type Challenge = {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'kills' | 'loot' | 'boost' | 'score' | 'shields' | 'rank1' | 'daredevil' | 'titan_boss';
  target: number;
  progress: number;
  rewardXP: number;
  completed: boolean;
  claimed?: boolean;
};

export type PlayerState = 'alive' | 'dead' | 'spectating';

export type Player = {
  id: string;
  name: string;
  color: string;
  segments: { x: number; y: number }[];
  score: number;
  isBoosting: boolean;
  state: PlayerState;
  currentAngle: number;
  inputs: { left: boolean; right: boolean; boost: boolean };
  headType: string;
  health: number;
  armor: number;
  power: number;
  kills: number;
  isBot?: boolean;
  isTitanBoss?: boolean;
  isBountyTarget?: boolean;
};

export type Loot = {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
  type: string;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  color: string;
  kills: number;
  headType?: string;
};

export const WORLD_SIZE = 140;
export const BASE_SPEED = 15;
export const BOOST_SPEED = 30;
export const SIMULATION_TICK_RATE = 30; // 30 physics ticks per sec
export const NETWORK_TICK_RATE = 15; // 15 network broadcasts per sec
export const MAX_LOOT = 70; // Optimized loot count to save bandwidth
export const INITIAL_LENGTH = 10;
export const SEGMENT_SPACING = 0.5;
export const TURN_SPEED = Math.PI * 3; // Radians per second
export const TARGET_WIN_SCORE = 250; // Reaching 250 score triggers Victory
export const ROUND_DURATION_SECS = 180; // 3 minute round limit

export const MAX_PLAYERS = 10; // Maximum 10 human players
export const MIN_BOTS = 3; // Random 3 to 4 bots
export const MAX_BOTS = 4;

export function roundCoord(val: number): number {
  return Math.round(val * 10) / 10;
}
