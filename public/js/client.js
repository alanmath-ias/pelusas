/**
 * Cliente de juego Pelusas - Socket.io & Manejo de Interfaz
 */

const socket = io();

// Estado local del cliente
let myPlayerId = null;
let currentRoom = null;
let selectedAvatar = 1;

// Elementos DOM principales
const screenLobby = document.getElementById('screen-lobby');
const screenGame = document.getElementById('screen-game');
const screenGameOver = document.getElementById('screen-gameover');

// Inputs de Lobby
const inputPlayerName = document.getElementById('input-player-name');
const inputRoomCode = document.getElementById('input-room-code');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const avatarSelector = document.getElementById('avatar-selector');

// Componentes de la Sala de Espera
const lobbyWaitingArea = document.getElementById('lobby-waiting-area');
const lobbyRoomCodeText = document.getElementById('lobby-room-code-text');
const btnWhatsappInvite = document.getElementById('btn-whatsapp-invite');
const btnCopyRoomLink = document.getElementById('btn-copy-room-link');
const lobbyPlayersList = document.getElementById('lobby-players-list');
const btnStartGame = document.getElementById('btn-start-game');

// Componentes de la Mesa de Juego
const gameRoomCode = document.getElementById('game-room-code');
const deckCounter = document.getElementById('deck-counter');
const deckPile = document.getElementById('deck-pile');
const opponentsContainer = document.getElementById('opponents-container');
const turnDrawnCards = document.getElementById('turn-drawn-cards');
const turnStatusBadge = document.getElementById('turn-status-badge');
const uniqueCounterText = document.getElementById('unique-counter-text');
const riskWarning = document.getElementById('risk-warning');
const stealActionsContainer = document.getElementById('steal-actions-container');

// Botones de acción del jugador
const btnDrawCard = document.getElementById('btn-draw-card');
const btnStopTurn = document.getElementById('btn-stop-turn');
const mySafeScore = document.getElementById('my-safe-score');
const mySafeCount = document.getElementById('my-safe-count');
const myExposedCount = document.getElementById('my-exposed-count');

// Logs de eventos y chat de reacciones
const gameLogsList = document.getElementById('game-logs-list');
const reactionButtons = document.querySelectorAll('.reaction-btn');

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
  // Construir selector de avatares (1 al 10)
  buildAvatarSelector();

  // Comprobar si hay un código de sala en la URL (?room=PELU-XXXX)
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    inputRoomCode.value = roomParam.toUpperCase();
    inputPlayerName.focus();
  }

  // Activar sonidos al primer clic del usuario
  document.body.addEventListener('click', () => sounds.init(), { once: true });
});

function buildAvatarSelector() {
  avatarSelector.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('div');
    btn.className = `avatar-option ${i === selectedAvatar ? 'selected' : ''}`;
    btn.innerHTML = renderPelusaCard(i, { size: 'avatar' });
    btn.onclick = () => {
      selectedAvatar = i;
      document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
      btn.classList.add('selected');
    };
    avatarSelector.appendChild(btn);
  }
}

// --- Eventos de Conexión & Sockets ---
socket.on('connect', () => {
  myPlayerId = socket.id;
  console.log('Conectado al servidor con ID:', myPlayerId);
});

socket.on('room_created', ({ roomCode, state }) => {
  currentRoom = state;
  showLobbyWaiting(roomCode);
  updateLobbyPlayers(state.players, state.hostId);
});

socket.on('room_state', (state) => {
  currentRoom = state;

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
  console.log('¡Partida iniciada!', state);
  if (state && state.status === 'playing') {
    renderGame(state);
  }
});

socket.on('player_joined', (state) => {
  if (state && state.players) {
    updateLobbyPlayers(state.players, state.hostId);
  }
});

socket.on('card_drawn', ({ card, busted, steals, gameEnded }) => {
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
  socket.emit('create_room', { playerName: name, avatar: selectedAvatar });
};

btnJoinRoom.onclick = () => {
  const name = inputPlayerName.value.trim() || 'Jugador 2';
  const code = inputRoomCode.value.trim().toUpperCase();
  if (!code) {
    alert('Ingresa el código de la sala');
    return;
  }
  socket.emit('join_room', { roomCode: code, playerName: name, avatar: selectedAvatar });
};

btnStartGame.onclick = () => {
  socket.emit('start_game');
};

function showLobbyWaiting(code) {
  document.getElementById('lobby-form-area').style.display = 'none';
  lobbyWaitingArea.style.display = 'block';
  lobbyRoomCodeText.innerText = code;

  // Configurar enlace de WhatsApp
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
    const isHost = p.id === hostId;
    const isMe = p.id === myPlayerId;
    const item = document.createElement('div');
    item.className = 'lobby-player-card';
    item.innerHTML = `
      <div class="player-avatar-mini">${renderPelusaCard(p.avatar || 1, { size: 'tiny' })}</div>
      <div class="player-info">
        <span class="player-name">${escapeHtml(p.name)} ${isMe ? '<small>(Tú)</small>' : ''}</span>
        ${isHost ? '<span class="badge-host">👑 Anfitrión</span>' : ''}
      </div>
    `;
    lobbyPlayersList.appendChild(item);
  });

  // Mostrar botón de Iniciar solo al anfitrión con mínimo 2 jugadores
  const isMeHost = hostId === myPlayerId;
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
  console.log('Emitiendo start_game al servidor...');
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

  // Banner de turno
  if (isMyTurn) {
    turnStatusBadge.className = 'turn-badge my-turn';
    turnStatusBadge.innerHTML = '⭐ ¡ES TU TURNO! Elige tu jugada';
  } else {
    turnStatusBadge.className = 'turn-badge';
    turnStatusBadge.innerHTML = `Turno de <strong>${escapeHtml(activePlayer.name)}</strong>...`;
  }

  // Renderizar oponentes
  renderOpponents(state.players, state.currentTurnIndex);

  // Mis datos en la barra inferior
  const me = state.players.find(p => p.id === myPlayerId);
  if (me) {
    mySafeScore.innerText = me.safeScore;
    mySafeCount.innerText = me.safeCount;
    myExposedCount.innerText = me.exposedCards.length;
  }

  // Cartas robadas en este turno
  renderTurnCards(state.turnState.drawnThisTurn);

  // Contador de números diferentes y condición de plantarse
  const uniqueNumbers = new Set(state.turnState.drawnThisTurn.map(c => c.value));
  const uniqueCount = uniqueNumbers.size;
  uniqueCounterText.innerText = `${uniqueCount} / 3`;

  // Alerta de riesgo (cuando ya tiene 3 o más diferentes)
  if (uniqueCount >= 3) {
    riskWarning.style.display = 'block';
    riskWarning.className = 'risk-alert';
    riskWarning.innerHTML = '⚠️ <strong>¡ZONA DE RIESGO!</strong> Si sacas un número repetido, perderás todas tus cartas de este turno.';
  } else {
    riskWarning.style.display = 'none';
  }

  // Oportunidades de robo a otros jugadores
  renderStealOpportunities(state.turnState.stealOpportunities, isMyTurn);

  // Habilitar / deshabilitar botones según el turno
  btnDrawCard.disabled = !isMyTurn || state.deckCount === 0 || state.turnState.isBusted;
  btnStopTurn.disabled = !isMyTurn || !state.turnState.canStop || state.turnState.isBusted;

  // Botón de robar con advertencia visual de riesgo
  if (isMyTurn && uniqueCount >= 3) {
    btnDrawCard.classList.add('btn-risk');
    btnDrawCard.innerHTML = '⚡ Arriesgar (Robar Carta)';
    btnStopTurn.classList.add('btn-safe-pulse');
  } else {
    btnDrawCard.classList.remove('btn-risk');
    btnDrawCard.innerHTML = '🃏 Robar Pelusa';
    btnStopTurn.classList.remove('btn-safe-pulse');
  }

  // Actualizar historial de eventos
  renderLogs(state.logs);
}

function renderOpponents(players, activeTurnIndex) {
  opponentsContainer.innerHTML = '';

  players.forEach((p, idx) => {
    if (p.id === myPlayerId) return; // No mostrarme a mí mismo en la zona de rivales

    const isHisTurn = idx === activeTurnIndex;
    const card = document.createElement('div');
    card.id = `player-card-${p.id}`;
    card.className = `opponent-box ${isHisTurn ? 'active-turn' : ''} ${!p.connected ? 'disconnected' : ''}`;

    // Agrupar cartas expuestas por valor
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
        exposedCardsHtml += renderPelusaCard(Number(v), { size: 'mini', badge: exposedGroups[v] });
      });
    }

    card.innerHTML = `
      <div class="opponent-header">
        <div class="opp-avatar">${renderPelusaCard(p.avatar || 1, { size: 'avatar' })}</div>
        <div class="opp-info">
          <div class="opp-name">${escapeHtml(p.name)} ${isHisTurn ? '<span class="playing-indicator">🎯 Jugando</span>' : ''}</div>
          <div class="opp-score">🔒 ${p.safeScore} pts seguros (${p.safeCount} cartas)</div>
        </div>
      </div>
      <div class="opp-exposed-section">
        <div class="section-title">Cartas expuestas (en riesgo de robo):</div>
        <div class="opp-exposed-cards">${exposedCardsHtml}</div>
      </div>
    `;

    opponentsContainer.appendChild(card);
  });
}

function renderTurnCards(cards) {
  turnDrawnCards.innerHTML = '';
  if (cards.length === 0) {
    turnDrawnCards.innerHTML = '<div class="empty-turn-notice">Roba tu primera carta del montón central...</div>';
    return;
  }

  // Agrupar cartas del turno por valor
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

function renderStealOpportunities(steals, isMyTurn) {
  stealActionsContainer.innerHTML = '';
  if (!steals || steals.length === 0) return;

  steals.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'btn-steal-action animate-bounce-steal';
    btn.innerHTML = `⚡ ¡Robar ${s.count} carta(s) de valor ${s.value} a ${escapeHtml(s.targetName)}!`;

    if (isMyTurn) {
      btn.onclick = () => {
        socket.emit('steal_cards', { targetId: s.targetId, value: s.value });
      };
    } else {
      btn.disabled = true;
      btn.innerHTML = `⚠️ ${escapeHtml(s.targetName)} puede ser robado por valor ${s.value}`;
    }

    stealActionsContainer.appendChild(btn);
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

// --- Acciones del Jugador ---
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

// Reacciones en vivo
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

// --- Pantalla de Fin de Juego ---
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
      <div class="podium-avatar">${renderPelusaCard(p.avatar || 1, { size: 'tiny' })}</div>
      <div class="podium-name">${escapeHtml(p.name)} ${p.id === myPlayerId ? '(Tú)' : ''}</div>
      <div class="podium-score">${p.score} pts</div>
    `;
    podium.appendChild(row);
  });

  document.getElementById('btn-play-again').onclick = () => {
    window.location.reload();
  };
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}
