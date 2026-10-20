const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { PelusasRoom } = require('./lib/pelusasGame');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Pelusas - Juegos AlanMath', timestamp: new Date() });
});

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PELU-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function broadcastRoom(room, eventName = 'room_state', extraData = null) {
  room.players.forEach(p => {
    const socket = io.sockets.sockets.get(p.id);
    if (socket) {
      const state = room.getStateFor(p.id);
      if (extraData) state.extra = extraData;
      socket.emit('room_state', state);
      if (eventName !== 'room_state') {
        socket.emit(eventName, { ...state, ...extraData });
      }
    }
  });
}

// Auto-limpieza de salas finalizadas tras 15 minutos para liberar memoria
function scheduleRoomCleanup(roomCode) {
  setTimeout(() => {
    if (rooms.has(roomCode)) {
      const r = rooms.get(roomCode);
      if (r && r.status === 'gameover') {
        if (r.botActionTimeout) clearTimeout(r.botActionTimeout);
        rooms.delete(roomCode);
        console.log(`🧹 Sala ${roomCode} eliminada por inactividad tras finalizar.`);
      }
    }
  }, 15 * 60 * 1000);
}

// --- Control Inteligente de Turnos de Bots (IA) ---
function checkBotTurn(room) {
  if (!room || room.status !== 'playing') return;

  const activePlayer = room.getCurrentPlayer();
  if (!activePlayer || !activePlayer.isBot) return;

  if (room.botActionTimeout) {
    clearTimeout(room.botActionTimeout);
    room.botActionTimeout = null;
  }

  // Esperar 1.2 segundos para que el jugador humano aprecie la transición de turno
  room.botActionTimeout = setTimeout(() => {
    runBotAction(room, activePlayer.id);
  }, 1200);
}

function runBotAction(room, botId) {
  if (!room || room.status !== 'playing') return;
  const activePlayer = room.getCurrentPlayer();
  if (!activePlayer || activePlayer.id !== botId || !activePlayer.isBot) return;

  // 1. El bot roba una carta del montón
  const res = room.drawCard(botId);
  if (!res.success) return;

  broadcastRoom(room, 'card_drawn', {
    card: res.card,
    busted: res.busted,
    gameEnded: res.gameEnded
  });

  // Si se pasa (busted)
  if (res.busted) {
    if (Math.random() < 0.45) {
      setTimeout(() => {
        io.to(room.code).emit('player_reaction', {
          playerId: botId,
          playerName: activePlayer.name,
          avatar: activePlayer.avatar,
          isBot: true,
          emoji: Math.random() < 0.5 ? '😱' : '💨'
        });
      }, 350);
    }
    setTimeout(() => {
      room.advanceTurn();
      broadcastRoom(room, 'turn_changed');
      checkBotTurn(room);
    }, 1500);
    return;
  }

  // Si el mazo se agotó y terminó la partida
  if (res.gameEnded) {
    if (room.botActionTimeout) {
      clearTimeout(room.botActionTimeout);
      room.botActionTimeout = null;
    }
    broadcastRoom(room, 'gameover', room.endGame());
    scheduleRoomCleanup(room.code);
    return;
  }

  // 2. Verificar si puede robar cartas a un rival con el número que acaba de sacar
  const drawnVal = res.card.value;
  let targetToSteal = null;

  for (const p of room.players) {
    if (p.id !== botId && p.exposedCards && p.exposedCards.some(c => c.value === drawnVal)) {
      targetToSteal = p;
      break;
    }
  }

  if (targetToSteal) {
    // El bot detecta la oportunidad y ejecuta el robo tras 900ms
    room.botActionTimeout = setTimeout(() => {
      if (room.status !== 'playing') return;
      const stealRes = room.stealCards(botId, targetToSteal.id, drawnVal);
      if (stealRes.success) {
        broadcastRoom(room, 'cards_stolen', {
          ...stealRes,
          thiefId: botId,
          thiefName: activePlayer.name,
          thiefToken: activePlayer.token,
          targetId: targetToSteal.id,
          targetName: targetToSteal.name,
          targetToken: targetToSteal.token,
          value: drawnVal
        });

        setTimeout(() => {
          io.to(room.code).emit('player_reaction', {
            playerId: botId,
            playerName: activePlayer.name,
            avatar: activePlayer.avatar,
            isBot: true,
            emoji: Math.random() < 0.5 ? '🔥' : '😈'
          });
        }, 500);
      }

      decideBotNextStep(room, botId);
    }, 900);
  } else {
    decideBotNextStep(room, botId);
  }
}

function decideBotNextStep(room, botId) {
  room.botActionTimeout = setTimeout(() => {
    if (!room || room.status !== 'playing') return;
    const activePlayer = room.getCurrentPlayer();
    if (!activePlayer || activePlayer.id !== botId || !activePlayer.isBot) return;

    // Si aún no tiene al menos 3 números diferentes, está obligado a robar otra carta
    if (!room.turnState.canStop) {
      runBotAction(room, botId);
      return;
    }

    // Heurística de riesgo calculada con probabilidades matemáticas reales:
    const probs = room.calculateTurnProbabilities();
    const sumPoints = drawn.reduce((acc, c) => acc + c.value, 0);

    let shouldStop = false;

    if (probs.bustPercent >= 60) {
      // Riesgo extremo (≥ 60% de derrota): el bot se planta la gran mayoría de las veces
      shouldStop = Math.random() < 0.92;
    } else if (probs.bustPercent >= 40) {
      // Riesgo alto (40-59% de derrota)
      shouldStop = sumPoints >= 14 ? (Math.random() < 0.85) : (Math.random() < 0.65);
    } else if (probs.bustPercent >= 25) {
      // Riesgo medio (25-39% de derrota)
      shouldStop = sumPoints >= 16 ? (Math.random() < 0.65) : (Math.random() < 0.35);
    } else {
      // Riesgo bajo (< 25%): roba a menos que ya tenga demasiados puntos
      shouldStop = sumPoints >= 24 && Math.random() < 0.50;
    }

    // Si el mazo se está terminando (<= 4 cartas), asegurar puntos de inmediato
    if (room.deck.length <= 4) {
      shouldStop = true;
    }

    if (shouldStop) {
      const stopRes = room.stopTurn(botId);
      if (stopRes.success) {
        broadcastRoom(room, 'turn_stopped');
        if (Math.random() < 0.4) {
          setTimeout(() => {
            io.to(room.code).emit('player_reaction', {
              playerId: botId,
              playerName: activePlayer.name,
              avatar: activePlayer.avatar,
              isBot: true,
              emoji: '👏'
            });
          }, 350);
        }
        checkBotTurn(room);
      }
    } else {
      runBotAction(room, botId);
    }
  }, 1200);
}

io.on('connection', (socket) => {
  let currentRoomCode = null;
  let currentPlayerToken = null;

  // Reconexión tras volver de WhatsApp o refrescar la página
  socket.on('reconnect_session', ({ roomCode, playerToken }) => {
    if (!roomCode || !playerToken) return;
    const room = rooms.get(roomCode.trim().toUpperCase());
    if (!room) {
      return socket.emit('reconnect_failed', { message: 'La sala ya no existe' });
    }

    if (room.status === 'gameover') {
      return socket.emit('reconnect_failed', { message: 'La partida anterior ya ha concluido' });
    }

    const player = room.reconnectPlayer(socket.id, playerToken);
    if (player) {
      currentRoomCode = room.code;
      currentPlayerToken = playerToken;
      socket.join(room.code);
      socket.emit('reconnect_success', { state: room.getStateFor(socket.id) });
      broadcastRoom(room);
      checkBotTurn(room);
    } else {
      socket.emit('reconnect_failed', { message: 'No se encontró la sesión previa' });
    }
  });

  // Crear sala
  socket.on('create_room', ({ playerName, avatar, playerToken }) => {
    let code = generateRoomCode();
    while (rooms.has(code)) {
      code = generateRoomCode();
    }

    const room = new PelusasRoom(code, socket.id, playerName, avatar, playerToken);
    rooms.set(code, room);
    currentRoomCode = code;
    currentPlayerToken = playerToken;
    socket.join(code);

    socket.emit('room_created', { roomCode: code, state: room.getStateFor(socket.id) });
    broadcastRoom(room);
  });

  // Unirse a sala
  socket.on('join_room', ({ roomCode, playerName, avatar, playerToken }) => {
    const code = (roomCode || '').trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      return socket.emit('error_msg', { message: 'No se encontró la sala especificada' });
    }

    // Verificar si es una reconexión legítima o una colisión de token (ej: 2 pestañas en la misma PC)
    let actualToken = playerToken;
    const existingPlayer = room.players.find(p => p.token === actualToken);
    if (existingPlayer) {
      const liveSocket = io.sockets.sockets.get(existingPlayer.id);
      if (liveSocket && liveSocket.connected && existingPlayer.id !== socket.id) {
        // La otra pestaña sigue conectada: crear un token separado para no sobreescribir al jugador 1
        actualToken = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      } else {
        room.reconnectPlayer(socket.id, actualToken);
        currentRoomCode = code;
        currentPlayerToken = actualToken;
        socket.join(code);
        socket.emit('reconnect_success', { state: room.getStateFor(socket.id) });
        return broadcastRoom(room);
      }
    }

    const res = room.addPlayer(socket.id, playerName, avatar, actualToken);
    if (!res.success) {
      return socket.emit('error_msg', { message: res.error });
    }

    currentRoomCode = code;
    currentPlayerToken = actualToken;
    socket.join(code);
    socket.emit('room_joined_success', { roomCode: code, state: room.getStateFor(socket.id), playerToken: actualToken });
    broadcastRoom(room, 'player_joined', { player: res.player });
  });

  // Iniciar partida
  socket.on('start_game', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const res = room.startGame(socket.id);
    if (!res.success) {
      return socket.emit('error_msg', { message: res.error });
    }

    broadcastRoom(room, 'game_started');
    checkBotTurn(room);
  });

  // Jugar contra la máquina directamente (Modo Solitario 1 vs 1)
  socket.on('play_vs_bot', ({ playerName, avatar, playerToken, deckSize }) => {
    let code = generateRoomCode();
    while (rooms.has(code)) {
      code = generateRoomCode();
    }

    const room = new PelusasRoom(code, socket.id, playerName, avatar, playerToken);
    rooms.set(code, room);
    currentRoomCode = code;
    currentPlayerToken = playerToken;
    socket.join(code);

    const size = Number(deckSize) || 50;
    room.setDeckSize(size, socket.id);

    // Agregar el bot
    room.addBot('Pelusabot 🤖');

    // Iniciar la partida
    room.startGame(socket.id);

    socket.emit('room_created', { roomCode: code, state: room.getStateFor(socket.id) });
    broadcastRoom(room, 'game_started');
    checkBotTurn(room);
  });

  // Agregar bot en sala de espera
  socket.on('add_bot', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    if (!room.isHostPlayer(socket.id)) {
      return socket.emit('error_msg', { message: 'Solo el anfitrión puede agregar bots' });
    }

    const res = room.addBot();
    if (!res.success) {
      return socket.emit('error_msg', { message: res.error });
    }

    broadcastRoom(room, 'player_joined', { player: res.player });
  });

  // Retirar bot en sala de espera
  socket.on('remove_bot', ({ botId }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    if (!room.isHostPlayer(socket.id)) {
      return socket.emit('error_msg', { message: 'Solo el anfitrión puede retirar bots' });
    }

    const res = room.removeBot(botId, socket.id);
    if (!res.success) {
      return socket.emit('error_msg', { message: res.error });
    }

    broadcastRoom(room);
  });

  // Robar carta del montón de polvo
  socket.on('draw_card', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const res = room.drawCard(socket.id);
    if (!res.success) {
      return socket.emit('error_msg', { message: res.error });
    }

    broadcastRoom(room, 'card_drawn', {
      card: res.card,
      busted: res.busted,
      gameEnded: res.gameEnded
    });

    if (res.gameEnded) {
      if (room.botActionTimeout) {
        clearTimeout(room.botActionTimeout);
        room.botActionTimeout = null;
      }
      broadcastRoom(room, 'gameover', room.endGame());
      scheduleRoomCleanup(room.code);
      return;
    }

    // Si se pasó (busted), esperar 1.5s para ver el efecto y avanzar el turno notificando a todos
    if (res.busted) {
      setTimeout(() => {
        room.advanceTurn();
        broadcastRoom(room, 'turn_changed');
        checkBotTurn(room);
      }, 1500);
    }
  });

  // Robar cartas a otro jugador (acción manual tocando la carta del rival)
  socket.on('steal_cards', ({ targetId, value }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const res = room.stealCards(socket.id, targetId, Number(value));
    if (!res.success) {
      return socket.emit('error_msg', { message: res.error });
    }

    const thief = room.players.find(p => p.id === socket.id);
    const victim = room.players.find(p => p.id === targetId);

    broadcastRoom(room, 'cards_stolen', {
      ...res,
      thiefId: socket.id,
      thiefName: thief ? thief.name : 'Un rival',
      thiefToken: thief ? thief.token : null,
      targetId,
      targetName: victim ? victim.name : 'un rival',
      targetToken: victim ? victim.token : null,
      value: Number(value)
    });
  });

  // Plantarse (detener turno)
  socket.on('stop_turn', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const res = room.stopTurn(socket.id);
    if (!res.success) {
      return socket.emit('error_msg', { message: res.error });
    }

    broadcastRoom(room, 'turn_stopped');
    checkBotTurn(room);
  });

  // Reacciones en vivo
  socket.on('send_reaction', ({ emoji }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const sender = room.players.find(p => p.id === socket.id);
    io.to(currentRoomCode).emit('player_reaction', {
      playerId: socket.id,
      playerName: sender ? sender.name : 'Jugador',
      avatar: sender ? sender.avatar : '👤',
      isBot: sender ? !!sender.isBot : false,
      emoji
    });
  });

  // Configurar tamaño del mazo en el lobby (solo anfitrión)
  socket.on('set_deck_size', ({ deckSize }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const res = room.setDeckSize(deckSize, socket.id);
    if (!res.success) {
      return socket.emit('error_msg', { message: res.error });
    }

    broadcastRoom(room, 'deck_size_updated', { deckSize: room.deckSize });
  });

  // Retirarse amablemente de la partida
  socket.on('leave_game', ({ message }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const res = room.leaveGame(socket.id, message);
    socket.leave(currentRoomCode);
    socket.emit('left_game_success');

    if (res.roomEmpty || !room.players.some(p => !p.isBot)) {
      if (room.botActionTimeout) {
        clearTimeout(room.botActionTimeout);
        room.botActionTimeout = null;
      }
      rooms.delete(currentRoomCode);
      return;
    }

    if (res.gameEnded) {
      if (room.botActionTimeout) {
        clearTimeout(room.botActionTimeout);
        room.botActionTimeout = null;
      }
      broadcastRoom(room, 'gameover', res);
      scheduleRoomCleanup(room.code);
    } else {
      broadcastRoom(room, 'player_left_friendly', {
        playerName: res.playerName,
        message: res.message
      });
      checkBotTurn(room);
    }
  });

  // Finalizar partida por decisión del anfitrión
  socket.on('host_end_game', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    if (room.botActionTimeout) {
      clearTimeout(room.botActionTimeout);
      room.botActionTimeout = null;
    }

    const res = room.endGameByHost(socket.id);
    if (!res.success) {
      return socket.emit('error_msg', { message: res.error });
    }

    broadcastRoom(room, 'gameover', res);
    scheduleRoomCleanup(room.code);
  });

  // Desconexión temporal (ej: al pasar a WhatsApp)
  socket.on('disconnect', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.markDisconnected(socket.id);
        broadcastRoom(room);
        const anyHumanConnected = room.players.some(p => !p.isBot && p.connected);
        if (!anyHumanConnected && room.botActionTimeout) {
          clearTimeout(room.botActionTimeout);
          room.botActionTimeout = null;
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🎮 Servidor de Pelusas listo en http://localhost:${PORT}`);
});
