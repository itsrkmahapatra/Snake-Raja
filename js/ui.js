/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

import { TARGET_WIN_SCORE, WORLD_SIZE } from './constants.js';

export class UIManager {
  constructor(gameScene, callbacks) {
    this.gameScene = gameScene;
    this.callbacks = callbacks; // { onJoin, onLogin, onSwitchProfile, onClaimChallenge }

    this.userProfile = null;
    this.savedProfiles = [];
    this.challenges = [];
    this.recentKills = [];
    this.selectedAvatar = 'snake';

    this.radarCanvas = document.getElementById('radarCanvas');
    this.radarCtx = this.radarCanvas?.getContext('2d');

    this.setupTouchJoystick();
    this.setupBoostButton();
    this.setupEventListeners();
  }

  updateProfileData(userProfile, savedProfiles, challenges) {
    this.userProfile = userProfile;
    this.savedProfiles = savedProfiles;
    this.challenges = challenges;

    // Update Header Profile Pill
    const profilePillName = document.getElementById('headerProfileName');
    const profilePillLevel = document.getElementById('headerProfileLevel');
    const profilePillAvatar = document.getElementById('headerProfileAvatar');

    if (profilePillName && userProfile) {
      profilePillName.textContent = userProfile.username;
    }
    if (profilePillLevel && userProfile) {
      profilePillLevel.textContent = `Lv.${userProfile.level}`;
    }
    if (profilePillAvatar && userProfile) {
      profilePillAvatar.textContent = this.getAvatarEmoji(userProfile.avatar);
    }

    // Update Unclaimed Quests Badge
    const unclaimedCount = this.challenges.filter((c) => c.completed && !c.claimed).length;
    const badge = document.getElementById('questsBadge');
    if (badge) {
      if (unclaimedCount > 0) {
        badge.textContent = unclaimedCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  getAvatarEmoji(avatar) {
    if (avatar === 'skull') return '💀';
    if (avatar === 'robot') return '🤖';
    return '🐍';
  }

  setupTouchJoystick() {
    const joystickZone = document.getElementById('joystickZone');
    const joystickHandle = document.getElementById('joystickHandle');
    if (!joystickZone || !joystickHandle) return;

    let activePointerId = null;
    const size = 110;
    const radius = size / 2;
    const maxDistance = radius - 12;

    const handlePointerDown = (e) => {
      if (activePointerId !== null) return;
      activePointerId = e.pointerId;
      joystickZone.setPointerCapture?.(e.pointerId);
      updateJoystick(e.clientX, e.clientY);
    };

    const handlePointerMove = (e) => {
      if (activePointerId !== e.pointerId) return;
      updateJoystick(e.clientX, e.clientY);
    };

    const handlePointerUp = (e) => {
      if (activePointerId !== e.pointerId) return;
      activePointerId = null;
      joystickHandle.style.transform = 'translate(0px, 0px)';
      this.gameScene.inputs.joystickActive = false;
    };

    const updateJoystick = (clientX, clientY) => {
      const rect = joystickZone.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const distance = Math.hypot(dx, dy);

      const angle = Math.atan2(-dy, dx);
      if (distance > 0) {
        this.gameScene.inputs.joystickActive = true;
        this.gameScene.inputs.targetAngle = angle;
      }

      const clampedDistance = Math.min(distance, maxDistance);
      const angleScreen = Math.atan2(dy, dx);
      const hx = Math.cos(angleScreen) * clampedDistance;
      const hy = Math.sin(angleScreen) * clampedDistance;

      joystickHandle.style.transform = `translate(${hx}px, ${hy}px)`;
    };

    joystickZone.addEventListener('pointerdown', handlePointerDown);
    joystickZone.addEventListener('pointermove', handlePointerMove);
    joystickZone.addEventListener('pointerup', handlePointerUp);
    joystickZone.addEventListener('pointercancel', handlePointerUp);
  }

  setupBoostButton() {
    const boostBtn = document.getElementById('boostBtn');
    if (!boostBtn) return;

    const handleBoostStart = (e) => {
      e.preventDefault();
      boostBtn.setPointerCapture?.(e.pointerId);
      this.gameScene.inputs.boost = true;
      boostBtn.classList.add('boosting-active');
      if ('vibrate' in navigator) {
        try { navigator.vibrate(20); } catch { /* ignore */ }
      }
    };

    const handleBoostEnd = (e) => {
      e.preventDefault();
      this.gameScene.inputs.boost = false;
      boostBtn.classList.remove('boosting-active');
    };

    boostBtn.addEventListener('pointerdown', handleBoostStart);
    boostBtn.addEventListener('pointerup', handleBoostEnd);
    boostBtn.addEventListener('pointercancel', handleBoostEnd);
    boostBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setupEventListeners() {
    // Header Buttons
    document.getElementById('profileBtn')?.addEventListener('click', () => this.showModal('profileModal'));
    document.getElementById('questsBtn')?.addEventListener('click', () => this.showModal('questsModal'));
    document.getElementById('rosterBtn')?.addEventListener('click', () => this.showModal('rosterModal'));
    document.getElementById('leaderboardBtn')?.addEventListener('click', () => this.showModal('leaderboardModal'));
    document.getElementById('donateBtn')?.addEventListener('click', () => this.showModal('donateModal'));

    // Modal Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const modalId = btn.getAttribute('data-close-modal');
        this.hideModal(modalId);
      });
    });

    // Deploy Modal Controls
    const randomNameBtn = document.getElementById('randomNameBtn');
    const nicknameInput = document.getElementById('nicknameInput');
    const deployBtn = document.getElementById('deployBtn');

    randomNameBtn?.addEventListener('click', () => {
      const names = ['ViperKing', 'CobraX', 'ShadowFang', 'ApexHydra', 'NeonPython', 'CyberVenom', 'RajaStriker'];
      const rand = names[Math.floor(Math.random() * names.length)] + '_' + Math.floor(Math.random() * 99);
      if (nicknameInput) nicknameInput.value = rand;
    });

    // Avatar pickers
    document.querySelectorAll('.avatar-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.avatar-option').forEach((b) => b.classList.remove('selected-avatar'));
        btn.classList.add('selected-avatar');
        this.selectedAvatar = btn.getAttribute('data-avatar') || 'snake';
      });
    });

    // 3 Mode Selection: Online, Local LAN, Offline Solo
    this.selectedMode = 'online';
    const modeOnlineBtn = document.getElementById('modeOnlineBtn');
    const modeLanBtn = document.getElementById('modeLanBtn');
    const modeOfflineBtn = document.getElementById('modeOfflineBtn');
    const lanConfigRow = document.getElementById('lanConfigRow');
    const lanIpInput = document.getElementById('lanIpInput');

    const savedLanIp = localStorage.getItem('snake_raja_lan_ip');
    if (savedLanIp && lanIpInput) {
      lanIpInput.value = savedLanIp;
    }

    const resetModeTabs = () => {
      [modeOnlineBtn, modeLanBtn, modeOfflineBtn].forEach((b) => {
        if (b) {
          b.classList.remove('active-tab');
          b.style.background = 'rgba(255,255,255,0.05)';
          b.style.color = 'rgba(255,255,255,0.7)';
        }
      });
      lanConfigRow?.classList.add('hidden');
      lanConfigRow?.classList.remove('flex');
    };

    modeOnlineBtn?.addEventListener('click', () => {
      this.selectedMode = 'online';
      resetModeTabs();
      modeOnlineBtn.classList.add('active-tab');
      modeOnlineBtn.style.background = '#00f0ff';
      modeOnlineBtn.style.color = '#000';
    });

    modeLanBtn?.addEventListener('click', () => {
      this.selectedMode = 'lan';
      resetModeTabs();
      modeLanBtn.classList.add('active-tab');
      modeLanBtn.style.background = '#a855f7';
      modeLanBtn.style.color = '#fff';
      lanConfigRow?.classList.remove('hidden');
      lanConfigRow?.classList.add('flex');
    });

    modeOfflineBtn?.addEventListener('click', () => {
      this.selectedMode = 'offline';
      resetModeTabs();
      modeOfflineBtn.classList.add('active-tab');
      modeOfflineBtn.style.background = '#ffd700';
      modeOfflineBtn.style.color = '#000';
    });

    // Deploy Action
    deployBtn?.addEventListener('click', () => {
      const name = nicknameInput?.value.trim() || this.userProfile?.username || 'Raja_Survivor';
      const lanIp = lanIpInput?.value.trim() || '';
      if (lanIp) {
        localStorage.setItem('snake_raja_lan_ip', lanIp);
      }
      this.callbacks.onJoin?.(name, this.selectedAvatar, this.selectedMode, lanIp);
      this.hideModal('deployModal');
      this.hideModal('victoryModal');
    });

    // New Profile creation
    document.getElementById('createProfileBtn')?.addEventListener('click', () => {
      const nameInput = document.getElementById('newProfileNameInput');
      const name = nameInput?.value.trim();
      if (!name) return;
      this.callbacks.onLogin?.(name, this.selectedAvatar);
      nameInput.value = '';
      this.hideModal('profileModal');
    });

    // Profile Modal Tabs
    document.getElementById('tabStatsBtn')?.addEventListener('click', () => {
      document.getElementById('tabStatsBtn').classList.add('active-tab');
      document.getElementById('tabAccountsBtn').classList.remove('active-tab');
      document.getElementById('profileStatsView').classList.remove('hidden');
      document.getElementById('profileAccountsView').classList.add('hidden');
    });

    document.getElementById('tabAccountsBtn')?.addEventListener('click', () => {
      document.getElementById('tabAccountsBtn').classList.add('active-tab');
      document.getElementById('tabStatsBtn').classList.remove('active-tab');
      document.getElementById('profileAccountsView').classList.remove('hidden');
      document.getElementById('profileStatsView').classList.add('hidden');
      this.renderAccountsList();
    });
  }

  showModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('flex');

    if (modalId === 'profileModal') {
      this.renderProfileStats();
    } else if (modalId === 'questsModal') {
      this.renderQuestsList();
    } else if (modalId === 'rosterModal') {
      this.renderRosterList();
    } else if (modalId === 'leaderboardModal') {
      this.renderLeaderboardList();
    }
  }

  hideModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('flex');
  }

  renderProfileStats() {
    if (!this.userProfile) return;
    const p = this.userProfile;

    document.getElementById('statsUsername').textContent = p.username;
    document.getElementById('statsAvatarEmoji').textContent = this.getAvatarEmoji(p.avatar);
    document.getElementById('statsLevelBadge').textContent = `Lv.${p.level}`;
    document.getElementById('statsWins').textContent = p.wins || 0;
    document.getElementById('statsKills').textContent = p.totalKills || 0;
    document.getElementById('statsHighScore').textContent = p.highestScore || 0;

    const winRate = p.matchesPlayed > 0 ? Math.round((p.wins / p.matchesPlayed) * 100) : 0;
    document.getElementById('statsWinRate').textContent = `${winRate}% (${p.matchesPlayed || 0}g)`;

    const xpPercent = Math.min(100, ((p.xp % 300) / 300) * 100);
    document.getElementById('statsXpBar').style.width = `${xpPercent}%`;
  }

  renderAccountsList() {
    const container = document.getElementById('accountsListContainer');
    if (!container) return;
    container.innerHTML = '';

    this.savedProfiles.forEach((p) => {
      const isActive = p.id === this.userProfile?.id;
      const card = document.createElement('div');
      card.className = `account-card ${isActive ? 'active-account' : ''}`;
      card.innerHTML = `
        <div class="flex items-center gap-2 truncate">
          <span class="text-lg">${this.getAvatarEmoji(p.avatar)}</span>
          <div class="flex flex-col truncate">
            <span class="font-bold text-white text-xs truncate">${p.username} ${isActive ? '(Active)' : ''}</span>
            <span class="text-[9px] text-white/50">Lv.${p.level} • ${p.wins || 0} Wins</span>
          </div>
        </div>
        ${!isActive ? `<button class="login-sub-btn px-2.5 py-1 rounded-lg text-[9px] font-bold" data-id="${p.id}">Login</button>` : ''}
      `;

      card.querySelector('.login-sub-btn')?.addEventListener('click', () => {
        this.callbacks.onSwitchProfile?.(p.id);
        this.hideModal('profileModal');
      });

      container.appendChild(card);
    });
  }

  renderQuestsList() {
    const container = document.getElementById('questsListContainer');
    if (!container) return;
    container.innerHTML = '';

    // Update level banner
    const lvlText = document.getElementById('questLevelText');
    const lvlXp = document.getElementById('questXpText');
    const lvlBar = document.getElementById('questLevelBar');
    if (this.userProfile) {
      if (lvlText) lvlText.textContent = `LEVEL ${this.userProfile.level} SURVIVOR`;
      if (lvlXp) lvlXp.textContent = `${this.userProfile.xp % 300}/300 XP`;
      if (lvlBar) lvlBar.style.width = `${Math.min(100, ((this.userProfile.xp % 300) / 300) * 100)}%`;
    }

    this.challenges.forEach((ch) => {
      const card = document.createElement('div');
      card.className = `quest-card ${ch.claimed ? 'quest-claimed' : ch.completed ? 'quest-done' : ''}`;
      const pct = Math.min(100, (ch.progress / ch.target) * 100);

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 truncate max-w-[75%]">
            <span class="text-base">${ch.icon}</span>
            <div class="flex flex-col truncate">
              <span class="font-bold text-white text-xs truncate">${ch.title}</span>
              <span class="text-[9px] text-white/50 truncate">${ch.description}</span>
            </div>
          </div>
          <span class="text-[10px] font-bold text-yellow-300">+${ch.rewardXP} XP</span>
        </div>
        <div class="flex items-center justify-between gap-2 mt-1">
          <div class="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden">
            <div class="h-full ${ch.completed ? 'bg-green-400' : 'bg-yellow-400'}" style="width: ${pct}%"></div>
          </div>
          <span class="text-[9px] font-mono text-white/60">${ch.progress}/${ch.target}</span>
          ${ch.completed && !ch.claimed ? `<button class="claim-btn px-2 py-0.5 rounded text-[9px] font-bold" data-id="${ch.id}">CLAIM</button>` : ''}
          ${ch.claimed ? `<span class="text-green-400 text-xs font-bold">✓</span>` : ''}
        </div>
      `;

      card.querySelector('.claim-btn')?.addEventListener('click', () => {
        this.callbacks.onClaimChallenge?.(ch.id);
        this.renderQuestsList();
      });

      container.appendChild(card);
    });
  }

  renderRosterList() {
    const container = document.getElementById('rosterListContainer');
    if (!container || !this.gameScene.gameState) return;
    container.innerHTML = '';

    const players = Object.values(this.gameScene.gameState.players).filter((p) => p.state === 'alive');
    const leader = this.gameScene.gameState.leaderboard?.[0];

    document.getElementById('rosterCountTitle').textContent = `ARENA SURVIVORS (${players.length})`;

    players.forEach((p) => {
      const isMe = p.id === this.gameScene.playerId;
      const isRaja = leader?.id === p.id;
      const item = document.createElement('div');
      item.className = `roster-item ${isRaja ? 'roster-raja' : isMe ? 'roster-me' : ''}`;
      item.innerHTML = `
        <div class="flex items-center gap-2 truncate max-w-[70%]">
          <span>${isRaja ? '👑' : p.isTitanBoss ? '🐉' : this.getAvatarEmoji(p.headType)}</span>
          <div class="flex flex-col truncate">
            <span style="color: ${p.color}" class="font-bold truncate text-xs">${p.name} ${isMe ? '(You)' : ''}</span>
            <span class="text-[8px] text-white/50">HP ${Math.floor(p.health)} • ${p.kills || 0} kills</span>
          </div>
        </div>
        <span class="text-yellow-300 font-bold text-xs">${Math.floor(p.score)} pts</span>
      `;
      container.appendChild(item);
    });
  }

  renderLeaderboardList() {
    const container = document.getElementById('leaderboardListContainer');
    if (!container || !this.gameScene.gameState) return;
    container.innerHTML = '';

    const list = this.gameScene.gameState.leaderboard || [];
    if (list.length === 0) {
      container.innerHTML = '<p class="text-center text-xs text-white/40 py-4">No survivors ranked yet</p>';
      return;
    }

    list.forEach((entry, idx) => {
      const isMe = entry.id === this.gameScene.playerId;
      const row = document.createElement('div');
      row.className = `leaderboard-row ${isMe ? 'leaderboard-me' : ''}`;
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;

      row.innerHTML = `
        <div class="flex items-center gap-2 truncate max-w-[70%]">
          <span class="font-bold w-4 text-center ${idx < 3 ? 'text-sm' : 'text-xs text-white/40'}">${medal}</span>
          <span style="color: ${entry.color}" class="font-bold truncate text-xs">${entry.name}</span>
        </div>
        <span class="text-yellow-300 font-bold text-xs">${entry.score} pts</span>
      `;
      container.appendChild(row);
    });
  }

  updateHUD(gameState, playerId) {
    if (!gameState) return;

    const player = playerId ? gameState.players[playerId] : null;
    const isAlive = player && player.state === 'alive';

    // Combat Card & Controls Visibility
    const combatCard = document.getElementById('combatCard');
    const touchControls = document.getElementById('touchControls');
    const deployModal = document.getElementById('deployModal');

    if (isAlive) {
      combatCard?.classList.remove('hidden');
      touchControls?.classList.remove('hidden');
      if (deployModal && !deployModal.classList.contains('hidden')) {
        this.hideModal('deployModal');
      }

      // Update Combat Meters
      document.getElementById('hudScoreVal').textContent = `${Math.floor(player.score)} / ${TARGET_WIN_SCORE}`;
      const scorePct = Math.min(100, (player.score / TARGET_WIN_SCORE) * 100);
      document.getElementById('hudScoreBar').style.width = `${scorePct}%`;

      document.getElementById('hudHpVal').textContent = Math.floor(player.health || 0);
      document.getElementById('hudHpBar').style.width = `${Math.max(0, Math.min(100, player.health || 0))}%`;

      document.getElementById('hudArmorVal').textContent = Math.floor(player.armor || 0);
      document.getElementById('hudArmorBar').style.width = `${Math.max(0, Math.min(100, player.armor || 0))}%`;
    } else {
      combatCard?.classList.add('hidden');
      touchControls?.classList.add('hidden');
      if (deployModal && deployModal.classList.contains('hidden') && !document.getElementById('victoryModal')?.classList.contains('flex')) {
        this.showModal('deployModal');
        const deployTitle = document.getElementById('deployTitle');
        if (deployTitle && player && player.state === 'dead') {
          deployTitle.textContent = 'GAME OVER - PLAY AGAIN';
        }
      }
    }

    // Top Persistent Roster Strip
    this.updateTopRosterStrip(gameState, playerId);

    // Event Banner
    this.updateEventBanner(gameState.currentEvent);

    // Radar Canvas
    this.updateRadar(gameState, playerId);
  }

  updateTopRosterStrip(gameState, playerId) {
    const strip = document.getElementById('topRosterStrip');
    if (!strip || !gameState.players) return;

    const alive = Object.values(gameState.players).filter((p) => p.state === 'alive');
    const topLeader = gameState.leaderboard?.[0];

    strip.innerHTML = `<span class="roster-chip-label">SURVIVORS (${alive.length}):</span>`;

    alive.forEach((p) => {
      const isMe = p.id === playerId;
      const isRaja = topLeader?.id === p.id;
      const chip = document.createElement('div');
      chip.className = `roster-chip ${isRaja ? 'chip-raja' : isMe ? 'chip-me' : ''}`;
      chip.innerHTML = `
        ${isRaja ? '👑' : p.isTitanBoss ? '🐉' : ''}
        <span style="color: ${p.color}" class="truncate max-w-[60px]">${isMe ? `${p.name} (You)` : p.name}</span>
        <span class="chip-score">${Math.floor(p.score)}</span>
      `;
      strip.appendChild(chip);
    });
  }

  updateEventBanner(currentEvent) {
    const banner = document.getElementById('eventBanner');
    if (!banner) return;

    if (currentEvent && currentEvent.timeRemaining > 0) {
      banner.classList.remove('hidden');
      banner.classList.add('flex');
      document.getElementById('eventIcon').textContent = currentEvent.icon || '⚡';
      document.getElementById('eventTitle').textContent = currentEvent.title || '';
      document.getElementById('eventTimer').textContent = `${currentEvent.timeRemaining}s`;
    } else {
      banner.classList.add('hidden');
      banner.classList.remove('flex');
    }
  }

  updateRadar(gameState, playerId) {
    if (!this.radarCtx || !this.radarCanvas) return;
    const ctx = this.radarCtx;
    const size = this.radarCanvas.width;
    const halfWorld = WORLD_SIZE / 2;
    const scale = size / WORLD_SIZE;

    ctx.clearRect(0, 0, size, size);

    // Background & grid
    ctx.fillStyle = 'rgba(6, 8, 16, 0.85)';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();

    if (!gameState || !gameState.players) return;

    for (const id in gameState.players) {
      if (id === playerId) continue;
      const p = gameState.players[id];
      if (p.state !== 'alive' || !p.segments || !p.segments[0]) continue;

      const px = (p.segments[0].x + halfWorld) * scale;
      const py = (halfWorld - p.segments[0].y) * scale;

      if (p.isTitanBoss) {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.isBountyTarget) {
        ctx.fillStyle = '#ff0033';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color || '#ff0055';
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Local player dot
    if (playerId && gameState.players[playerId]?.state === 'alive') {
      const local = gameState.players[playerId];
      if (local.segments && local.segments[0]) {
        const lx = (local.segments[0].x + halfWorld) * scale;
        const ly = (halfWorld - local.segments[0].y) * scale;

        ctx.strokeStyle = 'rgba(255, 210, 0, 0.7)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(lx, ly, 3.8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lx, ly, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  showVictoryModal(winner, nextCountdown) {
    this.showModal('victoryModal');
    document.getElementById('victoryWinnerName').textContent = `👑 ${winner.name}`;
    document.getElementById('victoryWinnerStats').textContent = `Won with ${winner.score} PTS • ${winner.kills || 0} Kills`;
    document.getElementById('victoryCountdown').textContent = `${nextCountdown}s`;
  }

  addMicroKill(event) {
    const feed = document.getElementById('microKillFeed');
    if (!feed) return;

    const item = document.createElement('div');
    item.className = 'kill-feed-item';
    item.innerHTML = `
      <span style="color: ${event.killerColor}" class="font-bold truncate max-w-[50px]">${event.killerName}</span>
      <span class="text-white/40">⚔️</span>
      <span style="color: ${event.victimColor}" class="font-bold truncate max-w-[50px]">${event.victimName}</span>
    `;

    feed.prepend(item);
    setTimeout(() => {
      item.remove();
    }, 4000);
  }
}
