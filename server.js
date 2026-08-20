/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
  perMessageDeflate: {
    threshold: 1024,
  },
});

const PORT = process.env.PORT || 3000;

// Constants
const WORLD_SIZE = 140;
const BASE_SPEED = 15;
const BOOST_SPEED = 30;
const SIMULATION_TICK_RATE = 30;
const NETWORK_TICK_RATE = 15;
const MAX_LOOT = 70;
const INITIAL_LENGTH = 10;
const SEGMENT_SPACING = 0.5;
const TURN_SPEED = Math.PI * 3;
const TARGET_WIN_SCORE = 250;
const ROUND_DURATION_SECS = 180;

const MAX_PLAYERS = 10;
const MIN_BOTS = 3;
const MAX_BOTS = 4;

function roundCoord(val) {
  return Math.round(val * 10) / 10;
}

const COLORS = [
  '#00ffff', // cyan star
  '#ff00ff', // magenta nebula
  '#ffaa00', // solar flare
  '#ffffff', // white dwarf
  '#7b2cbf', // deep cosmos
  '#39ff14', // toxic plasma
  '#ff0055', // crimson blaze
  '#00ffaa', // emerald glow
];

const BOT_NAMES = [
  'ViperKing', 'CobraX', 'ShadowFang', 'ApexHydra', 'NeonPython',
  'CyberVenom', 'RajaStriker', 'TitanSerpent', 'CosmoDrake', 'BlitzAnaconda'
];

const state = {
  players: {},
  loot: {},
  leaderboard: [],
  match: {
    status: 'playing',
    targetScore: TARGET_WIN_SCORE,
    winner: null,
    roundNumber: 1,
    roundTimeRemaining: ROUND_DURATION_SECS,
    nextRoundCountdown: 0,
  },
  currentEvent: null,
  killFeed: [],
};

let lootCounter = 1;

function spawnLoot(x, y, value = 1, color, force = false, specificType) {
  if (!force && Object.keys(state.loot).length >= MAX_LOOT) return;
  const id = `l_${lootCounter++}`;
  if (lootCounter > 99999) lootCounter = 1;

  const types = ['medkit', 'ammo', 'armor', 'weapon'];
  const type = specificType || types[Math.floor(Math.random() * types.length)];
  const rawX = x !== undefined ? x : (Math.random() - 0.5) * (WORLD_SIZE - 10);
  const rawY = y !== undefined ? y : (Math.random() - 0.5) * (WORLD_SIZE - 10);

  state.loot[id] = {
    id,
    x: roundCoord(rawX),
    y: roundCoord(rawY),
    value,
    color: color || COLORS[Math.floor(Math.random() * COLORS.length)],
    type,
  };
}

// Initial compact loot pool (60 items)
for (let i = 0; i < 60; i++) {
  spawnLoot();
}

let playerCounter = 1;
let botCounter = 1;

function createBot(name, isTitan = false) {
  const botId = `b_${botCounter++}`;
  const color = isTitan ? '#ffd700' : COLORS[Math.floor(Math.random() * COLORS.length)];
  const headTypes = ['skull', 'robot', 'snake'];
  const headType = isTitan ? 'skull' : headTypes[Math.floor(Math.random() * headTypes.length)];
  const startX = roundCoord((Math.random() - 0.5) * (WORLD_SIZE - 40));
  const startY = roundCoord((Math.random() - 0.5) * (WORLD_SIZE - 40));
  const angle = roundCoord(Math.random() * Math.PI * 2);
  const initialLen = isTitan ? 35 : INITIAL_LENGTH;

  const segments = [];
  for (let i = 0; i < initialLen; i++) {
    segments.push({
      x: roundCoord(startX - Math.cos(angle) * i * SEGMENT_SPACING),
      y: roundCoord(startY - Math.sin(angle) * i * SEGMENT_SPACING),
    });
  }

  return {
    id: botId,
    name: isTitan ? `👑 ${name}` : name,
    color,
    segments,
    score: initialLen,
    isBoosting: false,
    state: 'alive',
    currentAngle: angle,
    inputs: { left: false, right: false, boost: false },
    headType,
    health: isTitan ? 200 : 100,
    armor: isTitan ? 80 : 40,
    power: isTitan ? 30 : 15,
    kills: 0,
    isBot: true,
    isTitanBoss: isTitan,
  };
}

// Random 3 to 4 bots
let targetBotCount = Math.floor(Math.random() * (MAX_BOTS - MIN_BOTS + 1)) + MIN_BOTS;

function maintainBots() {
  const activeBots = Object.values(state.players).filter((p) => p.isBot && p.state === 'alive');

  if (activeBots.length < targetBotCount && state.match.status === 'playing') {
    const existingNames = new Set(Object.values(state.players).map((p) => p.name));
    const availableNames = BOT_NAMES.filter((n) => !existingNames.has(n));
    const name = availableNames.length > 0
      ? availableNames[Math.floor(Math.random() * availableNames.length)]
      : `Gladiator_${Math.floor(Math.random() * 99)}`;
    const bot = createBot(name);
    state.players[bot.id] = bot;
  }
}

for (let i = 0; i < targetBotCount; i++) {
  maintainBots();
}

let killCounter = 1;
function recordKill(killerId, victimId) {
  const killer = state.players[killerId];
  const victim = state.players[victimId];
  if (!victim) return;

  const killEvent = {
    id: `k_${killCounter++}`,
    killerId: killer ? killer.id : 'arena',
    killerName: killer ? killer.name : 'Arena Hazard',
    killerColor: killer ? killer.color : '#ff0055',
    victimId: victim.id,
    victimName: victim.name,
    victimColor: victim.color,
    timestamp: Date.now(),
  };

  if (killer) {
    killer.kills = (killer.kills || 0) + 1;
    killer.score += 25;
    if (victim.isBountyTarget) {
      killer.score += 40;
      killer.power += 10;
    }
  }

  state.killFeed.unshift(killEvent);
  if (state.killFeed.length > 3) {
    state.killFeed.pop();
  }

  io.emit('kill_event', killEvent);
}

function triggerWin(winner) {
  if (state.match.status === 'ended') return;
  state.match.status = 'ended';
  state.match.winner = {
    id: winner.id,
    name: winner.name,
    color: winner.color,
    score: Math.floor(winner.score),
    kills: winner.kills || 0,
    headType: winner.headType || 'snake',
  };
  state.match.nextRoundCountdown = 5;

  io.emit('match_won', state.match.winner);

  // Victory loot drop (compact 12 items)
  if (winner.segments.length > 0) {
    const head = winner.segments[0];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = Math.random() * 10;
      spawnLoot(head.x + Math.cos(angle) * dist, head.y + Math.sin(angle) * dist, 5, winner.color, true);
    }
  }
}

function restartRound() {
  state.match.status = 'playing';
  state.match.roundNumber += 1;
  state.match.winner = null;
  state.match.roundTimeRemaining = ROUND_DURATION_SECS;
  state.match.nextRoundCountdown = 0;
  state.currentEvent = null;

  targetBotCount = Math.floor(Math.random() * (MAX_BOTS - MIN_BOTS + 1)) + MIN_BOTS;

  for (const id in state.players) {
    const p = state.players[id];
    const startX = roundCoord((Math.random() - 0.5) * (WORLD_SIZE - 30));
    const startY = roundCoord((Math.random() - 0.5) * (WORLD_SIZE - 30));
    const angle = roundCoord(Math.random() * Math.PI * 2);
    const segments = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      segments.push({
        x: roundCoord(startX - Math.cos(angle) * i * SEGMENT_SPACING),
        y: roundCoord(startY - Math.sin(angle) * i * SEGMENT_SPACING),
      });
    }
    p.segments = segments;
    p.score = INITIAL_LENGTH;
    p.state = 'alive';
    p.currentAngle = angle;
    p.health = 100;
    p.armor = 50;
    p.power = 15;
    p.kills = 0;
    p.isBoosting = false;
    p.isBountyTarget = false;
  }

  state.loot = {};
  for (let i = 0; i < 60; i++) {
    spawnLoot();
  }

  maintainBots();
  io.emit('round_restart', { roundNumber: state.match.roundNumber });
}

// Dynamic Arena Event System
let eventTimer = 0;
let eventCounter = 1;
function handleArenaEvents() {
  if (state.match.status !== 'playing') return;

  if (state.currentEvent) {
    state.currentEvent.timeRemaining -= 1;
    if (state.currentEvent.timeRemaining <= 0) {
      if (state.currentEvent.type === 'bounty' && state.currentEvent.bountyPlayerId) {
        if (state.players[state.currentEvent.bountyPlayerId]) {
          state.players[state.currentEvent.bountyPlayerId].isBountyTarget = false;
        }
      }
      state.currentEvent = null;
    } else if (state.currentEvent.type === 'frenzy') {
      spawnLoot();
    }
  } else {
    eventTimer++;
    if (eventTimer >= 50) {
      eventTimer = 0;
      const eventTypes = ['frenzy', 'bounty', 'titan', 'storm'];
      const chosen = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const evId = `e_${eventCounter++}`;

      if (chosen === 'frenzy') {
        state.currentEvent = {
          id: evId,
          type: 'frenzy',
          title: '⚡ ENERGY FRENZY',
          description: 'Loot Drop Boost for 20s!',
          icon: '⚡',
          duration: 20,
          timeRemaining: 20,
        };
      } else if (chosen === 'bounty') {
        const alivePlayers = Object.values(state.players).filter((p) => p.state === 'alive');
        if (alivePlayers.length > 0) {
          const sorted = alivePlayers.sort((a, b) => b.score - a.score);
          const target = sorted[0];
          target.isBountyTarget = true;
          state.currentEvent = {
            id: evId,
            type: 'bounty',
            title: '👑 BOUNTY TARGET ACTIVE',
            description: `Defeat ${target.name} for bonus score!`,
            icon: '🎯',
            duration: 25,
            timeRemaining: 25,
            bountyPlayerId: target.id,
            bountyPlayerName: target.name,
          };
        }
      } else if (chosen === 'titan') {
        const currentBots = Object.values(state.players).filter((p) => p.isBot && p.state === 'alive');
        if (currentBots.length < MAX_BOTS) {
          const titan = createBot('TITAN', true);
          state.players[titan.id] = titan;
        }
        state.currentEvent = {
          id: evId,
          type: 'titan',
          title: '💎 TITAN INVASION',
          description: 'A Golden Titan has entered the arena!',
          icon: '🐉',
          duration: 25,
          timeRemaining: 25,
        };
      } else if (chosen === 'storm') {
        state.currentEvent = {
          id: evId,
          type: 'storm',
          title: '🚨 DANGER STORM',
          description: 'Outer boundaries are hazardous!',
          icon: '☢️',
          duration: 20,
          timeRemaining: 20,
        };
      }
    }
  }
}

// Bot AI Routine
function updateBots(delta) {
  if (state.match.status !== 'playing') return;
  const lootArray = Object.values(state.loot);

  for (const id in state.players) {
    const bot = state.players[id];
    if (!bot.isBot || bot.state !== 'alive' || bot.segments.length === 0) continue;

    const head = bot.segments[0];
    let targetX = 0;
    let targetY = 0;
    let foundTarget = false;
    let minDist = 99999;

    for (let i = 0; i < Math.min(lootArray.length, 20); i++) {
      const loot = lootArray[i];
      const distSq = (head.x - loot.x) ** 2 + (head.y - loot.y) ** 2;
      if (distSq < minDist) {
        minDist = distSq;
        targetX = loot.x;
        targetY = loot.y;
        foundTarget = true;
      }
    }

    const boundary = WORLD_SIZE / 2 - 15;
    if (Math.abs(head.x) > boundary || Math.abs(head.y) > boundary) {
      targetX = 0;
      targetY = 0;
      foundTarget = true;
    }

    if (foundTarget) {
      const desiredAngle = Math.atan2(targetY - head.y, targetX - head.x);
      let diff = Math.atan2(Math.sin(desiredAngle - bot.currentAngle), Math.cos(desiredAngle - bot.currentAngle));
      const maxTurn = TURN_SPEED * 0.8 * delta;
      bot.currentAngle += Math.max(-maxTurn, Math.min(maxTurn, diff));
    } else {
      bot.currentAngle += (Math.random() - 0.5) * 0.2;
    }

    const speed = (bot.isBoosting && bot.score > 15) ? BOOST_SPEED : BASE_SPEED;
    const newHead = {
      x: roundCoord(head.x + Math.cos(bot.currentAngle) * speed * delta),
      y: roundCoord(head.y + Math.sin(bot.currentAngle) * speed * delta),
    };

    const worldLimit = WORLD_SIZE / 2;
    newHead.x = Math.max(-worldLimit, Math.min(worldLimit, newHead.x));
    newHead.y = Math.max(-worldLimit, Math.min(worldLimit, newHead.y));

    bot.segments.unshift(newHead);

    const targetLength = Math.floor(bot.score);
    while (bot.segments.length > targetLength) {
      bot.segments.pop();
    }

    for (const lootId in state.loot) {
      const loot = state.loot[lootId];
      const dx = newHead.x - loot.x;
      const dy = newHead.y - loot.y;
      if (dx * dx + dy * dy < 4) {
        if (loot.type === 'medkit') {
          bot.health = Math.min(100, bot.health + 30);
        } else if (loot.type === 'armor') {
          bot.armor = Math.min(100, bot.armor + 30);
        } else if (loot.type === 'weapon') {
          bot.power += 5;
        } else {
          bot.score += 2;
        }
        delete state.loot[lootId];
        break;
      }
    }
  }
}

io.on('connection', (socket) => {
  socket.on('join', (payload) => {
    const currentRealPlayers = Object.values(state.players).filter((p) => !p.isBot && p.state === 'alive').length;
    if (currentRealPlayers >= MAX_PLAYERS) {
      socket.emit('room_full', { maxPlayers: MAX_PLAYERS });
      return;
    }

    let customName = typeof payload === 'string' ? payload : payload?.name;
    let selectedHead = typeof payload === 'object' ? payload?.headType : undefined;

    const name = customName && customName.trim() ? customName.trim().substring(0, 16) : `Survivor-${playerCounter++}`;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const startX = roundCoord((Math.random() - 0.5) * (WORLD_SIZE - 25));
    const startY = roundCoord((Math.random() - 0.5) * (WORLD_SIZE - 25));
    const angle = roundCoord(Math.random() * Math.PI * 2);
    const headTypes = ['skull', 'robot', 'snake'];
    const headType = selectedHead && headTypes.includes(selectedHead) ? selectedHead : headTypes[Math.floor(Math.random() * headTypes.length)];

    const segments = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      segments.push({
        x: roundCoord(startX - Math.cos(angle) * i * SEGMENT_SPACING),
        y: roundCoord(startY - Math.sin(angle) * i * SEGMENT_SPACING),
      });
    }

    state.players[socket.id] = {
      id: socket.id,
      name,
      color,
      segments,
      score: INITIAL_LENGTH,
      isBoosting: false,
      state: 'alive',
      currentAngle: angle,
      inputs: { left: false, right: false, boost: false },
      headType,
      health: 100,
      armor: 100,
      power: 20,
      kills: 0,
      isBot: false,
    };

    socket.emit('init', socket.id);
  });

  socket.on('update_state', (data) => {
    const player = state.players[socket.id];
    if (player && player.state === 'alive') {
      player.segments = data.segments;
      player.score = data.score;
      player.currentAngle = roundCoord(data.currentAngle);
      player.isBoosting = data.isBoosting;
      if (data.health !== undefined) player.health = data.health;
      if (data.armor !== undefined) player.armor = data.armor;
      if (data.power !== undefined) player.power = data.power;

      if (player.score >= TARGET_WIN_SCORE && state.match.status === 'playing') {
        triggerWin(player);
      }

      if (data.state === 'dead') {
        player.state = 'dead';
        if (data.killedBy) {
          recordKill(data.killedBy, socket.id);
        }
        player.segments.forEach((seg, i) => {
          if (i % 3 === 0) spawnLoot(seg.x, seg.y, 2, player.color, true);
        });
      }
    }
  });

  socket.on('player_kill', (data) => {
    if (data && data.victimId) {
      recordKill(socket.id, data.victimId);
    }
  });

  socket.on('collect_loot', (lootId) => {
    if (state.loot[lootId]) {
      delete state.loot[lootId];
    }
  });

  socket.on('disconnect', () => {
    const player = state.players[socket.id];
    if (player && player.state === 'alive') {
      player.segments.forEach((seg, i) => {
        if (i % 3 === 0) spawnLoot(seg.x, seg.y, 1, player.color, true);
      });
    }
    delete state.players[socket.id];
  });
});

let simTickCount = 0;
let secondCounter = 0;
const SIM_DELTA = 1 / SIMULATION_TICK_RATE;

// 1. Simulation Loop (30Hz)
setInterval(() => {
  simTickCount++;
  secondCounter += SIM_DELTA;

  updateBots(SIM_DELTA);

  if (simTickCount % 60 === 0) {
    maintainBots();
  }

  if (secondCounter >= 1.0) {
    secondCounter = 0;
    handleArenaEvents();

    if (state.match.status === 'playing') {
      state.match.roundTimeRemaining = Math.max(0, state.match.roundTimeRemaining - 1);
      if (state.match.roundTimeRemaining <= 0) {
        const alivePlayers = Object.values(state.players).filter((p) => p.state === 'alive');
        if (alivePlayers.length > 0) {
          const topLeader = alivePlayers.sort((a, b) => b.score - a.score)[0];
          triggerWin(topLeader);
        } else {
          restartRound();
        }
      }
    } else if (state.match.status === 'ended') {
      state.match.nextRoundCountdown = Math.max(0, state.match.nextRoundCountdown - 1);
      if (state.match.nextRoundCountdown <= 0) {
        restartRound();
      }
    }
  }

  for (const id in state.players) {
    const player = state.players[id];
    if (player.state === 'alive') {
      if (player.isBoosting && Math.random() < 0.08 && player.segments.length > 0) {
        const tail = player.segments[player.segments.length - 1];
        spawnLoot(tail.x, tail.y, 1, player.color, true);
      }
      if (simTickCount >= SIMULATION_TICK_RATE * 5) {
        player.health = Math.min(100, player.health + 4);
        player.armor = Math.min(100, player.armor + 4);
      }
    }
  }
  if (simTickCount >= SIMULATION_TICK_RATE * 5) {
    simTickCount = 0;
  }

  if (Math.random() < 0.1) {
    spawnLoot();
  }
}, 1000 / SIMULATION_TICK_RATE);

// 2. Network Broadcast Loop (15Hz)
setInterval(() => {
  state.leaderboard = Object.values(state.players)
    .filter((p) => p.state === 'alive')
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      score: Math.floor(p.score),
      color: p.color,
      kills: p.kills || 0,
      headType: p.headType,
    }));

  if (state.match.status === 'playing' && state.leaderboard.length > 0) {
    const top = state.leaderboard[0];
    if (top.score >= TARGET_WIN_SCORE) {
      const fullPlayer = state.players[top.id];
      if (fullPlayer) triggerWin(fullPlayer);
    }
  }

  io.emit('state', state);
}, 1000 / NETWORK_TICK_RATE);

// Static file hosting
app.use(express.static(__dirname));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Snake Raja Server running on http://localhost:${PORT}`);
});
