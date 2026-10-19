/**
 * Gestor de lógica y reglas del juego Pelusas
 * Con persistencia de tokens de jugador y reconexión fluida
 */

function createFreshDeck(deckSize = 110) {
  const deck = [];
  let idCounter = 1;

  let copies1to5 = 13;
  let copies6to10 = 9;

  if (deckSize === 50) {
    copies1to5 = 6;
    copies6to10 = 4;
  } else if (deckSize === 75) {
    copies1to5 = 9;
    copies6to10 = 6;
  } else {
    // 110 cartas por defecto (juego original)
    copies1to5 = 13;
    copies6to10 = 9;
  }

  for (let num = 1; num <= 5; num++) {
    for (let c = 0; c < copies1to5; c++) {
      deck.push({ id: `c_${idCounter++}`, value: num });
    }
  }

  for (let num = 6; num <= 10; num++) {
    for (let c = 0; c < copies6to10; c++) {
      deck.push({ id: `c_${idCounter++}`, value: num });
    }
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

class PelusasRoom {
  constructor(roomCode, hostId, hostName, hostAvatar = 1, hostToken = null) {
    this.code = roomCode;
    this.hostId = hostId;
    this.hostToken = hostToken || hostId;
    this.status = 'lobby'; // 'lobby' | 'playing' | 'gameover'
    this.deckSize = 110;
    this.initialDeckCount = 110;
    this.deck = [];
    this.discardPile = [];
    this.currentTurnIndex = 0;
    this.logs = [];

    this.players = [
      {
        id: hostId,
        token: hostToken || hostId,
        name: hostName.trim() || 'Jugador 1',
        avatar: hostAvatar,
        connected: true,
        safePile: [],
        exposedCards: [],
        score: 0
      }
    ];

    this.turnState = {
      drawnThisTurn: [],
      lastDrawnCard: null,
      canStop: false,
      isBusted: false,
      // Almacena qué valor de carta se acaba de robar para validar robos manuales
      validStealValue: null
    };

    this.addLog(`Sala creada con código ${roomCode}. Esperando jugadores...`);
  }

  isHostPlayer(socketId) {
    const player = this.players.find(p => p.id === socketId);
    return (player && player.token === this.hostToken) || this.hostId === socketId;
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  addPlayer(id, name, avatar = 1, playerToken = null) {
    if (this.players.length >= 6) {
      return { success: false, error: 'La sala está llena (máximo 6 jugadores)' };
    }
    if (this.status !== 'lobby') {
      return { success: false, error: 'La partida ya comenzó' };
    }

    const cleanName = (name && name.trim()) ? name.trim().slice(0, 15) : `Jugador ${this.players.length + 1}`;
    const newPlayer = {
      id,
      token: playerToken || id,
      name: cleanName,
      avatar: avatar || (this.players.length + 1),
      connected: true,
      safePile: [],
      exposedCards: [],
      score: 0
    };

    this.players.push(newPlayer);
    this.addLog(`👋 ${newPlayer.name} se unió a la sala.`);
    return { success: true, player: newPlayer };
  }

  // Manejo de reconexión cuando un jugador vuelve de WhatsApp
  reconnectPlayer(socketId, playerToken) {
    const player = this.players.find(p => p.token === playerToken);
    if (!player) return null;

    if (player.disconnectTimeout) {
      clearTimeout(player.disconnectTimeout);
      player.disconnectTimeout = null;
    }

    const oldSocketId = player.id;
    player.id = socketId;
    player.connected = true;

    // Si el reconectado es el anfitrión, actualizar this.hostId al nuevo socketId
    if (this.hostToken === playerToken || this.hostId === oldSocketId) {
      this.hostId = socketId;
    }

    this.addLog(`🔄 ${player.name} se reconectó.`);
    return player;
  }

  // Cuando se desconecta temporalmente (por cambiar a WhatsApp u otra app)
  markDisconnected(socketId) {
    const idx = this.players.findIndex(p => p.id === socketId);
    if (idx === -1) return;

    const player = this.players[idx];
    player.connected = false;

    if (this.status === 'lobby') {
      // En lobby nunca expulsar rápidamente: el anfitrión o invitados pueden tardar en WhatsApp
      // Damos 30 minutos (1800000 ms) de gracia para reconectar sin perder la sala
      player.disconnectTimeout = setTimeout(() => {
        if (!player.connected) {
          this.removePlayer(player.id);
        }
      }, 1800000);
    } else {
      // En partida, dar 90 segundos para volver de WhatsApp sin perder turno ni sitio
      player.disconnectTimeout = setTimeout(() => {
        if (!player.connected) {
          this.addLog(`⏳ ${player.name} tardó demasiado en volver y se pasó su turno.`);
          if (this.currentTurnIndex === idx) {
            this.advanceTurn();
          }
        }
      }, 90000);
    }
  }

  removePlayer(id) {
    const idx = this.players.findIndex(p => p.id === id);
    if (idx === -1) return;

    const removed = this.players[idx];
    this.addLog(`🚶 ${removed.name} ha salido.`);

    if (this.status === 'lobby') {
      this.players.splice(idx, 1);
      if ((this.hostId === id || this.hostToken === removed.token) && this.players.length > 0) {
        this.hostId = this.players[0].id;
        this.hostToken = this.players[0].token;
        this.addLog(`👑 ${this.players[0].name} es ahora el anfitrión.`);
      }
    }
  }

  setDeckSize(size, requesterId) {
    if (!this.isHostPlayer(requesterId)) {
      return { success: false, error: 'Solo el anfitrión puede cambiar el tamaño del mazo' };
    }
    if (this.status !== 'lobby') {
      return { success: false, error: 'No se puede cambiar el tamaño del mazo una vez iniciada la partida' };
    }
    const val = Number(size);
    if (![50, 75, 110].includes(val)) {
      return { success: false, error: 'Tamaño de mazo inválido' };
    }
    this.deckSize = val;
    this.initialDeckCount = val;
    this.addLog(`⚙️ Modo configurado por el anfitrión: ${val === 50 ? 'Rápida (50 cartas)' : (val === 75 ? 'Media (75 cartas)' : 'Completa (110 cartas)')}.`);
    return { success: true, deckSize: val };
  }

  startGame(requesterId) {
    if (!this.isHostPlayer(requesterId)) {
      return { success: false, error: 'Solo el anfitrión puede iniciar la partida' };
    }
    if (this.players.length < 2) {
      return { success: false, error: 'Se necesitan al menos 2 jugadores para jugar' };
    }

    this.status = 'playing';
    this.deck = createFreshDeck(this.deckSize);
    this.initialDeckCount = this.deck.length;
    this.discardPile = [];
    this.currentTurnIndex = 0;

    this.players.forEach(p => {
      p.safePile = [];
      p.exposedCards = [];
      p.score = 0;
    });

    this.addLog(`🎉 ¡Comienza la partida de Pelusas! ${this.deck.length} cartas en el montón de polvo.`);
    this.startTurnForCurrentPlayer();

    return { success: true };
  }

  getCurrentPlayer() {
    return this.players[this.currentTurnIndex];
  }

  startTurnForCurrentPlayer() {
    const player = this.getCurrentPlayer();
    if (!player) return;

    // FASE 1: Asegurar cartas que sobrevivieron a la ronda anterior
    let securedCount = 0;
    let securedPoints = 0;

    if (player.exposedCards.length > 0) {
      securedCount = player.exposedCards.length;
      securedPoints = player.exposedCards.reduce((acc, c) => acc + c.value, 0);

      player.safePile.push(...player.exposedCards);
      player.exposedCards = [];
      player.score = player.safePile.reduce((acc, c) => acc + c.value, 0);

      this.addLog(`🔒 ¡${player.name} aseguró ${securedCount} pelusas (+${securedPoints} pts) en su montón!`);
    }

    this.turnState = {
      drawnThisTurn: [],
      lastDrawnCard: null,
      canStop: false,
      isBusted: false,
      validStealValue: null
    };

    this.addLog(`👉 Es el turno de ${player.name}.`);
  }

  // Acción: Robar carta del montón de polvo
  drawCard(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) {
      return { success: false, error: 'No es tu turno' };
    }
    if (this.status !== 'playing') {
      return { success: false, error: 'La partida no está en curso' };
    }

    if (this.deck.length === 0) {
      this.endGame();
      return { success: true, gameEnded: true };
    }

    const card = this.deck.pop();
    this.turnState.lastDrawnCard = card;
    this.turnState.validStealValue = card.value; // Solo se puede robar por este valor inmediatamente

    const previousUniqueValues = new Set(this.turnState.drawnThisTurn.map(c => c.value));
    const isDuplicate = previousUniqueValues.has(card.value);

    // REGLA: Si ya tiene 3 o más cartas diferentes y saca un número repetido:
    // ¡CORRIENTE DE AIRE (Pasarse / Bust)!
    if (previousUniqueValues.size >= 3 && isDuplicate) {
      const lostCards = [...this.turnState.drawnThisTurn, card];
      // Las cartas perdidas vuelven al montón de polvo (deck) y se barajan
      this.deck.push(...lostCards);
      this.shuffleDeck();

      this.turnState.drawnThisTurn = [];
      this.turnState.isBusted = true;
      this.turnState.canStop = false;
      this.turnState.validStealValue = null;

      this.addLog(`💨 ¡CORRIENTE DE AIRE! ${player.name} sacó un ${card.value} repetido teniendo ya 3 números diferentes. ¡Sus ${lostCards.length} cartas volvieron al montón de polvo!`);

      return {
        success: true,
        card,
        busted: true,
        returnedCount: lostCards.length
      };
    }

    this.turnState.drawnThisTurn.push(card);
    this.addLog(`🎴 ${player.name} sacó un ${card.value}.`);

    const currentUniqueValues = new Set(this.turnState.drawnThisTurn.map(c => c.value));
    this.turnState.canStop = currentUniqueValues.size >= 3;

    if (this.deck.length === 0) {
      this.addLog(`⚠️ ¡Se agotó el montón de polvo!`);
      player.exposedCards.push(...this.turnState.drawnThisTurn);
      this.turnState.drawnThisTurn = [];
      this.endGame();
      return { success: true, card, gameEnded: true };
    }

    return {
      success: true,
      card,
      busted: false,
      canStop: this.turnState.canStop
    };
  }

  // Acción: Robar manualmente tocando la carta expuesta del rival
  stealCards(playerId, targetId, value) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) {
      return { success: false, error: 'No es tu turno' };
    }

    // Comprobar que el valor a robar coincida exactamente con la última carta sacada
    if (this.turnState.validStealValue !== value) {
      return { success: false, error: 'Solo puedes robar el número que acabas de sacar del montón' };
    }

    const target = this.players.find(p => p.id === targetId);
    if (!target) {
      return { success: false, error: 'Jugador rival no encontrado' };
    }

    const stolen = target.exposedCards.filter(c => c.value === value);
    if (stolen.length === 0) {
      return { success: false, error: 'El rival no tiene cartas de ese valor' };
    }

    // Robar todas las cartas de ese valor
    target.exposedCards = target.exposedCards.filter(c => c.value !== value);
    this.turnState.drawnThisTurn.push(...stolen);

    // Actualizar condición de plantarse
    const currentUniqueValues = new Set(this.turnState.drawnThisTurn.map(c => c.value));
    this.turnState.canStop = currentUniqueValues.size >= 3;

    this.addLog(`⚡ ¡ATENTO! ${player.name} vio la oportunidad y le robó ${stolen.length} pelusa(s) de valor ${value} a ${target.name}.`);

    return {
      success: true,
      stolenCount: stolen.length,
      targetName: target.name,
      value
    };
  }

  stopTurn(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) {
      return { success: false, error: 'No es tu turno' };
    }

    if (!this.turnState.canStop) {
      return { success: false, error: 'Debes acumular al menos 3 números diferentes antes de plantarte' };
    }

    player.exposedCards.push(...this.turnState.drawnThisTurn);
    const count = this.turnState.drawnThisTurn.length;
    const pts = this.turnState.drawnThisTurn.reduce((acc, c) => acc + c.value, 0);

    this.addLog(`🛑 ${player.name} se plantó con ${count} cartas (+${pts} pts expuestos).`);

    this.turnState.drawnThisTurn = [];
    this.turnState.validStealValue = null;
    this.advanceTurn();

    return { success: true };
  }

  advanceTurn() {
    if (this.status !== 'playing') return;

    if (this.deck.length === 0) {
      this.endGame();
      return;
    }

    let nextIndex = (this.currentTurnIndex + 1) % this.players.length;
    let attempts = 0;
    while (!this.players[nextIndex].connected && attempts < this.players.length) {
      nextIndex = (nextIndex + 1) % this.players.length;
      attempts++;
    }

    this.currentTurnIndex = nextIndex;
    this.startTurnForCurrentPlayer();
  }

  endGame() {
    this.status = 'gameover';

    this.players.forEach(p => {
      const safePoints = p.safePile.reduce((acc, c) => acc + c.value, 0);
      const exposedPoints = p.exposedCards.reduce((acc, c) => acc + c.value, 0);
      p.score = safePoints + exposedPoints;
    });

    const ranked = [...this.players].sort((a, b) => b.score - a.score);
    const winner = ranked[0];

    this.addLog(`🏆 ¡FIN DE LA PARTIDA! El ganador es ${winner.name} con ${winner.score} puntos.`);

    return {
      status: 'gameover',
      ranking: ranked,
      winner
    };
  }

  // Finalizar partida por decisión del anfitrión
  endGameByHost(requesterId) {
    if (!this.isHostPlayer(requesterId)) {
      return { success: false, error: 'Solo el anfitrión puede finalizar la partida' };
    }
    if (this.status !== 'playing') {
      return { success: false, error: 'La partida no está en curso' };
    }

    this.addLog(`🏁 El anfitrión dio por terminada la partida amablemente. ¡Calculando podio!`);
    return this.endGame();
  }

  // Retirarse amablemente de la partida (jugador voluntario)
  leaveGame(playerId, customMessage = 'Lo siento, tengo que irme') {
    const idx = this.players.findIndex(p => p.id === playerId);
    if (idx === -1) return { success: false, error: 'Jugador no encontrado' };

    const player = this.players[idx];
    const isHost = this.isHostPlayer(playerId);
    const wasHisTurn = (this.status === 'playing' && this.currentTurnIndex === idx);

    // Devolver al mazo cartas que tuviera en juego en este turno
    if (wasHisTurn && this.turnState.drawnThisTurn.length > 0) {
      this.deck.push(...this.turnState.drawnThisTurn);
      this.shuffleDeck();
      this.turnState.drawnThisTurn = [];
    }

    // Devolver cartas expuestas de rondas previas
    if (player.exposedCards.length > 0) {
      this.deck.push(...player.exposedCards);
      this.shuffleDeck();
      player.exposedCards = [];
    }

    this.addLog(`👋 ${player.name} se retiró: "${customMessage}".`);
    this.players.splice(idx, 1);

    if (this.players.length === 0) {
      this.status = 'gameover';
      return { success: true, roomEmpty: true };
    }

    if (isHost && this.players.length > 0) {
      this.hostId = this.players[0].id;
      this.hostToken = this.players[0].token;
      this.addLog(`👑 ${this.players[0].name} es ahora el nuevo anfitrión.`);
    }

    if (this.status === 'playing') {
      // Si solo queda un jugador, proclamarlo ganador
      if (this.players.length === 1) {
        const lastPlayer = this.players[0];
        this.addLog(`🏆 ¡${lastPlayer.name} gana la partida al ser el último jugador en pie!`);
        return { success: true, gameEnded: true, ...this.endGame() };
      }

      if (wasHisTurn) {
        if (this.currentTurnIndex >= this.players.length) {
          this.currentTurnIndex = 0;
        }
        this.startTurnForCurrentPlayer();
      } else if (idx < this.currentTurnIndex) {
        this.currentTurnIndex--;
      }
    }

    return { success: true, gameEnded: false, playerName: player.name, message: customMessage };
  }

  addLog(msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logs.unshift({ time, msg });
    if (this.logs.length > 30) this.logs.pop();
  }

  getStateFor(socketId) {
    const isCurrent = this.status === 'playing' && this.players[this.currentTurnIndex]?.id === socketId;
    const isHost = this.isHostPlayer(socketId);

    return {
      code: this.code,
      status: this.status,
      hostId: this.hostId,
      hostToken: this.hostToken,
      isHost,
      deckSize: this.deckSize || 110,
      initialDeckCount: this.initialDeckCount || 110,
      deckCount: this.deck.length,
      discardCount: this.discardPile.length,
      currentTurnIndex: this.currentTurnIndex,
      isMyTurn: isCurrent,
      validStealValue: isCurrent ? this.turnState.validStealValue : null,
      players: this.players.map(p => ({
        id: p.id,
        token: p.token,
        name: p.name,
        avatar: p.avatar,
        connected: p.connected,
        safeCount: p.safePile.length,
        safeScore: p.safePile.reduce((acc, c) => acc + c.value, 0),
        exposedCards: p.exposedCards,
        score: p.score
      })),
      turnState: {
        drawnThisTurn: this.turnState.drawnThisTurn,
        lastDrawnCard: this.turnState.lastDrawnCard,
        canStop: this.turnState.canStop,
        isBusted: this.turnState.isBusted
      },
      logs: this.logs.slice(0, 10)
    };
  }
}

module.exports = { PelusasRoom };
