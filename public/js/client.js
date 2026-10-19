/**
 * Cliente de juego Pelusas - Socket.io & Manejo de Interfaz
 * Reconexión de sesiones móviles y robo manual tocando cartas del rival
 */

const socket = io();

// Token persistente del jugador para que no pierda la partida al cambiar a WhatsApp
let playerToken = localStorage.getItem('pelusa_player_token');
if (!playerToken) {
  playerToken = 'p_' + Math.random().toString(36).substring(2, 11);
  localStorage.setItem('pelusa_player_token', playerToken);
}

let myPlayerId = null;
let currentRoom = null;
let selectedAvatar = 1;

// Elementos DOM
const screenLobby = document.getElementById('screen-lobby');
const screenGame = document.getElementById('screen-game');
const screenGameOver = document.getElementById('screen-gameover');

// Lobby
const inputPlayerName = document.getElementById('input-player-name');
const inputRoomCode = document.getElementById('input-room-code');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const avatarSelector = document.getElementById('avatar-selector');

// Espera
const lobbyWaitingArea = document.getElementById('lobby-waiting-area');
const lobbyRoomCodeText = document.getElementById('lobby-room-code-text');
const btnWhatsappInvite = document.getElementById('btn-whatsapp-invite');
const btnCopyRoomLink = document.getElementById('btn-copy-room-link');
const lobbyPlayersList = document.getElementById('lobby-players-list');
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

  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    inputRoomCode.value = roomParam.toUpperCase();
    inputPlayerName.focus();
  }

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

  // Intentar reconectar si se regresa de WhatsApp
  const savedRoom = localStorage.getItem('pelusa_active_room');
  if (savedRoom) {
    socket.emit('reconnect_session', { roomCode: savedRoom, playerToken });
  }
});

socket.on('reconnect_success', ({ state }) => {
  currentRoom = state;
  console.log('Reconexión exitosa a la sala:', state.code);
  if (state.status === 'playing') {
    renderGame(state);
  } else if (state.status === 'lobby') {
    showLobbyWaiting(state.code);
    updateLobbyPlayers(state.players, state.hostId);
  }
});

socket.on('room_created', ({ roomCode, state }) => {
  currentRoom = state;
  localStorage.setItem('pelusa_active_room', roomCode);
  showLobbyWaiting(roomCode);
  updateLobbyPlayers(state.players, state.hostId);
});

socket.on('room_state', (state) => {
  currentRoom = state;
  localStorage.setItem('pelusa_active_room', state.code);

  if (state.status === 'lobby') {
    showLobbyWaiting(state.code);
    updateLobbyPlayers(state.players, state.hostId);
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
    updateLobbyPlayers(state.players, state.hostId);
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
});

socket.on('turn_stopped', () => {
  sounds.playStop();
});

socket.on('player_reaction', ({ playerId, emoji }) => {
  triggerPlayerReaction(playerId, emoji);
});

socket.on('error_msg', ({ message }) => {
  alert(message);
});

// --- Acciones de Lobby ---
btnCreateRoom.onclick = () => {
  const name = inputPlayerName.value.trim() || 'Jugador 1';
  socket.emit('create_room', { playerName: name, avatar: selectedAvatar, playerToken });
};

btnJoinRoom.onclick = () => {
  const name = inputPlayerName.value.trim() || 'Jugador 2';
  const code = inputRoomCode.value.trim().toUpperCase();
  if (!code) {
    alert('Ingresa el código de la sala');
    return;
  }
  socket.emit('join_room', { roomCode: code, playerName: name, avatar: selectedAvatar, playerToken });
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

function updateLobbyPlayers(players, hostId) {
  lobbyPlayersList.innerHTML = '';
  players.forEach(p => {
    const isHost = p.id === hostId || p.token === hostId;
    const isMe = p.id === myPlayerId || p.token === playerToken;
    const item = document.createElement('div');
    item.className = 'lobby-player-card';
    item.innerHTML = `
      <div class="player-avatar-mini">${renderPelusaAvatar(p.avatar || 1, { size: 'tiny' })}</div>
      <div class="player-info">
        <span class="player-name">${escapeHtml(p.name)} ${isMe ? '<small>(Tú)</small>' : ''}</span>
        ${isHost ? '<span class="badge-host">👑 Anfitrión</span>' : ''}
      </div>
    `;
    lobbyPlayersList.appendChild(item);
  });

  const isMeHost = hostId === myPlayerId || hostId === playerToken;
  btnStartGame.style.display = isMeHost ? 'block' : 'none';
  btnStartGame.disabled = players.length < 2;

  if (players.length < 2 && isMeHost) {
    btnStartGame.innerText = '⏳ Esperando a tus amigos (mínimo 2 jugadores)...';
    btnStartGame.classList.remove('btn-ready-pulse');
  } else if (isMeHost) {
    btnStartGame.innerText = `🚀 ¡Iniciar Partida (${players.length} jugadores)!`;
    btnStartGame.classList.add('btn-ready-pulse');
  }
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
  deckCounter.innerText = `${state.deckCount} / 110`;

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
    turnStatusBadge.innerHTML = `Turno de <strong>${escapeHtml(activePlayer ? activePlayer.name : '')}</strong>...`;
  }

  // Renderizar oponentes con cartas tocables para robar
  renderOpponents(state.players, state.currentTurnIndex, isMyTurn, state.validStealValue);

  // Mis datos
  const me = state.players.find(p => p.id === myPlayerId || p.token === playerToken);
  if (me) {
    mySafeScore.innerText = me.safeScore;
    mySafeCount.innerText = me.safeCount;
    myExposedCount.innerText = me.exposedCards.length;
  }

  // Cartas del turno
  renderTurnCards(state.turnState.drawnThisTurn);

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

  // Botones de acción
  btnDrawCard.disabled = !isMyTurn || state.deckCount === 0 || state.turnState.isBusted;
  btnStopTurn.disabled = !isMyTurn || !state.turnState.canStop || state.turnState.isBusted;

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
    if (isMe) return;

    const isHisTurn = idx === activeTurnIndex;
    const card = document.createElement('div');
    card.id = `player-card-${p.id}`;
    card.className = `opponent-box ${isHisTurn ? 'active-turn' : ''} ${!p.connected ? 'disconnected' : ''}`;

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
        // La carta es robable si es mi turno y es el número que acabo de sacar
        const isClickable = isMyTurn && validStealValue === valNum;
        exposedCardsHtml += `
          <div class="stealable-card-target ${isClickable ? 'can-steal-touch' : ''}" 
               onclick="handleStealCard('${p.id}', ${valNum})" 
               title="${isClickable ? '¡Toca para robarle esta carta!' : ''}">
            ${renderPelusaCard(valNum, { size: 'mini', badge: exposedGroups[v], isClickable })}
          </div>
        `;
      });
    }

    card.innerHTML = `
      <div class="opponent-header">
        <div class="opp-avatar">${renderPelusaAvatar(p.avatar || 1, { size: 'normal' })}</div>
        <div class="opp-info">
          <div class="opp-name">${escapeHtml(p.name)} ${isHisTurn ? '<span class="playing-indicator">🎯 Jugando</span>' : ''}</div>
          <div class="opp-score">🔒 ${p.safeScore} pts (${p.safeCount} cartas)</div>
        </div>
      </div>
      <div class="opp-exposed-section">
        <div class="section-title">Cartas expuestas:</div>
        <div class="opp-exposed-cards">${exposedCardsHtml}</div>
      </div>
    `;

    opponentsContainer.appendChild(card);
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

function renderTurnCards(cards) {
  turnDrawnCards.innerHTML = '';
  if (cards.length === 0) {
    turnDrawnCards.innerHTML = '<div class="empty-turn-notice">Roba tu primera carta del montón central...</div>';
    return;
  }

  const groups = {};
  cards.forEach(c => {
    groups[c.value] = (groups[c.value] || 0) + 1;
  });

  const uniqueVals = Object.keys(groups).sort((a,b) => a - b);
  uniqueVals.forEach(v => {
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'turn-card-stack';
    cardWrapper.innerHTML = renderPelusaCard(Number(v), { size: 'medium', badge: groups[v] });
    turnDrawnCards.appendChild(cardWrapper);
  });
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
  socket.emit('draw_card');
};

deckPile.onclick = () => {
  if (!btnDrawCard.disabled) {
    socket.emit('draw_card');
  }
};

btnStopTurn.onclick = () => {
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
