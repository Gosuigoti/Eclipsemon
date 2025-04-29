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

    const playerIndex = battle.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      console.log(`Player ${socket.id} selected move: ${moveIndex} in battle ${battleId}`);
      battle.setMove(playerIndex, moveIndex);
      io.to(battleId).emit('moveSelected', { playerId: socket.id });

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

    battle.moves = [null, null];
    console.log('Emitting newTurn for battle:', battleId);
    io.to(battleId).emit('newTurn', battle.getPublicData());

    battle.timer = setTimeout(() => {
      console.log('Timer expired, playing turn for battle:', battleId);
      playTurn(battleId);
    }, 30000);
  }

  async function playTurn(battleId) {
    const battle = battles.get(battleId);
    if (!battle) return;

    const order = battle.players[0].pokemon.speed > battle.players[1].pokemon.speed ? [0, 1] : [1, 0];

    // Traiter chaque attaque individuellement
    for (const attackerIndex of order) {
      const defenderIndex = 1 - attackerIndex;
      const move = battle.moves[attackerIndex];
      const attacker = battle.players[attackerIndex].pokemon;
      const defender = battle.players[defenderIndex].pokemon;

      if (move === null) {
        const result = {
          attacker: attacker.name,
          defender: defender.name,
          move: 'None',
          damage: 0
        };
        console.log('Emitting turnResult for battle:', battleId, result);
        io.to(battleId).emit('turnResult', { battle: battle.getPublicData(), result });
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      }

      // Nouvelle formule de calcul des dégâts
      let damage = move.name === 'Growl' || move.name === 'Leech Seed' ? 0 : Math.floor((move.power * (attacker.attack / defender.defense)) / 2) + 5;
      damage = Math.max(5, damage); // Minimum 5 dégâts pour éviter 0
      defender.currentHp = Math.max(0, defender.currentHp - damage);

      const result = {
        attacker: attacker.name,
        defender: defender.name,
        move: move.name,
        damage: damage
      };

      console.log('Emitting turnResult for battle:', battleId, result);
      io.to(battleId).emit('turnResult', { battle: battle.getPublicData(), result });

      // Ajouter un délai pour laisser le temps aux animations
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    if (battle.isFinished()) {
      const winner = battle.players.find(player => player.pokemon.currentHp > 0);
      console.log('Battle ended, winner:', winner ? winner.username : null);
      io.to(battleId).emit('battleEnd', { winner: winner ? winner.username : null });
      battles.delete(battleId);
    } else {
      startTurn(battleId);
    }
  }
});

server.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});