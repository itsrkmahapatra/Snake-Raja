/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

export const WORLD_SIZE = 140;
export const BASE_SPEED = 15;
export const BOOST_SPEED = 30;
export const SIMULATION_TICK_RATE = 30; // 30 physics ticks per sec
export const NETWORK_TICK_RATE = 15; // 15 network broadcasts per sec
export const MAX_LOOT = 70;
export const INITIAL_LENGTH = 10;
export const SEGMENT_SPACING = 0.5;
export const TURN_SPEED = Math.PI * 3; // Radians per second
export const TARGET_WIN_SCORE = 250; // Reaching 250 score triggers Victory
export const ROUND_DURATION_SECS = 180; // 3 minute round limit

export const MAX_PLAYERS = 10; // Maximum 10 human players
export const MIN_BOTS = 3; // Random 3 to 4 bots
export const MAX_BOTS = 4;

export function roundCoord(val) {
  return Math.round(val * 10) / 10;
}

export const COLORS = [
  '#00ffff', // cyan star
  '#ff00ff', // magenta nebula
  '#ffaa00', // solar flare
  '#ffffff', // white dwarf
  '#7b2cbf', // deep cosmos
  '#39ff14', // toxic plasma
  '#ff0055', // crimson blaze
  '#00ffaa', // emerald glow
];

export const BOT_NAMES = [
  'ViperKing', 'CobraX', 'ShadowFang', 'ApexHydra', 'NeonPython',
  'CyberVenom', 'RajaStriker', 'TitanSerpent', 'CosmoDrake', 'BlitzAnaconda'
];

export const EMOJI_HEADS = {
  snake: { emoji: '🐍', glow: '#ffaa00', label: 'Serpent Raja' },
  skull: { emoji: '💀', glow: '#ff0055', label: 'Shadow Reaper' },
  robot: { emoji: '🤖', glow: '#00f0ff', label: 'Cyber Mech' },
};

export const EMOJI_LOOT = {
  food: { emoji: '⚡', glow: '#ffea00', label: 'Energy' },
  medkit: { emoji: '❤️', glow: '#ff2255', label: 'Life Core' },
  armor: { emoji: '🛡️', glow: '#00f0ff', label: 'Shield' },
  weapon: { emoji: '⚔️', glow: '#a855f7', label: 'Plasma Blade' },
  ammo: { emoji: '💎', glow: '#39ff14', label: 'Mega Crystal' },
};

export const INITIAL_CHALLENGES = [
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
    description: 'Reach Rank #1 position on the live leaderboard',
    icon: '👑',
    type: 'rank1',
    target: 1,
    progress: 0,
    rewardXP: 300,
    completed: false,
  },
  {
    id: 'ch_daredevil',
    title: 'Daredevil',
    description: 'Survive in close proximity to an enemy snake',
    icon: '🔥',
    type: 'daredevil',
    target: 3,
    progress: 0,
    rewardXP: 160,
    completed: false,
  },
  {
    id: 'ch_titan_slayer',
    title: 'Titan Slayer',
    description: 'Damage or defeat the Golden Raja Titan Boss',
    icon: '🏆',
    type: 'titan_boss',
    target: 1,
    progress: 0,
    rewardXP: 350,
    completed: false,
  },
];
