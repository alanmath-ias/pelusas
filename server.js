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

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Pelusas - Juegos AlanMath', timestamp: new Date() });
});

// Almacén en memoria de salas
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
      socket.emit(eventName, state);
    }
  });
}

io.on('connection', (socket) => {
  let currentRoomCode = null;

  // Crear sala
  socket.on('create_room', ({ playerName, avatar }) => {
    let code = generateRoomCode();
    while (rooms.has(code)) {
      code = generateRoomCode();
    }

    const room = new PelusasRoom(code, socket.id, playerName, avatar);
    rooms.set(code, room);
    currentRoomCode = code;
    socket.join(code);

    socket.emit('room_created', { roomCode: code, state: room.getStateFor(socket.id) });
    broadcastRoom(room);
  });

  // Unirse a sala
  socket.on('join_room', ({ roomCode, playerName, avatar }) => {
    const code = (roomCode || '').trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      return socket.emit('error_msg', { message: 'No se encontró la sala especificada' });
    }

    const res = room.addPlayer(socket.id, playerName, avatar);
    if (!res.success) {
      return socket.emit('error_msg', { message: res.error });
    }

    currentRoomCode = code;
    socket.join(code);
    broadcastRoom(room, 'room_state', { action: 'player_joined', player: res.player });
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
      steals: res.steals,
      gameEnded: res.gameEnded
    });
  });

  // Robar cartas a otro jugador
  socket.on('steal_cards', ({ targetId, value }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const res = room.stealCards(socket.id, targetId, Number(value));
    if (!res.success) {
      return socket.emit('error_msg', { message: res.error });
    }

    broadcastRoom(room, 'cards_stolen', res);
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

  // Reacciones en vivo (emojis animados en la mesa)
  socket.on('send_reaction', ({ emoji }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    io.to(currentRoomCode).emit('player_reaction', {
      playerId: socket.id,
      emoji
    });
  });

  // Desconexión
  socket.on('disconnect', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.removePlayer(socket.id);
        // Si no quedan jugadores, eliminar la sala
        if (room.players.every(p => !p.connected)) {
          rooms.delete(currentRoomCode);
        } else {
          broadcastRoom(room);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🎮 Servidor de Pelusas listo en http://localhost:${PORT}`);
});
