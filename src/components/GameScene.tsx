/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore, globalGameState, mobileInputs } from '../store/gameStore';
import { WORLD_SIZE, TURN_SPEED, BOOST_SPEED, BASE_SPEED, Player, roundCoord } from '../shared/types';
import { getEmojiTexture, EMOJI_HEADS, EMOJI_LOOT } from '../shared/emojiTextures';
import * as THREE from 'three';
import { Grid, Stars, Html } from '@react-three/drei';

const localCollectedLoot = new Set<string>();

function SnakeNameTag({ player, isLocal, isLeader }: { player: Player; isLocal: boolean; isLeader: boolean }) {
  const head = player.segments[0];
  if (!head) return null;

  return (
    <Html
      position={[head.x, head.y, 1.8]}
      center
      distanceFactor={35}
      className="pointer-events-none select-none z-10"
    >
      <div
        className={`flex flex-col items-center gap-0.5 px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold ${
          isLeader
            ? 'bg-amber-950/90 border-yellow-400 text-yellow-300 shadow-md scale-105'
            : player.isTitanBoss
            ? 'bg-purple-950/90 border-amber-400 text-amber-300 shadow-md scale-110'
            : isLocal
            ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200'
            : 'bg-black/80 border-white/20 text-white/90'
        }`}
        style={{ minWidth: '70px' }}
      >
        <div className="flex items-center gap-1 leading-none">
          {isLeader && <span>👑</span>}
          {player.isTitanBoss && <span>🐉</span>}
          <span className="truncate max-w-[80px]">
            {isLocal ? `⭐ ${player.name}` : player.name}
          </span>
          <span className="text-[8px] opacity-75">{Math.floor(player.score)}</span>
        </div>
        <div className="w-full h-1 bg-black/80 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-400"
            style={{ width: `${Math.max(0, Math.min(100, player.health ?? 100))}%` }}
          />
        </div>
      </div>
    </Html>
  );
}

function Snake({
  playerId,
  color,
  headType,
  isLocal,
  isLeader,
}: {
  playerId: string;
  color: string;
  headType: string;
  isLocal: boolean;
  isLeader: boolean;
}) {
  const headConfig = EMOJI_HEADS[headType as keyof typeof EMOJI_HEADS] || EMOJI_HEADS.snake;
  const texture = useMemo(() => getEmojiTexture(headConfig.emoji, headConfig.glow), [headConfig]);

  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPositions = useRef<{ x: number; y: number }[]>([]);

  useFrame((state, delta) => {
    if (!bodyRef.current || !headRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;

    const player = gs.players[playerId];
    if (!player || player.segments.length === 0) {
      bodyRef.current.count = 0;
      headRef.current.visible = false;
      return;
    }

    headRef.current.visible = true;
    const count = Math.min(player.segments.length, 250);
    bodyRef.current.count = Math.max(0, count - 1);

    while (currentPositions.current.length < count) {
      const idx = currentPositions.current.length;
      currentPositions.current.push({
        x: player.segments[idx]?.x || 0,
        y: player.segments[idx]?.y || 0,
      });
    }

    for (let i = 0; i < count; i++) {
      let targetX = player.segments[i].x;
      let targetY = player.segments[i].y;

      const curr = currentPositions.current[i];
      if (isLocal) {
        curr.x = targetX;
        curr.y = targetY;
      } else {
        const dist = Math.abs(targetX - curr.x) + Math.abs(targetY - curr.y);
        if (dist > 8) {
          curr.x = targetX;
          curr.y = targetY;
        } else {
          curr.x += (targetX - curr.x) * 16 * delta;
          curr.y += (targetY - curr.y) * 16 * delta;
        }
      }

      if (i === 0) {
        headRef.current.position.set(curr.x, curr.y, 0.6);
        headRef.current.rotation.set(0, 0, player.currentAngle - Math.PI / 2);
      } else {
        dummy.position.set(curr.x, curr.y, 0.5);
        dummy.updateMatrix();
        bodyRef.current.setMatrixAt(i - 1, dummy.matrix);
      }
    }
    bodyRef.current.instanceMatrix.needsUpdate = true;
  });

  const gs = globalGameState.current;
  const player = gs?.players[playerId];

  return (
    <group>
      {player && player.state === 'alive' && (
        <SnakeNameTag player={player} isLocal={isLocal} isLeader={isLeader} />
      )}
      <mesh ref={headRef}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshBasicMaterial
          map={texture}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <instancedMesh
        ref={bodyRef}
        args={[null as any, null as any, 250]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.58, 10, 10]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.7}
          emissive={color}
          emissiveIntensity={0.25}
        />
      </instancedMesh>
    </group>
  );
}

function EmojiLootInstanced({
  type,
  emoji,
  glow,
  timeRef,
  dummy,
}: {
  type: string;
  emoji: string;
  glow: string;
  timeRef: React.MutableRefObject<number>;
  dummy: THREE.Object3D;
}) {
  const texture = useMemo(() => getEmojiTexture(emoji, glow), [emoji, glow]);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useFrame(() => {
    const gs = globalGameState.current;
    if (!gs || !meshRef.current) return;

    let count = 0;
    for (const id in gs.loot) {
      if (localCollectedLoot.has(id)) continue;
      const loot = gs.loot[id];
      if (loot.type !== type) continue;

      dummy.position.set(loot.x, loot.y, 0.5);
      dummy.rotation.set(0, 0, Math.sin(timeRef.current * 2 + loot.x) * 0.15);
      dummy.scale.setScalar(1.5);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(count, dummy.matrix);
      count++;
      if (count >= 80) break;
    }

    meshRef.current.count = count;
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, 80]}>
      <planeGeometry args={[2.0, 2.0]} />
      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function LootItems() {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);

  useFrame((state) => {
    timeRef.current = state.clock.elapsedTime;
  });

  return (
    <group>
      {Object.entries(EMOJI_LOOT).map(([type, config]) => (
        <EmojiLootInstanced
          key={type}
          type={type}
          emoji={config.emoji}
          glow={config.glow}
          timeRef={timeRef}
          dummy={dummy}
        />
      ))}
    </group>
  );
}

export function GameScene() {
  const {
    gameState,
    playerId,
    sendPlayerState,
    sendCollectLoot,
    updateChallengeProgress,
  } = useGameStore();

  const { camera, size } = useThree();
  const inputs = useRef({ left: false, right: false, boost: false });
  const lastDaredevilCheck = useRef(0);

  const localPlayerRef = useRef<{
    active: boolean;
    segments: { x: number; y: number }[];
    score: number;
    currentAngle: number;
    isBoosting: boolean;
    lastSendTime: number;
    health: number;
    armor: number;
    power: number;
    lastHitTime: number;
  }>({
    active: false,
    segments: [],
    score: 10,
    currentAngle: 0,
    isBoosting: false,
    lastSendTime: 0,
    health: 100,
    armor: 0,
    power: 10,
    lastHitTime: 0,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && !inputs.current.left) {
        inputs.current.left = true;
      }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && !inputs.current.right) {
        inputs.current.right = true;
      }
      if ((e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && !inputs.current.boost) {
        inputs.current.boost = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && inputs.current.left) {
        inputs.current.left = false;
      }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && inputs.current.right) {
        inputs.current.right = false;
      }
      if ((e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && inputs.current.boost) {
        inputs.current.boost = false;
      }
    };

    const handleBlur = () => {
      inputs.current = { left: false, right: false, boost: false };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useFrame((state, delta) => {
    const gs = globalGameState.current;
    if (!gs || !playerId) return;

    const serverPlayer = gs.players[playerId];
    if (serverPlayer && serverPlayer.state === 'alive') {
      if (!localPlayerRef.current.active && serverPlayer.segments.length > 0) {
        localPlayerRef.current.active = true;
        localPlayerRef.current.segments = [...serverPlayer.segments];
        localPlayerRef.current.score = serverPlayer.score;
        localPlayerRef.current.currentAngle = serverPlayer.currentAngle;
        localPlayerRef.current.health = serverPlayer.health ?? 100;
        localPlayerRef.current.armor = serverPlayer.armor ?? 0;
        localPlayerRef.current.power = serverPlayer.power ?? 10;
        localPlayerRef.current.lastHitTime = 0;
      }

      if (!localPlayerRef.current.active) return;

      // Mobile Joystick 360° Steering or Keyboard Fallback
      if (mobileInputs.active) {
        let diff = Math.atan2(
          Math.sin(mobileInputs.targetAngle - localPlayerRef.current.currentAngle),
          Math.cos(mobileInputs.targetAngle - localPlayerRef.current.currentAngle)
        );
        const maxTurn = TURN_SPEED * 1.5 * delta;
        if (Math.abs(diff) <= maxTurn) {
          localPlayerRef.current.currentAngle = mobileInputs.targetAngle;
        } else {
          localPlayerRef.current.currentAngle += Math.sign(diff) * maxTurn;
        }
      } else {
        if (inputs.current.left || mobileInputs.turnLeft) localPlayerRef.current.currentAngle += TURN_SPEED * delta;
        if (inputs.current.right || mobileInputs.turnRight) localPlayerRef.current.currentAngle -= TURN_SPEED * delta;
      }

      const isBoosting = (inputs.current.boost || mobileInputs.isBoosting) && localPlayerRef.current.score > 10;
      localPlayerRef.current.isBoosting = isBoosting;

      if (isBoosting) {
        updateChallengeProgress('boost', delta);
      }

      const speed = isBoosting ? BOOST_SPEED : BASE_SPEED;

      const head = { ...localPlayerRef.current.segments[0] };
      head.x += Math.cos(localPlayerRef.current.currentAngle) * speed * delta;
      head.y += Math.sin(localPlayerRef.current.currentAngle) * speed * delta;

      // Boundary check
      const boundary = WORLD_SIZE / 2;
      if (head.x < -boundary) head.x = -boundary;
      if (head.x > boundary) head.x = boundary;
      if (head.y < -boundary) head.y = -boundary;
      if (head.y > boundary) head.y = boundary;

      localPlayerRef.current.segments.unshift(head);

      if (localPlayerRef.current.isBoosting) {
        localPlayerRef.current.score -= 2 * delta;
        if (localPlayerRef.current.score <= 10) {
          localPlayerRef.current.isBoosting = false;
          localPlayerRef.current.score = 10;
        }
      }

      const targetLength = Math.floor(localPlayerRef.current.score);
      while (localPlayerRef.current.segments.length > targetLength) {
        localPlayerRef.current.segments.pop();
      }

      // Check loot collisions
      for (const lootId in gs.loot) {
        if (localCollectedLoot.has(lootId)) continue;
        const lootItem = gs.loot[lootId];
        const dx = head.x - lootItem.x;
        const dy = head.y - lootItem.y;
        if (dx * dx + dy * dy < 4) {
          if (lootItem.type === 'medkit') {
            localPlayerRef.current.health = Math.min(100, localPlayerRef.current.health + 40);
          } else if (lootItem.type === 'armor') {
            localPlayerRef.current.armor = Math.min(100, localPlayerRef.current.armor + 40);
            updateChallengeProgress('shields', 1);
          } else if (lootItem.type === 'weapon') {
            localPlayerRef.current.power += 5;
          } else if (lootItem.type === 'ammo') {
            localPlayerRef.current.score += 15;
          } else {
            localPlayerRef.current.score += lootItem.value;
          }

          updateChallengeProgress('loot', 1);
          updateChallengeProgress('score', Math.floor(localPlayerRef.current.score));

          localCollectedLoot.add(lootId);
          delete gs.loot[lootId];
          sendCollectLoot(lootId);
        }
      }

      // Cleanup localCollectedLoot occasionally
      if (Math.random() < 0.05) {
        for (const id of localCollectedLoot) {
          if (!gs.loot[id]) localCollectedLoot.delete(id);
        }
      }

      // Check player collisions & proximity
      let collidedOther: Player | null = null;
      let closeEnemy = false;

      for (const otherId in gs.players) {
        if (otherId === playerId) continue;
        const other = gs.players[otherId];
        if (other.state !== 'alive') continue;

        for (const seg of other.segments) {
          const dx = head.x - seg.x;
          const dy = head.y - seg.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < 2.25) {
            collidedOther = other;
            break;
          } else if (distSq < 16) {
            closeEnemy = true;
          }
        }
        if (collidedOther) break;
      }

      // Daredevil proximity challenge check
      const now = Date.now();
      if (closeEnemy && now - lastDaredevilCheck.current > 3000) {
        lastDaredevilCheck.current = now;
        updateChallengeProgress('daredevil', 1);
      }

      if (collidedOther) {
        if (now - localPlayerRef.current.lastHitTime > 500) {
          const damage = collidedOther.power || 15;

          if (collidedOther.isTitanBoss) {
            updateChallengeProgress('titan_boss', 1);
          }

          if (localPlayerRef.current.armor > 0) {
            if (localPlayerRef.current.armor >= damage) {
              localPlayerRef.current.armor -= damage;
            } else {
              const rem = damage - localPlayerRef.current.armor;
              localPlayerRef.current.armor = 0;
              localPlayerRef.current.health -= rem;
            }
          } else {
            localPlayerRef.current.health -= damage;
          }

          localPlayerRef.current.lastHitTime = now;

          head.x -= Math.cos(localPlayerRef.current.currentAngle) * 3;
          head.y -= Math.sin(localPlayerRef.current.currentAngle) * 3;
          localPlayerRef.current.segments[0] = head;
        }

        if (localPlayerRef.current.health <= 0) {
          localPlayerRef.current.active = false;
          sendPlayerState({
            segments: localPlayerRef.current.segments.map(s => ({ x: roundCoord(s.x), y: roundCoord(s.y) })),
            score: Math.floor(localPlayerRef.current.score),
            currentAngle: roundCoord(localPlayerRef.current.currentAngle),
            isBoosting: localPlayerRef.current.isBoosting,
            state: 'dead',
            health: 0,
            armor: 0,
            power: localPlayerRef.current.power,
            killedBy: collidedOther.id,
          });
          return;
        }
      }

      gs.players[playerId].segments = localPlayerRef.current.segments;
      gs.players[playerId].score = localPlayerRef.current.score;
      gs.players[playerId].currentAngle = localPlayerRef.current.currentAngle;
      gs.players[playerId].isBoosting = localPlayerRef.current.isBoosting;
      gs.players[playerId].health = localPlayerRef.current.health;
      gs.players[playerId].armor = localPlayerRef.current.armor;
      gs.players[playerId].power = localPlayerRef.current.power;

      // Send state to server at ~14Hz (70ms) with quantized coordinates
      if (now - localPlayerRef.current.lastSendTime > 70) {
        sendPlayerState({
          segments: localPlayerRef.current.segments.map(s => ({ x: roundCoord(s.x), y: roundCoord(s.y) })),
          score: Math.floor(localPlayerRef.current.score),
          currentAngle: roundCoord(localPlayerRef.current.currentAngle),
          isBoosting: localPlayerRef.current.isBoosting,
          state: 'alive',
          health: Math.floor(localPlayerRef.current.health),
          armor: Math.floor(localPlayerRef.current.armor),
          power: Math.floor(localPlayerRef.current.power),
        });
        localPlayerRef.current.lastSendTime = now;
      }

      const aspect = size.width / Math.max(1, size.height);
      const baseHeight = aspect < 0.8 ? 32 : aspect < 1.2 ? 25 : 20;
      const targetZ = Math.min(50, Math.max(baseHeight, baseHeight + localPlayerRef.current.score * 0.15));

      // Smooth camera follow predicted head
      camera.position.x += (head.x - camera.position.x) * 10 * delta;
      camera.position.y += (head.y - camera.position.y) * 10 * delta;
      camera.position.z += (targetZ - camera.position.z) * 4 * delta;
      camera.lookAt(camera.position.x, camera.position.y, 0);
    } else {
      localPlayerRef.current.active = false;
    }
  });

  if (!gameState) return null;

  const topLeaderId = gameState.leaderboard && gameState.leaderboard[0] ? gameState.leaderboard[0].id : '';

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[20, 20, 30]} intensity={1.0} />

      {/* Lightweight Ground Plane */}
      <mesh position={[0, 0, -0.2]}>
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshBasicMaterial color="#030408" />
      </mesh>

      <Grid
        position={[0, 0, -0.1]}
        rotation={[Math.PI / 2, 0, 0]}
        args={[WORLD_SIZE, WORLD_SIZE]}
        cellSize={1.5}
        cellThickness={0.15}
        cellColor="#1a0b2e"
        sectionSize={15}
        sectionThickness={0.5}
        sectionColor="#350e5e"
        fadeDistance={80}
        fadeStrength={1.2}
      />

      <Stars radius={80} depth={40} count={600} factor={3} saturation={0.8} fade speed={0.8} />

      <LootItems />

      {Object.values(gameState.players).map((player) => {
        if (player.state !== 'alive' || player.segments.length === 0) return null;
        return (
          <Snake
            key={player.id}
            playerId={player.id}
            color={player.color}
            headType={player.headType}
            isLocal={player.id === playerId}
            isLeader={player.id === topLeaderId}
          />
        );
      })}
    </>
  );
}
