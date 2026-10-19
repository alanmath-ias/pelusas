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

    const player = room.reconnectPlayer(socket.id, playerToken);
    if (player) {
      currentRoomCode = room.code;
      currentPlayerToken = playerToken;
      socket.join(room.code);
      socket.emit('reconnect_success', { state: room.getStateFor(socket.id) });
      broadcastRoom(room);
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

    // Si se pasó (busted), esperar 1.5s para ver el efecto y avanzar el turno notificando a todos
    if (res.busted) {
      setTimeout(() => {
        room.advanceTurn();
        broadcastRoom(room, 'turn_changed');
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
  });

  // Reacciones en vivo
  socket.on('send_reaction', ({ emoji }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    io.to(currentRoomCode).emit('player_reaction', {
      playerId: socket.id,
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

    if (res.roomEmpty) {
      rooms.delete(currentRoomCode);
      return;
    }

    if (res.gameEnded) {
      broadcastRoom(room, 'gameover', res);
    } else {
      broadcastRoom(room, 'player_left_friendly', {
        playerName: res.playerName,
        message: res.message
      });
    }
  });

  // Finalizar partida por decisión del anfitrión
  socket.on('host_end_game', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const res = room.endGameByHost(socket.id);
    if (!res.success) {
      return socket.emit('error_msg', { message: res.error });
    }

    broadcastRoom(room, 'gameover', res);
  });

  // Desconexión temporal (ej: al pasar a WhatsApp)
  socket.on('disconnect', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.markDisconnected(socket.id);
        broadcastRoom(room);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🎮 Servidor de Pelusas listo en http://localhost:${PORT}`);
});
