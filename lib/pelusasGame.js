/**
 * Gestor de lógica y reglas del juego Pelusas
 */

// Distribución de cartas:
// 1 al 5: 13 cartas de cada número (65)
// 6 al 10: 9 cartas de cada número (45)
// Total: 110 cartas
function createFreshDeck() {
  const deck = [];
  let idCounter = 1;

  for (let num = 1; num <= 5; num++) {
    for (let c = 0; c < 13; c++) {
      deck.push({ id: `c_${idCounter++}`, value: num });
    }
  }

  for (let num = 6; num <= 10; num++) {
    for (let c = 0; c < 9; c++) {
      deck.push({ id: `c_${idCounter++}`, value: num });
    }
  }

  // Barajar usando Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

class PelusasRoom {
  constructor(roomCode, hostId, hostName, hostAvatar = 1) {
    this.code = roomCode;
    this.hostId = hostId;
    this.status = 'lobby'; // 'lobby' | 'playing' | 'gameover'
    this.deck = [];
    this.discardPile = [];
    this.currentTurnIndex = 0;
    this.logs = [];

    this.players = [
      {
        id: hostId,
        name: hostName.trim() || 'Jugador 1',
        avatar: hostAvatar,
        connected: true,
        safePile: [], // Cartas aseguradas (puntos definitivos)
        exposedCards: [], // Cartas expuestas de turnos anteriores
        score: 0
      }
    ];

    // Estado del turno activo
    this.turnState = {
      drawnThisTurn: [], // Cartas acumuladas en este turno
      lastDrawnCard: null,
      stealOpportunities: [], // [{ targetId, targetName, value, count }]
      canStop: false, // Se activa cuando tiene >= 3 números diferentes
      isBusted: false,
      autoSecuredCount: 0,
      autoSecuredPoints: 0
    };

    this.addLog(`Sala creada con código ${roomCode}. Esperando jugadores...`);
  }

  addPlayer(id, name, avatar = 1) {
    if (this.players.length >= 6) {
      return { success: false, error: 'La sala está llena (máximo 6 jugadores)' };
    }
    if (this.status !== 'lobby') {
      return { success: false, error: 'La partida ya comenzó' };
    }

    const cleanName = (name && name.trim()) ? name.trim().slice(0, 15) : `Jugador ${this.players.length + 1}`;
    const newPlayer = {
      id,
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

  removePlayer(id) {
    const idx = this.players.findIndex(p => p.id === id);
    if (idx === -1) return;

    const removed = this.players[idx];
    this.addLog(`🚶 ${removed.name} ha salido de la partida.`);

    if (this.status === 'lobby') {
      this.players.splice(idx, 1);
      if (this.hostId === id && this.players.length > 0) {
        this.hostId = this.players[0].id;
        this.addLog(`👑 ${this.players[0].name} es ahora el anfitrión.`);
      }
    } else {
      removed.connected = false;
      // Si era el turno del jugador desconectado, pasar turno
      if (this.currentTurnIndex === idx) {
        this.advanceTurn();
      }
    }
  }

  startGame(requesterId) {
    if (this.hostId !== requesterId) {
      return { success: false, error: 'Solo el anfitrión puede iniciar la partida' };
    }
    if (this.players.length < 2) {
      return { success: false, error: 'Se necesitan al menos 2 jugadores para jugar' };
    }

    this.status = 'playing';
    this.deck = createFreshDeck();
    this.discardPile = [];
    this.currentTurnIndex = 0;

    // Reset de jugadores
    this.players.forEach(p => {
      p.safePile = [];
      p.exposedCards = [];
      p.score = 0;
    });

    this.addLog(`🎉 ¡Comienza la partida de Pelusas! El mazo tiene 110 cartas.`);
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

      this.addLog(`🔒 ¡${player.name} aseguró ${securedCount} pelusas (+${securedPoints} pts) a salvo en su montón!`);
    }

    // Inicializar estado del turno
    this.turnState = {
      drawnThisTurn: [],
      lastDrawnCard: null,
      stealOpportunities: [],
      canStop: false,
      isBusted: false,
      autoSecuredCount: securedCount,
      autoSecuredPoints: securedPoints
    };

    this.addLog(`👉 Es el turno de ${player.name}. ¡A buscar pelusas!`);
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

    // Si había oportunidades de robo pendientes del robo anterior y no se usaron, se pierden
    this.turnState.stealOpportunities = [];

    // Verificar si el mazo tiene cartas
    if (this.deck.length === 0) {
      this.endGame();
      return { success: true, gameEnded: true };
    }

    const card = this.deck.pop();
    this.turnState.lastDrawnCard = card;

    // Números diferentes ya acumulados en este turno antes de esta carta
    const previousUniqueValues = new Set(this.turnState.drawnThisTurn.map(c => c.value));
    const isDuplicate = previousUniqueValues.has(card.value);

    // REGLA CRUCIAL DE PELUSAS:
    // Si ya tiene 3 o más cartas DIFERENTES acumuladas este turno y saca un número repetido:
    // ¡CORRIENTE DE AIRE (Pasarse / Bust)!
    if (previousUniqueValues.size >= 3 && isDuplicate) {
      // Pierde todas las cartas del turno actual
      const lostCards = [...this.turnState.drawnThisTurn, card];
      this.discardPile.push(...lostCards);

      this.turnState.drawnThisTurn = [];
      this.turnState.isBusted = true;
      this.turnState.canStop = false;
      this.turnState.stealOpportunities = [];

      this.addLog(`💨 ¡CORRIENTE DE AIRE! ${player.name} sacó un ${card.value} repetido teniendo ya 3 números diferentes. ¡Perdió todas sus cartas del turno!`);

      // El turno termina inmediatamente por pasarse
      setTimeout(() => {
        this.advanceTurn();
      }, 1800);

      return {
        success: true,
        card,
        busted: true,
        message: '¡Corriente de aire! Te has pasado al sacar un número repetido.'
      };
    }

    // Si no se pasó, la carta se añade a las cartas del turno
    this.turnState.drawnThisTurn.push(card);

    // Chequear si se puede robar a otros jugadores
    // Si algún otro jugador tiene cartas expuestas de este mismo valor:
    const steals = [];
    this.players.forEach(other => {
      if (other.id !== player.id && other.exposedCards.length > 0) {
        const matchingCards = other.exposedCards.filter(c => c.value === card.value);
        if (matchingCards.length > 0) {
          steals.push({
            targetId: other.id,
            targetName: other.name,
            value: card.value,
            count: matchingCards.length
          });
        }
      }
    });

    this.turnState.stealOpportunities = steals;
    if (steals.length > 0) {
      const targets = steals.map(s => `${s.targetName} (${s.count} de ${s.value})`).join(', ');
      this.addLog(`⚡ ¡Oportunidad de robo! ${player.name} puede robarle a ${targets}.`);
    } else {
      this.addLog(`🎴 ${player.name} sacó un ${card.value}.`);
    }

    // Calcular cuántos números diferentes tiene acumulados ahora
    const currentUniqueValues = new Set(this.turnState.drawnThisTurn.map(c => c.value));
    this.turnState.canStop = currentUniqueValues.size >= 3;

    // Si el mazo se agotó al sacar esta carta, finaliza la partida
    if (this.deck.length === 0) {
      this.addLog(`⚠️ ¡Se ha terminado el montón de polvo!`);
      // Guarda las cartas del turno en expuestas antes de terminar
      player.exposedCards.push(...this.turnState.drawnThisTurn);
      this.turnState.drawnThisTurn = [];
      this.endGame();
      return { success: true, card, gameEnded: true };
    }

    return {
      success: true,
      card,
      busted: false,
      canStop: this.turnState.canStop,
      steals
    };
  }

  // Acción: Robar cartas al rival
  stealCards(playerId, targetId, value) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) {
      return { success: false, error: 'No es tu turno' };
    }

    const target = this.players.find(p => p.id === targetId);
    if (!target) {
      return { success: false, error: 'Jugador no encontrado' };
    }

    // Extraer las cartas del rival
    const stolen = target.exposedCards.filter(c => c.value === value);
    if (stolen.length === 0) {
      return { success: false, error: 'El jugador no tiene cartas de ese valor para robar' };
    }

    target.exposedCards = target.exposedCards.filter(c => c.value !== value);
    this.turnState.drawnThisTurn.push(...stolen);

    // Remover esta oportunidad de robo ya ejecutada
    this.turnState.stealOpportunities = this.turnState.stealOpportunities.filter(
      s => !(s.targetId === targetId && s.value === value)
    );

    // Actualizar condición de plantarse (números diferentes)
    const currentUniqueValues = new Set(this.turnState.drawnThisTurn.map(c => c.value));
    this.turnState.canStop = currentUniqueValues.size >= 3;

    this.addLog(`🦹 ¡ZAS! ${player.name} le robó ${stolen.length} pelusa(s) de valor ${value} a ${target.name}.`);

    return {
      success: true,
      stolenCount: stolen.length,
      targetName: target.name,
      value
    };
  }

  // Acción: Plantarse
  stopTurn(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) {
      return { success: false, error: 'No es tu turno' };
    }

    if (!this.turnState.canStop) {
      return { success: false, error: 'Debes acumular al menos 3 números diferentes antes de plantarte' };
    }

    // Las cartas del turno quedan EXPUESTAS frente al jugador
    player.exposedCards.push(...this.turnState.drawnThisTurn);
    const count = this.turnState.drawnThisTurn.length;
    const pts = this.turnState.drawnThisTurn.reduce((acc, c) => acc + c.value, 0);

    this.addLog(`🛑 ${player.name} se plantó con ${count} cartas (+${pts} pts expuestos). ¡Deberán sobrevivir la ronda para asegurarse!`);

    this.turnState.drawnThisTurn = [];
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
    // Buscar el siguiente jugador conectado
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

    // En el conteo final de Pelusas, tanto las cartas del montón seguro
    // como las expuestas que hayan quedado frente a cada jugador suman puntos
    this.players.forEach(p => {
      const safePoints = p.safePile.reduce((acc, c) => acc + c.value, 0);
      const exposedPoints = p.exposedCards.reduce((acc, c) => acc + c.value, 0);
      p.score = safePoints + exposedPoints;
    });

    // Ordenar por puntaje descendente
    const ranked = [...this.players].sort((a, b) => b.score - a.score);
    const winner = ranked[0];

    this.addLog(`🏆 ¡FIN DE LA PARTIDA! El ganador es ${winner.name} con ${winner.score} puntos.`);

    return {
      status: 'gameover',
      ranking: ranked,
      winner
    };
  }

  addLog(msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logs.unshift({ time, msg });
    if (this.logs.length > 50) this.logs.pop();
  }

  // Serializar el estado público para enviar a los clientes
  getStateFor(socketId) {
    const isCurrent = this.status === 'playing' && this.players[this.currentTurnIndex]?.id === socketId;

    return {
      code: this.code,
      status: this.status,
      hostId: this.hostId,
      deckCount: this.deck.length,
      discardCount: this.discardPile.length,
      currentTurnIndex: this.currentTurnIndex,
      isMyTurn: isCurrent,
      players: this.players.map(p => ({
        id: p.id,
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
        stealOpportunities: this.turnState.stealOpportunities,
        canStop: this.turnState.canStop,
        isBusted: this.turnState.isBusted,
        autoSecuredCount: this.turnState.autoSecuredCount,
        autoSecuredPoints: this.turnState.autoSecuredPoints
      },
      logs: this.logs.slice(0, 15)
    };
  }
}

module.exports = { PelusasRoom };
