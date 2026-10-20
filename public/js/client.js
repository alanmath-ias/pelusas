/**
 * Cliente de juego Pelusas - Socket.io & Manejo de Interfaz
 * Reconexión de sesiones móviles y robo manual tocando cartas del rival
 */

const socket = io();

// Token de jugador aislado por pestaña (sessionStorage) con respaldo para reconexión móvil
const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');

let playerToken = sessionStorage.getItem('pelusa_player_token');
if (!playerToken) {
  if (roomParam) {
    // Si entramos desde un link de invitación, generar un token único y fresco para esta pestaña
    playerToken = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem('pelusa_player_token', playerToken);
  } else {
    playerToken = localStorage.getItem('pelusa_player_token');
    if (!playerToken) {
      playerToken = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('pelusa_player_token', playerToken);
    }
    sessionStorage.setItem('pelusa_player_token', playerToken);
  }
}

let myPlayerId = null;
let currentRoom = null;
let selectedAvatar = 1;

// Variables para animación FLIP y revelación de cartas
let previousTurnCards = [];
let previousTurnIndex = null;
let isAnimatingCard = false;
let isFirstGameRender = true;

// Elementos DOM
const screenLobby = document.getElementById('screen-lobby');
const screenGame = document.getElementById('screen-game');
const screenGameOver = document.getElementById('screen-gameover');

// Lobby
const inputPlayerName = document.getElementById('input-player-name');
const inputRoomCode = document.getElementById('input-room-code');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnPlayVsBot = document.getElementById('btn-play-vs-bot');
const btnJoinRoom = document.getElementById('btn-join-room');
const avatarSelector = document.getElementById('avatar-selector');

// Modo Invitación
const inviteBanner = document.getElementById('invite-banner');
const inviteRoomCodeBadge = document.getElementById('invite-room-code-badge');
const inviteActionsBox = document.getElementById('invite-actions-box');
const standardActionsBox = document.getElementById('standard-actions-box');
const btnQuickJoin = document.getElementById('btn-quick-join');
const btnSwitchToCreate = document.getElementById('btn-switch-to-create');

// Espera
const lobbyWaitingArea = document.getElementById('lobby-waiting-area');
const lobbyRoomCodeText = document.getElementById('lobby-room-code-text');
const btnWhatsappInvite = document.getElementById('btn-whatsapp-invite');
const btnCopyRoomLink = document.getElementById('btn-copy-room-link');
const lobbyPlayersList = document.getElementById('lobby-players-list');
const btnAddBot = document.getElementById('btn-add-bot');
const btnStartGame = document.getElementById('btn-start-game');

// Mesa de Juego
const gameRoomCode = document.getElementById('game-room-code');
const deckCounter = document.getElementById('deck-counter');
const deckPile = document.getElementById('deck-pile');
const opponentsContainer = document.getElementById('opponents-container');
const turnDrawnCards = document.getElementById('turn-drawn-cards');
const turnStatusBadge = document.getElementById('turn-status-badge');
const uniqueCounterText = document.getElementById('unique-counter-text');
const riskWarning = document.getElementById('risk-warning');
const btnSoundToggle = document.getElementById('btn-sound-toggle');
const btnLeaveGame = document.getElementById('btn-leave-game');
const modalLeaveGame = document.getElementById('modal-leave-game');
const leaveModalTitle = document.getElementById('leave-modal-title');
const leaveModalDesc = document.getElementById('leave-modal-desc');
const leaveActionsBox = document.getElementById('leave-actions-box');
const gameToastBanner = document.getElementById('game-toast-banner');
const deckConfigHint = document.getElementById('deck-config-hint');

// Acciones del jugador
const btnDrawCard = document.getElementById('btn-draw-card');
const btnStopTurn = document.getElementById('btn-stop-turn');
const mySafeScore = document.getElementById('my-safe-score');
const mySafeCount = document.getElementById('my-safe-count');
const myExposedCount = document.getElementById('my-exposed-count');

// Logs de eventos y reacciones
const gameLogsList = document.getElementById('game-logs-list');
const reactionButtons = document.querySelectorAll('.reaction-btn');

document.addEventListener('DOMContentLoaded', () => {
  buildAvatarSelector();

  // Si se entra por un enlace de invitación con ?room=...
  if (roomParam) {
    const cleanRoom = roomParam.trim().toUpperCase();
    inputRoomCode.value = cleanRoom;
    if (inviteRoomCodeBadge) inviteRoomCodeBadge.innerText = cleanRoom;
    if (inviteBanner) inviteBanner.style.display = 'flex';
    if (inviteActionsBox) inviteActionsBox.style.display = 'block';
    if (standardActionsBox) standardActionsBox.style.display = 'none';

    // Limpiar salas previas en caché que no coincidan con este link de invitación
    const previousSaved = sessionStorage.getItem('pelusa_active_room') || localStorage.getItem('pelusa_active_room');
    if (previousSaved && previousSaved.toUpperCase() !== cleanRoom) {
      sessionStorage.removeItem('pelusa_active_room');
      localStorage.removeItem('pelusa_active_room');
    }

    inputPlayerName.placeholder = 'Tu nombre o apodo';
    inputPlayerName.focus();
  }

  // Opción de cambiar a crear sala si el jugador lo desea
  if (btnSwitchToCreate) {
    btnSwitchToCreate.onclick = () => {
      if (inviteBanner) inviteBanner.style.display = 'none';
      if (inviteActionsBox) inviteActionsBox.style.display = 'none';
      if (standardActionsBox) standardActionsBox.style.display = 'block';
      window.history.replaceState({}, document.title, window.location.pathname);
    };
  }

  // Enter en el campo de texto envía la acción primaria correspondiente
  inputPlayerName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (inviteActionsBox && inviteActionsBox.style.display !== 'none') {
        if (btnQuickJoin) btnQuickJoin.click();
      } else {
        if (btnCreateRoom) btnCreateRoom.click();
      }
    }
  });

  inputRoomCode.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (btnJoinRoom) btnJoinRoom.click();
    }
  });

  document.body.addEventListener('click', () => sounds.init(), { once: true });

  if (btnSoundToggle) {
    btnSoundToggle.onclick = () => {
      sounds.muted = !sounds.muted;
      btnSoundToggle.innerText = sounds.muted ? '🔇' : '🔊';
    };
  }
});

function buildAvatarSelector() {
  avatarSelector.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('div');
    btn.className = `avatar-option ${i === selectedAvatar ? 'selected' : ''}`;
    btn.innerHTML = renderPelusaAvatar(i, { size: 'large' });
    btn.onclick = () => {
      selectedAvatar = i;
      document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
      btn.classList.add('selected');
    };
    avatarSelector.appendChild(btn);
  }
}

// --- Conexión y Reconexión Automática ---
socket.on('connect', () => {
  myPlayerId = socket.id;
  console.log('Conectado a Pelusas con ID:', myPlayerId);

  // Intentar reconectar si se regresa de WhatsApp o se refresca la página
  // Pero SOLO si no estamos en una pantalla con link de invitación a OTRA sala
  const currentUrlParam = new URLSearchParams(window.location.search).get('room');
  const savedRoom = sessionStorage.getItem('pelusa_active_room') || localStorage.getItem('pelusa_active_room');

  if (savedRoom && (!currentUrlParam || currentUrlParam.toUpperCase() === savedRoom.toUpperCase())) {
    socket.emit('reconnect_session', { roomCode: savedRoom, playerToken });
  }
});

socket.on('reconnect_success', ({ state }) => {
  currentRoom = state;
  console.log('Reconexión exitosa a la sala:', state.code);
  sessionStorage.setItem('pelusa_active_room', state.code);
  localStorage.setItem('pelusa_active_room', state.code);

  if (state.status === 'playing') {
    renderGame(state);
  } else if (state.status === 'lobby') {
    showLobbyWaiting(state.code);
    updateLobbyPlayers(state.players, state.hostId, state.hostToken);
  }
});

socket.on('reconnect_failed', () => {
  sessionStorage.removeItem('pelusa_active_room');
  localStorage.removeItem('pelusa_active_room');
  document.getElementById('lobby-form-area').style.display = 'block';
  lobbyWaitingArea.style.display = 'none';
});

socket.on('room_created', ({ roomCode, state }) => {
  currentRoom = state;
  sessionStorage.setItem('pelusa_active_room', roomCode);
  localStorage.setItem('pelusa_active_room', roomCode);
  if (state.status === 'playing') {
    renderGame(state);
  } else {
    showLobbyWaiting(roomCode);
    updateLobbyPlayers(state.players, state.hostId, state.hostToken);
  }
});

socket.on('room_joined_success', ({ roomCode, state, playerToken: updatedToken }) => {
  if (updatedToken) {
    playerToken = updatedToken;
    sessionStorage.setItem('pelusa_player_token', playerToken);
  }
  currentRoom = state;
  sessionStorage.setItem('pelusa_active_room', roomCode);
  localStorage.setItem('pelusa_active_room', roomCode);
  showLobbyWaiting(roomCode);
  updateLobbyPlayers(state.players, state.hostId, state.hostToken);
});

socket.on('room_state', (state) => {
  currentRoom = state;
  sessionStorage.setItem('pelusa_active_room', state.code);
  localStorage.setItem('pelusa_active_room', state.code);

  if (state.status === 'lobby') {
    showLobbyWaiting(state.code);
    updateLobbyPlayers(state.players, state.hostId, state.hostToken);
  } else if (state.status === 'playing') {
    renderGame(state);
  } else if (state.status === 'gameover') {
    renderGameOver(state);
  }
});

socket.on('game_started', (state) => {
  if (state && state.status === 'playing') {
    renderGame(state);
  }
});

socket.on('player_joined', (state) => {
  if (state && state.players) {
    updateLobbyPlayers(state.players, state.hostId, state.hostToken);
  }
});

socket.on('card_drawn', ({ card, busted, gameEnded }) => {
  if (busted) {
    sounds.playBust();
    triggerScreenShake();
  } else {
    sounds.playDraw();
  }
});

socket.on('cards_stolen', (res) => {
  sounds.playSteal();

  const isMeVictim = res.targetId === myPlayerId || (res.targetToken && res.targetToken === playerToken);
  const isMeThief = res.thiefId === myPlayerId || (res.thiefToken && res.thiefToken === playerToken);

  if (isMeVictim) {
    triggerScreenShake();
    showToastBanner(`🚨 ¡<strong>${escapeHtml(res.thiefName || 'Un rival')}</strong> te ha robado ${res.stolenCount > 1 ? res.stolenCount + ' cartas' : 'tu carta'} de valor <strong>${res.value}</strong>!`);

    // Animación de flash en la carta robada
    document.querySelectorAll(`.card-val-my-${res.value}, .card-val-target-${res.value}`).forEach(el => {
      el.classList.add('card-stolen-flash');
    });
  } else if (isMeThief) {
    showToastBanner(`😈 ¡Le robaste ${res.stolenCount > 1 ? res.stolenCount + ' cartas' : 'su carta'} de valor <strong>${res.value}</strong> a <strong>${escapeHtml(res.targetName || 'tu rival')}</strong>!`);
  } else {
    showToastBanner(`⚡ <strong>${escapeHtml(res.thiefName || 'Un jugador')}</strong> le robó a <strong>${escapeHtml(res.targetName || 'otro')}</strong> su Pelusa <strong>${res.value}</strong>`);
  }
});

socket.on('turn_stopped', () => {
  sounds.playStop();
});

socket.on('player_reaction', ({ playerId, emoji }) => {
  triggerPlayerReaction(playerId, emoji);
});

socket.on('error_msg', ({ message }) => {
  alert(message);
  if (btnQuickJoin) {
    btnQuickJoin.disabled = false;
    btnQuickJoin.innerHTML = '<span>🚀 ¡Unirme a la Partida de Pelusas!</span>';
  }
  if (btnJoinRoom) {
    btnJoinRoom.disabled = false;
  }
  if (btnCreateRoom) {
    btnCreateRoom.disabled = false;
    btnCreateRoom.innerHTML = '<span>✨ Crear Sala Multijugador</span>';
  }
  if (btnPlayVsBot) {
    btnPlayVsBot.disabled = false;
    btnPlayVsBot.innerHTML = '<span>🤖 Jugar contra la Máquina (1 vs 1)</span>';
  }
});

// --- Acciones de Lobby ---
function executeJoin(code) {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    alert('Ingresa el código de la sala');
    return;
  }
  const name = inputPlayerName.value.trim() || 'Jugador ' + Math.floor(Math.random() * 90 + 10);

  if (btnQuickJoin) {
    btnQuickJoin.disabled = true;
    btnQuickJoin.innerText = '⏳ Entrando a la sala...';
  }
  if (btnJoinRoom) {
    btnJoinRoom.disabled = true;
  }

  socket.emit('join_room', {
    roomCode: cleanCode,
    playerName: name,
    avatar: selectedAvatar,
    playerToken
  });
}

btnCreateRoom.onclick = () => {
  const name = inputPlayerName.value.trim() || 'Jugador 1';
  btnCreateRoom.disabled = true;
  btnCreateRoom.innerText = '⏳ Creando sala...';
  socket.emit('create_room', { playerName: name, avatar: selectedAvatar, playerToken });
};

if (btnPlayVsBot) {
  btnPlayVsBot.onclick = () => {
    const name = inputPlayerName.value.trim() || 'Jugador 1';
    btnPlayVsBot.disabled = true;
    btnPlayVsBot.innerText = '🤖 Preparando partida...';
    socket.emit('play_vs_bot', {
      playerName: name,
      avatar: selectedAvatar,
      playerToken,
      deckSize: 50
    });
  };
}

if (btnAddBot) {
  btnAddBot.onclick = () => {
    socket.emit('add_bot');
  };
}

window.removeBotFromLobby = function(botId) {
  socket.emit('remove_bot', { botId });
};

if (btnQuickJoin) {
  btnQuickJoin.onclick = () => {
    const code = inputRoomCode.value || roomParam;
    executeJoin(code);
  };
}

btnJoinRoom.onclick = () => {
  executeJoin(inputRoomCode.value);
};

function showLobbyWaiting(code) {
  document.getElementById('lobby-form-area').style.display = 'none';
  lobbyWaitingArea.style.display = 'block';
  lobbyRoomCodeText.innerText = code;

  const shareUrl = `${window.location.origin}/?room=${code}`;
  const whatsappMsg = `¡Únete a mi partida de Pelusas en Juegos AlanMath! 🎲🃏\nPulsa aquí para entrar a la sala:\n${shareUrl}`;
  btnWhatsappInvite.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`;

  btnCopyRoomLink.onclick = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      const originalText = btnCopyRoomLink.innerText;
      btnCopyRoomLink.innerText = '✅ ¡Copiado!';
      setTimeout(() => btnCopyRoomLink.innerText = originalText, 2000);
    });
  };
}

function updateLobbyPlayers(players, hostId, hostToken) {
  lobbyPlayersList.innerHTML = '';
  const playerCountEl = document.getElementById('player-count');
  if (playerCountEl) {
    playerCountEl.innerText = players.length;
  }

  const isMeHost = hostId === myPlayerId || (hostToken && playerToken === hostToken);

  if (btnAddBot) {
    btnAddBot.style.display = isMeHost && players.length < 5 ? 'inline-flex' : 'none';
  }

  players.forEach(p => {
    const isHost = p.id === hostId || (hostToken && p.token === hostToken);
    const isMe = p.id === myPlayerId || p.token === playerToken;
    const item = document.createElement('div');
    item.className = 'lobby-player-card';
    item.innerHTML = `
      <div class="player-avatar-mini">${renderPelusaAvatar(p.avatar || 1, { size: 'tiny' })}</div>
      <div class="player-info">
        <span class="player-name">${escapeHtml(p.name)} ${isMe ? '<small>(Tú)</small>' : ''}</span>
        ${p.isBot ? '<span class="badge-bot">🤖 Bot</span>' : ''}
        ${isHost ? '<span class="badge-host">👑 Anfitrión</span>' : ''}
      </div>
      ${isMeHost && p.isBot ? `<button class="btn-remove-bot" onclick="window.removeBotFromLobby('${p.id}')" title="Quitar este bot">✖ Quitar</button>` : ''}
    `;
    lobbyPlayersList.appendChild(item);
  });

  btnStartGame.style.display = isMeHost ? 'block' : 'none';
  btnStartGame.disabled = players.length < 2;

  if (players.length < 2 && isMeHost) {
    btnStartGame.innerText = '⏳ Esperando jugadores (mínimo 2 o agrega un Bot)...';
    btnStartGame.classList.remove('btn-ready-pulse');
  } else if (isMeHost) {
    btnStartGame.innerText = `🚀 ¡Iniciar Partida (${players.length} jugadores)!`;
    btnStartGame.classList.add('btn-ready-pulse');
  }

  updateDeckPresetButtons(currentRoom?.deckSize || 110, isMeHost);
}

btnStartGame.onclick = () => {
  btnStartGame.disabled = true;
  btnStartGame.innerText = 'Iniciando partida...';
  socket.emit('start_game');
};

// --- Renderizado del Juego ---
function renderGame(state) {
  screenLobby.style.display = 'none';
  screenGameOver.style.display = 'none';
  screenGame.style.display = 'flex';

  gameRoomCode.innerText = state.code;
  deckCounter.innerText = `${state.deckCount} / ${state.initialDeckCount || state.deckSize || 110}`;

  const activePlayer = state.players[state.currentTurnIndex];
  const isMyTurn = state.isMyTurn;

  if (state.turnState.isBusted) {
    turnStatusBadge.className = 'turn-badge turn-busted';
    turnStatusBadge.innerHTML = '💨 ¡CORRIENTE DE AIRE! Pasando turno...';
  } else if (isMyTurn) {
    turnStatusBadge.className = 'turn-badge my-turn';
    turnStatusBadge.innerHTML = '⭐ ¡ES TU TURNO! Elige tu jugada';
  } else {
    turnStatusBadge.className = 'turn-badge';
    const isBotTurn = activePlayer && activePlayer.isBot;
    turnStatusBadge.innerHTML = `Turno de <strong>${escapeHtml(activePlayer ? activePlayer.name : '')}</strong>${isBotTurn ? ' 🤖 <em>(pensando...)</em>' : ''}...`;
  }

  // Renderizar oponentes con cartas tocables para robar
  renderOpponents(state.players, state.currentTurnIndex, isMyTurn, state.validStealValue);

  // Mis datos
  const me = state.players.find(p => p.id === myPlayerId || p.token === playerToken);
  if (me) {
    mySafeScore.innerText = me.safeScore;
    mySafeCount.innerText = me.safeCount;
    myExposedCount.innerText = me.exposedCards.length;
    renderMyDockExposedCards(me.exposedCards);
  }

  // Cartas del turno con animación FLIP & Hero
  renderTurnCards(state.turnState.drawnThisTurn, state.turnState.lastDrawnCard, state.turnState.isBusted, state.currentTurnIndex);

  // Contador de números diferentes
  const uniqueNumbers = new Set(state.turnState.drawnThisTurn.map(c => c.value));
  const uniqueCount = uniqueNumbers.size;
  uniqueCounterText.innerText = `${uniqueCount} / 3`;

  // Alerta de riesgo (colocada al lado derecho del mazo)
  const arenaHint = document.getElementById('arena-hint');
  if (uniqueCount >= 3) {
    riskWarning.style.display = 'block';
    riskWarning.innerHTML = '⚠️ ¡Riesgo! Repetir = perder';
    if (arenaHint) arenaHint.style.display = 'none';
  } else {
    riskWarning.style.display = 'none';
    if (arenaHint) arenaHint.style.display = 'block';
  }

  // Botones de acción (respetando animación de vuelo de carta)
  if (!isAnimatingCard) {
    btnDrawCard.disabled = !isMyTurn || state.deckCount === 0 || state.turnState.isBusted;
    btnStopTurn.disabled = !isMyTurn || !state.turnState.canStop || state.turnState.isBusted;
  }

  if (isMyTurn && uniqueCount >= 3) {
    btnDrawCard.classList.add('btn-risk');
    btnDrawCard.innerHTML = '⚡ Arriesgar (Robar Carta)';
    btnStopTurn.classList.add('btn-safe-pulse');
  } else {
    btnDrawCard.classList.remove('btn-risk');
    btnDrawCard.innerHTML = '🃏 Robar Pelusa';
    btnStopTurn.classList.remove('btn-safe-pulse');
  }

  renderLogs(state.logs);
}

function renderOpponents(players, activeTurnIndex, isMyTurn, validStealValue) {
  opponentsContainer.innerHTML = '';

  players.forEach((p, idx) => {
    const isMe = p.id === myPlayerId || p.token === playerToken;
    const isHisTurn = idx === activeTurnIndex;
    const card = document.createElement('div');
    card.id = `player-card-${p.id}`;
    card.className = `opponent-box ${isMe ? 'is-me-box' : ''} ${isHisTurn ? 'active-turn' : ''} ${!p.connected ? 'disconnected' : ''}`;

    const exposedGroups = {};
    p.exposedCards.forEach(c => {
      exposedGroups[c.value] = (exposedGroups[c.value] || 0) + 1;
    });

    let exposedCardsHtml = '';
    const values = Object.keys(exposedGroups).sort((a,b) => a - b);
    if (values.length === 0) {
      exposedCardsHtml = '<div class="no-cards-note">Sin cartas expuestas</div>';
    } else {
      values.forEach(v => {
        const valNum = Number(v);
        // La carta es robable si es mi turno, no es mi propia carta, y coincide con la sacada
        const isClickable = isMyTurn && !isMe && validStealValue === valNum;
        exposedCardsHtml += `
          <div class="stealable-card-target ${isClickable ? 'can-steal-touch' : ''} card-val-target-${valNum}" 
               ${!isMe ? `onclick="handleStealCard('${p.id}', ${valNum})"` : ''} 
               title="${isClickable ? '¡Toca para robarle esta carta!' : (isMe ? 'Tu carta abierta en riesgo' : '')}">
            ${renderPelusaCard(valNum, { size: 'mini', badge: exposedGroups[v], isClickable })}
          </div>
        `;
      });
    }

    card.innerHTML = `
      <div class="opponent-header">
        <div class="opp-avatar">${renderPelusaAvatar(p.avatar || 1, { size: 'normal' })}</div>
        <div class="opp-info">
          <div class="opp-name">${escapeHtml(p.name)} ${isMe ? '<span class="badge-me">(Tú)</span>' : ''} ${p.isBot ? '<span class="badge-bot">🤖 Bot</span>' : ''} ${isHisTurn ? '<span class="playing-indicator">🎯 Jugando</span>' : ''}</div>
          <div class="opp-score">🔒 ${p.safeScore} pts (${p.safeCount} cartas)</div>
        </div>
      </div>
      <div class="opp-exposed-section">
        <div class="section-title">${isMe ? 'Tus cartas expuestas:' : 'Cartas expuestas:'}</div>
        <div class="opp-exposed-cards">${exposedCardsHtml}</div>
      </div>
    `;

    opponentsContainer.appendChild(card);
  });
}

function renderMyDockExposedCards(cards) {
  const container = document.getElementById('my-dock-exposed-cards');
  if (!container) return;

  if (!cards || cards.length === 0) {
    container.innerHTML = '<span class="no-exposed-hint">Sin cartas abiertas</span>';
    return;
  }

  const groups = {};
  cards.forEach(c => {
    groups[c.value] = (groups[c.value] || 0) + 1;
  });

  const uniqueVals = Object.keys(groups).sort((a,b) => a - b);
  container.innerHTML = '';
  uniqueVals.forEach(v => {
    const valNum = Number(v);
    const wrap = document.createElement('div');
    wrap.className = `my-dock-card-item card-val-my-${valNum}`;
    wrap.title = `Tu Pelusa ${valNum} (en riesgo)`;
    wrap.innerHTML = renderPelusaCard(valNum, { size: 'mini', badge: groups[v] });
    container.appendChild(wrap);
  });
}

// Acción de robo manual al tocar la carta de un rival
window.handleStealCard = function(targetId, value) {
  if (!currentRoom || !currentRoom.isMyTurn) return;

  if (currentRoom.validStealValue !== value) {
    // Si intenta tocar una carta que no corresponde con la que acaba de sacar
    sounds.playBust();
    return;
  }

  // Ejecutar robo
  socket.emit('steal_cards', { targetId, value });
};

function renderTurnCardsStatic(cards) {
  turnDrawnCards.innerHTML = '';
  if (!cards || cards.length === 0) {
    turnDrawnCards.innerHTML = '<div class="empty-turn-notice">Roba tu primera carta del montón central...</div>';
    return;
  }

  const groups = {};
  cards.forEach(c => {
    groups[c.value] = (groups[c.value] || 0) + 1;
  });

  const uniqueVals = Object.keys(groups).sort((a,b) => a - b);
  uniqueVals.forEach(v => {
    const cardVal = Number(v);
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'turn-card-stack';
    cardWrapper.setAttribute('data-value', cardVal);
    cardWrapper.innerHTML = renderPelusaCard(cardVal, { size: 'medium', badge: groups[v] });
    turnDrawnCards.appendChild(cardWrapper);
  });
}

function renderTurnCards(cards, lastDrawnCard, isBusted, turnIndex) {
  // Si cambió el turno a otro jugador, resetear historial
  if (previousTurnIndex !== turnIndex) {
    previousTurnIndex = turnIndex;
    previousTurnCards = [];
  }

  // Si es la primera vez que se renderiza el juego (recarga o entrada directa), renderizar sin animación
  if (isFirstGameRender) {
    isFirstGameRender = false;
    previousTurnCards = [...(cards || [])];
    renderTurnCardsStatic(cards);
    return;
  }

  // Caso: CORRIENTE DE AIRE (Busted)
  if (isBusted && lastDrawnCard) {
    previousTurnCards = [];
    isAnimatingCard = true;
    btnDrawCard.disabled = true;
    btnStopTurn.disabled = true;

    // Mostrar la carta repetida culpable grande en el centro con aura roja
    const deckPileEl = document.getElementById('deck-pile');
    const deckRect = deckPileEl ? deckPileEl.getBoundingClientRect() : { left: window.innerWidth / 2 - 40, top: 100, width: 80, height: 112 };

    const bustClone = document.createElement('div');
    bustClone.className = 'flying-card-clone bust-reveal-card';
    bustClone.innerHTML = renderPelusaCard(lastDrawnCard.value, { size: 'large' });
    bustClone.style.position = 'fixed';
    bustClone.style.left = `${window.innerWidth / 2 - 50}px`;
    bustClone.style.top = `${deckRect.bottom + 15}px`;
    bustClone.style.transform = 'scale(1.4)';
    bustClone.style.zIndex = '1000';
    bustClone.style.border = '2px solid #ef4444';
    document.body.appendChild(bustClone);

    // Viento que barre las cartas
    turnDrawnCards.querySelectorAll('.turn-card-stack').forEach(el => {
      el.classList.add('card-wind-bust');
    });

    setTimeout(() => {
      bustClone.classList.add('card-wind-bust');
      setTimeout(() => {
        bustClone.remove();
        turnDrawnCards.innerHTML = '<div class="empty-turn-notice">💨 ¡Corriente de aire! Cartas devueltas al montón</div>';
        isAnimatingCard = false;
      }, 700);
    }, 600);

    return;
  }

  // Si no hay cartas
  if (!cards || cards.length === 0) {
    previousTurnCards = [];
    renderTurnCardsStatic(cards);
    return;
  }

  // Detectar si se ha sacado una nueva carta en este turno
  const isNewCardDrawn = cards.length === previousTurnCards.length + 1 && lastDrawnCard;

  if (!isNewCardDrawn) {
    previousTurnCards = [...cards];
    renderTurnCardsStatic(cards);
    return;
  }

  const newCardVal = Number(lastDrawnCard.value);
  const wasAlreadyPresent = previousTurnCards.some(c => c.value === newCardVal);
  previousTurnCards = [...cards];

  // =========================================================================
  // CASO A: NUEVO NÚMERO DIFERENTE (Animación FLIP: cartas se abren y la nueva entra grande)
  // =========================================================================
  if (!wasAlreadyPresent) {
    // 1. Guardar posiciones actuales de las cartas existentes
    const oldPositions = {};
    turnDrawnCards.querySelectorAll('.turn-card-stack').forEach(el => {
      const v = el.getAttribute('data-value');
      if (v) oldPositions[v] = el.getBoundingClientRect();
    });

    // 2. Renderizar todas las cartas ordenadas (incluida la nueva)
    const groups = {};
    cards.forEach(c => { groups[c.value] = (groups[c.value] || 0) + 1; });
    const uniqueVals = Object.keys(groups).sort((a,b) => a - b);

    turnDrawnCards.innerHTML = '';
    const newElements = {};

    uniqueVals.forEach(v => {
      const cardVal = Number(v);
      const cardWrapper = document.createElement('div');
      cardWrapper.className = 'turn-card-stack';
      cardWrapper.setAttribute('data-value', cardVal);
      cardWrapper.innerHTML = renderPelusaCard(cardVal, { size: 'medium', badge: groups[v] });
      if (cardVal === newCardVal) {
        cardWrapper.classList.add('new-card-entering');
      }
      turnDrawnCards.appendChild(cardWrapper);
      newElements[cardVal] = cardWrapper;
    });

    // 3. Medir nuevas posiciones
    const newPositions = {};
    Object.keys(newElements).forEach(v => {
      newPositions[v] = newElements[v].getBoundingClientRect();
    });

    // 4. Invertir las cartas existentes (mantenerlas visualmente donde estaban antes)
    Object.keys(oldPositions).forEach(v => {
      if (oldPositions[v] && newPositions[v] && newElements[v]) {
        const deltaX = oldPositions[v].left - newPositions[v].left;
        if (Math.abs(deltaX) > 0.5) {
          newElements[v].style.transform = `translateX(${deltaX}px)`;
          newElements[v].style.transition = 'none';
        }
      }
    });

    // 5. Invertir la NUEVA carta (comienza grande en el mazo central)
    const deckPileEl = document.getElementById('deck-pile');
    const deckRect = deckPileEl ? deckPileEl.getBoundingClientRect() : { left: window.innerWidth / 2 - 40, top: 100, width: 80, height: 112 };
    const targetEl = newElements[newCardVal];
    const targetRect = newPositions[newCardVal];

    if (targetEl && targetRect) {
      const deltaX = (deckRect.left + deckRect.width / 2) - (targetRect.left + targetRect.width / 2);
      const deltaY = (deckRect.top + deckRect.height / 2) - (targetRect.top + targetRect.height / 2);

      targetEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.42)`;
      targetEl.style.zIndex = '60';
      targetEl.style.boxShadow = '0 14px 35px rgba(0, 0, 0, 0.75), 0 0 30px rgba(56, 189, 248, 0.95)';
      targetEl.style.transition = 'none';
    }

    // Forzar reflow en el navegador
    void turnDrawnCards.offsetWidth;

    isAnimatingCard = true;
    btnDrawCard.disabled = true;
    btnStopTurn.disabled = true;

    // 6. Ejecutar la animación: después de 200ms de verse grande en el mazo, se desliza al hueco
    setTimeout(() => {
      // Las demás cartas se deslizan suavemente abriendo el espacio ordenado
      Object.keys(oldPositions).forEach(v => {
        const el = newElements[v];
        if (el) {
          el.style.transition = 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)';
          el.style.transform = 'translateX(0)';
        }
      });

      // La nueva carta viaja hacia su hueco y adopta su tamaño normal
      if (targetEl) {
        targetEl.style.transition = 'transform 0.52s cubic-bezier(0.34, 1.25, 0.64, 1), box-shadow 0.4s ease';
        targetEl.style.transform = 'translate(0, 0) scale(1)';
        targetEl.style.boxShadow = '';
      }

      // Al aterrizar (550ms después)
      setTimeout(() => {
        sounds.playPlace();
        if (targetEl) {
          targetEl.style.transition = '';
          targetEl.style.transform = '';
          targetEl.style.zIndex = '';
          targetEl.style.boxShadow = '';
          targetEl.classList.remove('new-card-entering');
        }
        Object.keys(oldPositions).forEach(v => {
          const el = newElements[v];
          if (el) {
            el.style.transition = '';
            el.style.transform = '';
          }
        });

        isAnimatingCard = false;
        syncActionButtons();
      }, 550);
    }, 200);

    return;
  }

  // =========================================================================
  // CASO B: CARTA REPETIDA QUE SUMA A UNA PILA (x2, x3...)
  // =========================================================================
  renderTurnCardsStatic(cards);
  const targetStack = turnDrawnCards.querySelector(`.turn-card-stack[data-value="${newCardVal}"]`);
  if (targetStack) {
    const targetRect = targetStack.getBoundingClientRect();
    const deckPileEl = document.getElementById('deck-pile');
    const deckRect = deckPileEl ? deckPileEl.getBoundingClientRect() : { left: window.innerWidth / 2 - 40, top: 100, width: 80, height: 112 };

    // Crear clon volador que aparece grande en el mazo
    const clone = document.createElement('div');
    clone.className = 'flying-card-clone';
    clone.innerHTML = renderPelusaCard(newCardVal, { size: 'medium' });
    clone.style.position = 'fixed';
    clone.style.left = `${deckRect.left}px`;
    clone.style.top = `${deckRect.top}px`;
    clone.style.width = `${targetRect.width}px`;
    clone.style.transform = 'scale(1.42)';
    clone.style.zIndex = '1000';
    clone.style.transition = 'none';
    document.body.appendChild(clone);

    isAnimatingCard = true;
    btnDrawCard.disabled = true;
    btnStopTurn.disabled = true;

    setTimeout(() => {
      clone.style.transition = 'all 0.48s cubic-bezier(0.34, 1.25, 0.64, 1)';
      clone.style.left = `${targetRect.left}px`;
      clone.style.top = `${targetRect.top}px`;
      clone.style.transform = 'scale(1)';

      setTimeout(() => {
        clone.remove();
        sounds.playPlace();
        targetStack.classList.add('card-bump-merge');
        const badge = targetStack.querySelector('.card-count-badge');
        if (badge) badge.classList.add('badge-pop-in');

        setTimeout(() => {
          targetStack.classList.remove('card-bump-merge');
          isAnimatingCard = false;
          syncActionButtons();
        }, 400);
      }, 480);
    }, 200);
  }
}

function syncActionButtons() {
  if (!currentRoom) return;
  const isMyTurn = currentRoom.isMyTurn;
  const canStop = currentRoom.turnState ? currentRoom.turnState.canStop : false;
  const isBusted = currentRoom.turnState ? currentRoom.turnState.isBusted : false;
  btnDrawCard.disabled = !isMyTurn || currentRoom.deckCount === 0 || isBusted || isAnimatingCard;
  btnStopTurn.disabled = !isMyTurn || !canStop || isBusted || isAnimatingCard;
}

function renderLogs(logs) {
  gameLogsList.innerHTML = '';
  logs.forEach(l => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="log-time">${l.time}</span> <span class="log-text">${escapeHtml(l.msg)}</span>`;
    gameLogsList.appendChild(li);
  });
}

btnDrawCard.onclick = () => {
  if (isAnimatingCard) return;
  socket.emit('draw_card');
};

deckPile.onclick = () => {
  if (isAnimatingCard) return;
  if (!btnDrawCard.disabled) {
    socket.emit('draw_card');
  }
};

btnStopTurn.onclick = () => {
  if (isAnimatingCard) return;
  socket.emit('stop_turn');
};

reactionButtons.forEach(btn => {
  btn.onclick = () => {
    const emoji = btn.getAttribute('data-emoji');
    socket.emit('send_reaction', { emoji });
  };
});

function triggerPlayerReaction(playerId, emoji) {
  let targetBox = document.getElementById(`player-card-${playerId}`);
  if (playerId === myPlayerId) {
    targetBox = document.getElementById('my-player-dock');
  }
  if (!targetBox) return;

  const bubble = document.createElement('div');
  bubble.className = 'reaction-bubble';
  bubble.innerText = emoji;
  targetBox.appendChild(bubble);

  setTimeout(() => bubble.remove(), 2200);
}

function triggerScreenShake() {
  document.body.classList.add('screen-shake');
  setTimeout(() => document.body.classList.remove('screen-shake'), 600);
}

function renderGameOver(state) {
  screenGame.style.display = 'none';
  screenGameOver.style.display = 'flex';
  sounds.playVictory();

  const podium = document.getElementById('podium-list');
  podium.innerHTML = '';

  const ranked = [...state.players].sort((a,b) => b.score - a.score);
  ranked.forEach((p, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎖️';
    const row = document.createElement('div');
    row.className = `podium-row place-${index + 1} ${p.id === myPlayerId ? 'my-row' : ''}`;
    row.innerHTML = `
      <div class="podium-rank">${medal} #${index + 1}</div>
      <div class="podium-avatar">${renderPelusaAvatar(p.avatar || 1, { size: 'tiny' })}</div>
      <div class="podium-name">${escapeHtml(p.name)} ${p.id === myPlayerId ? '(Tú)' : ''}</div>
      <div class="podium-score">${p.score} pts</div>
    `;
    podium.appendChild(row);
  });

  document.getElementById('btn-play-again').onclick = () => {
    sessionStorage.removeItem('pelusa_active_room');
    localStorage.removeItem('pelusa_active_room');
    window.location.reload();
  };
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

// --- Control del tamaño del mazo (duración) en el Lobby ---
function updateDeckPresetButtons(deckSize, isHost) {
  const buttons = document.querySelectorAll('.preset-btn');
  buttons.forEach(btn => {
    const size = Number(btn.getAttribute('data-size'));
    if (size === deckSize) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
    btn.disabled = !isHost;
  });
  if (deckConfigHint) {
    deckConfigHint.innerText = isHost ? 'Configura antes de iniciar' : 'Elegido por el anfitrión';
  }
}

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.onclick = () => {
    if (!currentRoom || !currentRoom.isHost) return;
    const deckSize = Number(btn.getAttribute('data-size'));
    socket.emit('set_deck_size', { deckSize });
  };
});

// --- Modal de Salir / Finalizar Partida Amablemente ---
if (btnLeaveGame) {
  btnLeaveGame.onclick = () => {
    openLeaveModal();
  };
}

function openLeaveModal() {
  if (!modalLeaveGame) return;
  const isHost = currentRoom && currentRoom.isHost;

  leaveActionsBox.innerHTML = '';

  if (isHost) {
    leaveModalTitle.innerText = '👑 Opciones de la Partida';
    leaveModalDesc.innerText = 'Como anfitrión puedes finalizar la partida ahora mismo para ver el podio con las puntuaciones actuales, o retirarte cordialmente de la sala.';

    // Botón: Finalizar partida y ver podio
    const btnEnd = document.createElement('button');
    btnEnd.className = 'btn btn-primary';
    btnEnd.innerHTML = '🏁 Finalizar Partida y Ver Podio';
    btnEnd.onclick = () => {
      modalLeaveGame.style.display = 'none';
      socket.emit('host_end_game');
    };
    leaveActionsBox.appendChild(btnEnd);

    // Botón: Retirarme amablemente
    const btnLeave = document.createElement('button');
    btnLeave.className = 'btn btn-danger';
    btnLeave.innerHTML = '👋 Salir de la Sala ("Lo siento, me tengo que ir")';
    btnLeave.onclick = () => {
      modalLeaveGame.style.display = 'none';
      socket.emit('leave_game', { message: 'Lo siento, tengo que irme' });
    };
    leaveActionsBox.appendChild(btnLeave);

    // Botón: Cancelar
    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-secondary';
    btnCancel.innerText = 'Continuar Jugando';
    btnCancel.onclick = () => {
      modalLeaveGame.style.display = 'none';
    };
    leaveActionsBox.appendChild(btnCancel);
  } else {
    leaveModalTitle.innerText = '👋 ¿Deseas retirarte de la partida?';
    leaveModalDesc.innerText = 'Se avisará cordialmente a los demás jugadores: "Lo siento, tengo que irme. ¡Gracias por la partida!". Tus cartas expuestas volverán al montón de polvo.';

    // Botón: Retirarme amablemente
    const btnLeave = document.createElement('button');
    btnLeave.className = 'btn btn-danger';
    btnLeave.innerHTML = '👋 Sí, retirarme ("Lo siento, tengo que irme")';
    btnLeave.onclick = () => {
      modalLeaveGame.style.display = 'none';
      socket.emit('leave_game', { message: 'Lo siento, tengo que irme' });
    };
    leaveActionsBox.appendChild(btnLeave);

    // Botón: Cancelar
    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-secondary';
    btnCancel.innerText = 'Seguir Jugando';
    btnCancel.onclick = () => {
      modalLeaveGame.style.display = 'none';
    };
    leaveActionsBox.appendChild(btnCancel);
  }

  modalLeaveGame.style.display = 'flex';
}

function showToastBanner(msg) {
  if (!gameToastBanner) return;
  gameToastBanner.innerHTML = msg;
  gameToastBanner.style.display = 'flex';
  setTimeout(() => {
    gameToastBanner.style.display = 'none';
  }, 4200);
}

socket.on('player_left_friendly', ({ playerName, message }) => {
  sounds.playDraw();
  showToastBanner(`👋 <strong>${escapeHtml(playerName)}</strong>: "${escapeHtml(message || 'Lo siento, tengo que irme')}"`);
});

socket.on('left_game_success', () => {
  sessionStorage.removeItem('pelusa_active_room');
  localStorage.removeItem('pelusa_active_room');
  screenGame.style.display = 'none';
  screenGameOver.style.display = 'none';
  screenLobby.style.display = 'flex';
  document.getElementById('lobby-form-area').style.display = 'block';
  lobbyWaitingArea.style.display = 'none';
  if (modalLeaveGame) modalLeaveGame.style.display = 'none';
});

socket.on('deck_size_updated', ({ deckSize }) => {
  const isHost = currentRoom && currentRoom.isHost;
  updateDeckPresetButtons(deckSize, isHost);
});
