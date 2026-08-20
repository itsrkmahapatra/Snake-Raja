/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

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

const MAX_PLAYERS_PER_ROOM = 10;
const MIN_BOTS = 3;
const MAX_BOTS = 4;

function roundCoord(val) {
  return Math.round(val * 10) / 10;
}

const COLORS = [
  '#00ffff', '#ff00ff', '#ffaa00', '#ffffff',
  '#7b2cbf', '#39ff14', '#ff0055', '#00ffaa',
];

const BOT_NAMES = [
  'ViperKing', 'CobraX', 'ShadowFang', 'ApexHydra', 'NeonPython',
  'CyberVenom', 'RajaStriker', 'TitanSerpent', 'CosmoDrake', 'BlitzAnaconda'
];

// Room Manager
const rooms = new Map(); // roomId -> RoomState

function createRoomState(roomId) {
  const room = {
    id: roomId,
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
    lootCounter: 1,
    botCounter: 1,
    killCounter: 1,
    targetBotCount: Math.floor(Math.random() * (MAX_BOTS - MIN_BOTS + 1)) + MIN_BOTS,
  };

  // Seed loot
  for (let i = 0; i < 50; i++) {
    spawnRoomLoot(room);
  }

  // Seed bots
  for (let i = 0; i < room.targetBotCount; i++) {
    maintainRoomBots(room);
  }

  return room;
}

function spawnRoomLoot(room, x, y, value = 1, color, force = false, specificType) {
  if (!force && Object.keys(room.loot).length >= MAX_LOOT) return;
  const id = `l_${room.lootCounter++}`;
  if (room.lootCounter > 99999) room.lootCounter = 1;

  const types = ['medkit', 'ammo', 'armor', 'weapon'];
  const type = specificType || types[Math.floor(Math.random() * types.length)];
  const rawX = x !== undefined ? x : (Math.random() - 0.5) * (WORLD_SIZE - 10);
  const rawY = y !== undefined ? y : (Math.random() - 0.5) * (WORLD_SIZE - 10);

  room.loot[id] = {
    id,
    x: roundCoord(rawX),
    y: roundCoord(rawY),
    value,
    color: color || COLORS[Math.floor(Math.random() * COLORS.length)],
    type,
  };
}

function createRoomBot(room, name, isTitan = false) {
  const botId = `b_${room.botCounter++}`;
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

function maintainRoomBots(room) {
  const activeBots = Object.values(room.players).filter((p) => p.isBot && p.state === 'alive');
  if (activeBots.length < room.targetBotCount && room.match.status === 'playing') {
    const existingNames = new Set(Object.values(room.players).map((p) => p.name));
    const availableNames = BOT_NAMES.filter((n) => !existingNames.has(n));
    const name = availableNames.length > 0
      ? availableNames[Math.floor(Math.random() * availableNames.length)]
      : `Gladiator_${Math.floor(Math.random() * 99)}`;
    const bot = createRoomBot(room, name);
    room.players[bot.id] = bot;
  }
}

function recordRoomKill(room, killerId, victimId) {
  const killer = room.players[killerId];
  const victim = room.players[victimId];
  if (!victim) return;

  const killEvent = {
    id: `k_${room.killCounter++}`,
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

  room.killFeed.unshift(killEvent);
  if (room.killFeed.length > 3) {
    room.killFeed.pop();
  }

  io.to(room.id).emit('kill_event', killEvent);
}

function triggerRoomWin(room, winner) {
  if (room.match.status === 'ended') return;
  room.match.status = 'ended';
  room.match.winner = {
    id: winner.id,
    name: winner.name,
    color: winner.color,
    score: Math.floor(winner.score),
    kills: winner.kills || 0,
    headType: winner.headType || 'snake',
  };
  room.match.nextRoundCountdown = 5;

  io.to(room.id).emit('match_won', room.match.winner);

  if (winner.segments.length > 0) {
    const head = winner.segments[0];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = Math.random() * 10;
      spawnRoomLoot(room, head.x + Math.cos(angle) * dist, head.y + Math.sin(angle) * dist, 5, winner.color, true);
    }
  }
}

function restartRoomRound(room) {
  room.match.status = 'playing';
  room.match.roundNumber += 1;
  room.match.winner = null;
  room.match.roundTimeRemaining = ROUND_DURATION_SECS;
  room.match.nextRoundCountdown = 0;
  room.currentEvent = null;

  room.targetBotCount = Math.floor(Math.random() * (MAX_BOTS - MIN_BOTS + 1)) + MIN_BOTS;

  for (const id in room.players) {
    const p = room.players[id];
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

  room.loot = {};
  for (let i = 0; i < 50; i++) {
    spawnRoomLoot(room);
  }

  maintainRoomBots(room);
  io.to(room.id).emit('round_restart', { roundNumber: room.match.roundNumber });
}

function updateRoomBots(room, delta) {
  if (room.match.status !== 'playing') return;
  const lootArray = Object.values(room.loot);

  for (const id in room.players) {
    const bot = room.players[id];
    if (!bot.isBot || bot.state !== 'alive' || bot.segments.length === 0) continue;

    const head = bot.segments[0];
    let targetX = 0;
    let targetY = 0;
    let foundTarget = false;
    let minDist = 99999;

    for (let i = 0; i < Math.min(lootArray.length, 15); i++) {
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

    for (const lootId in room.loot) {
      const loot = room.loot[lootId];
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
        delete room.loot[lootId];
        break;
      }
    }
  }
}

// Socket routing
const socketRoomMap = new Map(); // socket.id -> roomId
let totalConnectedPlayers = 0;

io.on('connection', (socket) => {
  totalConnectedPlayers++;

  socket.on('join', (payload) => {
    let customName = typeof payload === 'string' ? payload : payload?.name;
    let selectedHead = typeof payload === 'object' ? payload?.headType : undefined;
    let requestedRoom = (typeof payload === 'object' && payload?.roomCode ? payload.roomCode.trim().toUpperCase() : '') || 'GLOBAL';

    let room = rooms.get(requestedRoom);
    if (!room) {
      room = createRoomState(requestedRoom);
      rooms.set(requestedRoom, room);
    }

    const currentRealPlayers = Object.values(room.players).filter((p) => !p.isBot && p.state === 'alive').length;
    if (currentRealPlayers >= MAX_PLAYERS_PER_ROOM) {
      socket.emit('room_full', { maxPlayers: MAX_PLAYERS_PER_ROOM });
      return;
    }

    socketRoomMap.set(socket.id, requestedRoom);
    socket.join(requestedRoom);

    const name = customName && customName.trim() ? customName.trim().substring(0, 16) : `Survivor_${Math.floor(Math.random() * 899 + 100)}`;
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

    room.players[socket.id] = {
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

    socket.emit('init', { id: socket.id, roomCode: requestedRoom });
  });

  socket.on('update_state', (data) => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players[socket.id];
    if (player && player.state === 'alive') {
      player.segments = data.segments;
      player.score = data.score;
      player.currentAngle = roundCoord(data.currentAngle);
      player.isBoosting = data.isBoosting;
      if (data.health !== undefined) player.health = data.health;
      if (data.armor !== undefined) player.armor = data.armor;
      if (data.power !== undefined) player.power = data.power;

      if (player.score >= TARGET_WIN_SCORE && room.match.status === 'playing') {
        triggerRoomWin(room, player);
      }

      if (data.state === 'dead') {
        player.state = 'dead';
        if (data.killedBy) {
          recordRoomKill(room, data.killedBy, socket.id);
        }
        player.segments.forEach((seg, i) => {
          if (i % 3 === 0) spawnRoomLoot(room, seg.x, seg.y, 2, player.color, true);
        });
      }
    }
  });

  socket.on('player_kill', (data) => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && data && data.victimId) {
      recordRoomKill(room, socket.id, data.victimId);
    }
  });

  socket.on('collect_loot', (lootId) => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.loot[lootId]) {
      delete room.loot[lootId];
    }
  });

  socket.on('disconnect', () => {
    totalConnectedPlayers = Math.max(0, totalConnectedPlayers - 1);
    const roomId = socketRoomMap.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        const player = room.players[socket.id];
        if (player && player.state === 'alive') {
          player.segments.forEach((seg, i) => {
            if (i % 3 === 0) spawnRoomLoot(room, seg.x, seg.y, 1, player.color, true);
          });
        }
        delete room.players[socket.id];

        // Clean room if empty
        const remainingReal = Object.values(room.players).filter((p) => !p.isBot).length;
        if (remainingReal === 0 && roomId !== 'GLOBAL') {
          rooms.delete(roomId);
        }
      }
      socketRoomMap.delete(socket.id);
    }
  });
});

// Simulation Loop (30Hz)
const SIM_DELTA = 1 / SIMULATION_TICK_RATE;
let secondCounter = 0;

setInterval(() => {
  if (totalConnectedPlayers === 0) return; // Sleep when idle

  secondCounter += SIM_DELTA;

  for (const [roomId, room] of rooms.entries()) {
    const realPlayers = Object.values(room.players).filter((p) => !p.isBot).length;
    if (realPlayers === 0) continue;

    updateRoomBots(room, SIM_DELTA);

    if (secondCounter >= 1.0) {
      if (room.match.status === 'playing') {
        room.match.roundTimeRemaining = Math.max(0, room.match.roundTimeRemaining - 1);
        if (room.match.roundTimeRemaining <= 0) {
          const alivePlayers = Object.values(room.players).filter((p) => p.state === 'alive');
          if (alivePlayers.length > 0) {
            const top = alivePlayers.sort((a, b) => b.score - a.score)[0];
            triggerRoomWin(room, top);
          } else {
            restartRoomRound(room);
          }
        }
      } else if (room.match.status === 'ended') {
        room.match.nextRoundCountdown = Math.max(0, room.match.nextRoundCountdown - 1);
        if (room.match.nextRoundCountdown <= 0) {
          restartRoomRound(room);
        }
      }
    }

    // Boost trail loot
    for (const id in room.players) {
      const p = room.players[id];
      if (p.state === 'alive' && p.isBoosting && Math.random() < 0.08 && p.segments.length > 0) {
        const tail = p.segments[p.segments.length - 1];
        spawnRoomLoot(room, tail.x, tail.y, 1, p.color, true);
      }
    }
  }

  if (secondCounter >= 1.0) {
    secondCounter = 0;
  }
}, 1000 / SIMULATION_TICK_RATE);

// Broadcast Loop (15Hz)
setInterval(() => {
  if (totalConnectedPlayers === 0) return;

  for (const [roomId, room] of rooms.entries()) {
    const realPlayers = Object.values(room.players).filter((p) => !p.isBot).length;
    if (realPlayers === 0) continue;

    room.leaderboard = Object.values(room.players)
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

    io.to(roomId).emit('state', room);
  }
}, 1000 / NETWORK_TICK_RATE);

// Static file hosting
app.use(express.static(__dirname));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    game: 'snake-raja',
    activePlayers: totalConnectedPlayers,
    activeRooms: rooms.size,
  });
});

app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`🐍 SNAKE RAJA MULTIPLAYER ARENA RUNNING`);
  console.log(`💻 Localhost:       http://localhost:${PORT}`);
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`📡 Wi-Fi / Hotspot: http://${iface.address}:${PORT}`);
        }
      }
    }
  } catch {
    // ignore
  }
  console.log('====================================================');
});
