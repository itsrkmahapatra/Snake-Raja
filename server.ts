/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Player,
  Loot,
  KillEvent,
  ArenaEvent,
  WORLD_SIZE,
  BASE_SPEED,
  BOOST_SPEED,
  TICK_RATE,
  MAX_LOOT,
  INITIAL_LENGTH,
  SEGMENT_SPACING,
  TURN_SPEED,
  TARGET_WIN_SCORE,
  ROUND_DURATION_SECS,
} from './src/shared/types.ts';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT || 3000;

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

const state: GameState = {
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

function spawnLoot(x?: number, y?: number, value = 1, color?: string, force = false, specificType?: string) {
  if (!force && Object.keys(state.loot).length >= MAX_LOOT) return;
  const id = uuidv4();
  const types = ['medkit', 'ammo', 'armor', 'weapon'];
  const type = specificType ?? types[Math.floor(Math.random() * types.length)];
  state.loot[id] = {
    id,
    x: x ?? (Math.random() - 0.5) * (WORLD_SIZE - 10),
    y: y ?? (Math.random() - 0.5) * (WORLD_SIZE - 10),
    value,
    color: color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
    type
  };
}

// Initial loot
for (let i = 0; i < 160; i++) {
  spawnLoot();
}

let playerCounter = 1;

function createBot(name: string, isTitan = false): Player {
  const botId = `bot_${uuidv4().substring(0, 8)}`;
  const color = isTitan ? '#ffd700' : COLORS[Math.floor(Math.random() * COLORS.length)];
  const headTypes = ['skull', 'robot', 'snake'];
  const headType = isTitan ? 'skull' : headTypes[Math.floor(Math.random() * headTypes.length)];
  const startX = (Math.random() - 0.5) * (WORLD_SIZE - 40);
  const startY = (Math.random() - 0.5) * (WORLD_SIZE - 40);
  const angle = Math.random() * Math.PI * 2;
  const initialLen = isTitan ? 45 : (INITIAL_LENGTH + Math.floor(Math.random() * 20));

  const segments = [];
  for (let i = 0; i < initialLen; i++) {
    segments.push({
      x: startX - Math.cos(angle) * i * SEGMENT_SPACING,
      y: startY - Math.sin(angle) * i * SEGMENT_SPACING,
    });
  }

  return {
    id: botId,
    name: isTitan ? `👑 ${name} [BOSS]` : name,
    color,
    segments,
    score: initialLen,
    isBoosting: false,
    state: 'alive',
    currentAngle: angle,
    inputs: { left: false, right: false, boost: false },
    headType,
    health: isTitan ? 250 : 100,
    armor: isTitan ? 100 : 50,
    power: isTitan ? 35 : 15,
    kills: 0,
    isBot: true,
    isTitanBoss: isTitan,
  };
}

// Spawn initial AI Bots
const TARGET_BOT_COUNT = 6;
function maintainBots() {
  const activeBots = Object.values(state.players).filter(p => p.isBot && p.state === 'alive');
  if (activeBots.length < TARGET_BOT_COUNT && state.match.status === 'playing') {
    const existingNames = new Set(Object.values(state.players).map(p => p.name));
    const availableNames = BOT_NAMES.filter(n => !existingNames.has(n));
    const name = availableNames.length > 0
      ? availableNames[Math.floor(Math.random() * availableNames.length)]
      : `Gladiator_${Math.floor(Math.random() * 99)}`;
    const bot = createBot(name);
    state.players[bot.id] = bot;
  }
}

for (let i = 0; i < TARGET_BOT_COUNT; i++) {
  maintainBots();
}

function recordKill(killerId: string, victimId: string) {
  const killer = state.players[killerId];
  const victim = state.players[victimId];
  if (!victim) return;

  const killEvent: KillEvent = {
    id: uuidv4(),
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
    killer.score += 25; // Bonus score for kill
    if (victim.isBountyTarget) {
      killer.score += 50; // Massive bounty bonus
      killer.power += 15;
    }
  }

  state.killFeed.unshift(killEvent);
  if (state.killFeed.length > 6) {
    state.killFeed.pop();
  }

  io.emit('kill_event', killEvent);
}

function triggerWin(winner: Player) {
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
  state.match.nextRoundCountdown = 6;

  io.emit('match_won', state.match.winner);

  // Victory fireworks loot drop at winner location
  if (winner.segments.length > 0) {
    const head = winner.segments[0];
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const dist = Math.random() * 15;
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

  // Reset all players
  for (const id in state.players) {
    const p = state.players[id];
    const startX = (Math.random() - 0.5) * (WORLD_SIZE - 30);
    const startY = (Math.random() - 0.5) * (WORLD_SIZE - 30);
    const angle = Math.random() * Math.PI * 2;
    const segments = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      segments.push({
        x: startX - Math.cos(angle) * i * SEGMENT_SPACING,
        y: startY - Math.sin(angle) * i * SEGMENT_SPACING,
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

  // Reset loot
  state.loot = {};
  for (let i = 0; i < 160; i++) {
    spawnLoot();
  }

  maintainBots();
  io.emit('round_restart', { roundNumber: state.match.roundNumber });
}

// Dynamic Arena Event System
let eventTimer = 0;
function handleArenaEvents() {
  if (state.match.status !== 'playing') return;

  if (state.currentEvent) {
    state.currentEvent.timeRemaining -= 1;
    if (state.currentEvent.timeRemaining <= 0) {
      // Clear bounty flags
      if (state.currentEvent.type === 'bounty' && state.currentEvent.bountyPlayerId) {
        if (state.players[state.currentEvent.bountyPlayerId]) {
          state.players[state.currentEvent.bountyPlayerId].isBountyTarget = false;
        }
      }
      state.currentEvent = null;
    } else if (state.currentEvent.type === 'frenzy') {
      // Frenzy spawns extra loot rapidly
      spawnLoot();
      spawnLoot();
    }
  } else {
    eventTimer++;
    if (eventTimer >= 45) { // Trigger event every ~45 seconds
      eventTimer = 0;
      const eventTypes: ('frenzy' | 'bounty' | 'titan' | 'storm')[] = ['frenzy', 'bounty', 'titan', 'storm'];
      const chosen = eventTypes[Math.floor(Math.random() * eventTypes.length)];

      if (chosen === 'frenzy') {
        state.currentEvent = {
          id: uuidv4(),
          type: 'frenzy',
          title: '⚡ ENERGY FRENZY',
          description: '3x Loot Drop Rate across the Arena for 20s!',
          icon: '⚡',
          duration: 20,
          timeRemaining: 20,
        };
      } else if (chosen === 'bounty') {
        const alivePlayers = Object.values(state.players).filter(p => p.state === 'alive');
        if (alivePlayers.length > 0) {
          const sorted = alivePlayers.sort((a, b) => b.score - a.score);
          const target = sorted[0];
          target.isBountyTarget = true;
          state.currentEvent = {
            id: uuidv4(),
            type: 'bounty',
            title: '👑 BOUNTY TARGET ACTIVE',
            description: `Eliminate ${target.name} for +50 Bonus Score!`,
            icon: '🎯',
            duration: 25,
            timeRemaining: 25,
            bountyPlayerId: target.id,
            bountyPlayerName: target.name,
          };
        }
      } else if (chosen === 'titan') {
        const titan = createBot('GOLDEN TITAN', true);
        state.players[titan.id] = titan;
        state.currentEvent = {
          id: uuidv4(),
          type: 'titan',
          title: '💎 GOLDEN RAJA TITAN BOSS',
          description: 'A colossal Mega Titan has entered! Slay for massive loot!',
          icon: '🐉',
          duration: 30,
          timeRemaining: 30,
        };
      } else if (chosen === 'storm') {
        state.currentEvent = {
          id: uuidv4(),
          type: 'storm',
          title: '🚨 TOXIC ARENA STORM',
          description: 'Danger Zone alert! Outer boundaries are hazardous!',
          icon: '☢️',
          duration: 20,
          timeRemaining: 20,
        };
      }
    }
  }
}

// Bot AI Update Routine
function updateBots(delta: number) {
  if (state.match.status !== 'playing') return;

  const lootArray = Object.values(state.loot);
  const playersArray = Object.values(state.players);

  for (const id in state.players) {
    const bot = state.players[id];
    if (!bot.isBot || bot.state !== 'alive' || bot.segments.length === 0) continue;

    const head = bot.segments[0];

    // Find nearest loot or weaker prey
    let targetX = 0;
    let targetY = 0;
    let foundTarget = false;
    let minDist = 99999;

    // Scan loot
    for (let i = 0; i < Math.min(lootArray.length, 30); i++) {
      const loot = lootArray[i];
      const distSq = (head.x - loot.x) ** 2 + (head.y - loot.y) ** 2;
      if (distSq < minDist) {
        minDist = distSq;
        targetX = loot.x;
        targetY = loot.y;
        foundTarget = true;
      }
    }

    // Boundary avoidance
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
      x: head.x + Math.cos(bot.currentAngle) * speed * delta,
      y: head.y + Math.sin(bot.currentAngle) * speed * delta,
    };

    // Keep in world bounds
    const worldLimit = WORLD_SIZE / 2;
    newHead.x = Math.max(-worldLimit, Math.min(worldLimit, newHead.x));
    newHead.y = Math.max(-worldLimit, Math.min(worldLimit, newHead.y));

    bot.segments.unshift(newHead);

    const targetLength = Math.floor(bot.score);
    while (bot.segments.length > targetLength) {
      bot.segments.pop();
    }

    // Bot collects loot
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
  console.log('Player connected:', socket.id);

  socket.on('join', (payload?: string | { name?: string; headType?: string }) => {
    let customName = typeof payload === 'string' ? payload : payload?.name;
    let selectedHead = typeof payload === 'object' ? payload?.headType : undefined;

    const name = customName && customName.trim() ? customName.trim().substring(0, 16) : `Survivor-${playerCounter++}`;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const startX = (Math.random() - 0.5) * (WORLD_SIZE - 25);
    const startY = (Math.random() - 0.5) * (WORLD_SIZE - 25);
    const angle = Math.random() * Math.PI * 2;
    const headTypes = ['skull', 'robot', 'snake'];
    const headType = selectedHead && headTypes.includes(selectedHead) ? selectedHead : headTypes[Math.floor(Math.random() * headTypes.length)];

    const segments = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      segments.push({
        x: startX - Math.cos(angle) * i * SEGMENT_SPACING,
        y: startY - Math.sin(angle) * i * SEGMENT_SPACING,
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

  socket.on('update_state', (data: {
    segments: any[],
    score: number,
    currentAngle: number,
    isBoosting: boolean,
    state: string,
    health: number,
    armor: number,
    power: number,
    killedBy?: string
  }) => {
    const player = state.players[socket.id];
    if (player && player.state === 'alive') {
      player.segments = data.segments;
      player.score = data.score;
      player.currentAngle = data.currentAngle;
      player.isBoosting = data.isBoosting;
      if (data.health !== undefined) player.health = data.health;
      if (data.armor !== undefined) player.armor = data.armor;
      if (data.power !== undefined) player.power = data.power;

      // Check win condition
      if (player.score >= TARGET_WIN_SCORE && state.match.status === 'playing') {
        triggerWin(player);
      }

      if (data.state === 'dead') {
        player.state = 'dead';
        if (data.killedBy) {
          recordKill(data.killedBy, socket.id);
        }
        // Drop loot
        player.segments.forEach((seg, i) => {
          if (i % 2 === 0) spawnLoot(seg.x, seg.y, 2, player.color, true);
        });
      }
    }
  });

  socket.on('player_kill', (data: { victimId: string }) => {
    if (data && data.victimId) {
      recordKill(socket.id, data.victimId);
    }
  });

  socket.on('collect_loot', (lootId: string) => {
    if (state.loot[lootId]) {
      delete state.loot[lootId];
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    const player = state.players[socket.id];
    if (player && player.state === 'alive') {
      player.segments.forEach((seg, i) => {
        if (i % 2 === 0) spawnLoot(seg.x, seg.y, 1, player.color, true);
      });
    }
    delete state.players[socket.id];
  });
});

let tickCount = 0;
let secondCounter = 0;
const TICK_DELTA = 1 / TICK_RATE;

// Game Loop
setInterval(() => {
  tickCount++;
  secondCounter += TICK_DELTA;

  // Bot updates
  updateBots(TICK_DELTA);

  // Maintain bots count
  if (tickCount % 60 === 0) {
    maintainBots();
  }

  // Once per second tasks
  if (secondCounter >= 1.0) {
    secondCounter = 0;
    handleArenaEvents();

    if (state.match.status === 'playing') {
      state.match.roundTimeRemaining = Math.max(0, state.match.roundTimeRemaining - 1);
      if (state.match.roundTimeRemaining <= 0) {
        // Round timer ran out - highest score wins!
        const alivePlayers = Object.values(state.players).filter(p => p.state === 'alive');
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

  // Boosting loot drops & health regen
  for (const id in state.players) {
    const player = state.players[id];
    if (player.state === 'alive') {
      if (player.isBoosting && Math.random() < 0.1 && player.segments.length > 0) {
        const tail = player.segments[player.segments.length - 1];
        spawnLoot(tail.x, tail.y, 1, player.color, true);
      }
      if (tickCount >= TICK_RATE * 5) {
        player.health = Math.min(100, player.health + 4);
        player.armor = Math.min(100, player.armor + 4);
      }
    }
  }
  if (tickCount >= TICK_RATE * 5) {
    tickCount = 0;
  }

  // Random loot spawn
  if (Math.random() < 0.25) {
    spawnLoot();
  }

  // Update leaderboard
  state.leaderboard = Object.values(state.players)
    .filter(p => p.state === 'alive')
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(p => ({
      id: p.id,
      name: p.name,
      score: Math.floor(p.score),
      color: p.color,
      kills: p.kills || 0,
      headType: p.headType,
    }));

  // Check highest score for win condition during game loop
  if (state.match.status === 'playing' && state.leaderboard.length > 0) {
    const top = state.leaderboard[0];
    if (top.score >= TARGET_WIN_SCORE) {
      const fullPlayer = state.players[top.id];
      if (fullPlayer) triggerWin(fullPlayer);
    }
  }

  // Broadcast state
  io.emit('state', state);

}, 1000 / TICK_RATE);

async function startServer() {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/ping', (req, res) => {
    res.status(200).send('pong');
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
