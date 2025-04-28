const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Battle } = require('./game');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

let waitingPlayer = null;
const battles = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('login', (username) => {
    socket.username = username;
    if (waitingPlayer) {
      const battleId = `${waitingPlayer.id}-${socket.id}`;
      const battle = new Battle(battleId, { id: waitingPlayer.id, username: waitingPlayer.username }, { id: socket.id, username });
      battles.set(battleId, battle);

      waitingPlayer.join(battleId);
      socket.join(battleId);

      // Lancer le premier tour
      console.log('Starting battle:', battleId);
      startTurn(battleId);
      io.to(battleId).emit('battleStart', battle.getPublicData());
      waitingPlayer = null;
    } else {
      waitingPlayer = socket;
      socket.emit('waiting');
    }
  });

  socket.on('move', ({ battleId, moveIndex }) => {
    const battle = battles.get(battleId);
    if (!battle) return;

    // Enregistrer le choix du joueur
    const playerIndex = battle.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      console.log(`Player ${socket.id} selected move: ${moveIndex} in battle ${battleId}`);
      battle.setMove(playerIndex, moveIndex);
      io.to(battleId).emit('moveSelected', { playerId: socket.id });

      // Vérifier si les deux joueurs ont choisi
      if (battle.moves.every(move => move !== null)) {
        console.log('Both players have chosen, playing turn');
        clearTimeout(battle.timer);
        playTurn(battleId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (waitingPlayer === socket) {
      waitingPlayer = null;
    }
    // Supprimer la bataille si un joueur se déconnecte
    for (const [battleId, battle] of battles) {
      if (battle.players.some(p => p.id === socket.id)) {
        io.to(battleId).emit('battleEnd', { winner: null, reason: 'Opponent disconnected' });
        clearTimeout(battle.timer);
        battles.delete(battleId);
      }
    }
  });

  function startTurn(battleId) {
    const battle = battles.get(battleId);
    if (!battle) return;

    // Réinitialiser les choix
    battle.moves = [null, null];

    // Informer les joueurs du nouveau tour
    console.log('Emitting newTurn for battle:', battleId);
    io.to(battleId).emit('newTurn', battle.getPublicData());

    // Lancer le timer de 30 secondes
    battle.timer = setTimeout(() => {
      console.log('Timer expired, playing turn for battle:', battleId);
      playTurn(battleId);
    }, 30000);
  }

  function playTurn(battleId) {
    const battle = battles.get(battleId);
    if (!battle) return;

    // Exécuter le tour
    const results = battle.playTurn();

    // Diffuser les résultats
    console.log('Emitting turnResult for battle:', battleId, results);
    io.to(battleId).emit('turnResult', { battle: battle.getPublicData(), results });

    // Vérifier si la bataille est terminée
    if (battle.isFinished()) {
      const winner = battle.players.find(player => player.pokemon.currentHp > 0);
      console.log('Battle ended, winner:', winner ? winner.username : null);
      io.to(battleId).emit('battleEnd', { winner: winner ? winner.username : null });
      battles.delete(battleId);
    } else {
      // Lancer le tour suivant
      startTurn(battleId);
    }
  }
});

server.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});