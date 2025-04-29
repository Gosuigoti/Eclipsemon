class Pokemon {
  constructor(name, hp, speed, attack, defense, moves) {
    this.name = name;
    this.hp = hp;
    this.currentHp = hp;
    this.speed = speed;
    this.attack = attack; // Nouvelle stat pour l’attaque
    this.defense = defense;
    this.moves = moves;
  }
}

class Battle {
  constructor(id, player1, player2) {
    this.id = id;
    this.players = [
      {
        id: player1.id,
        username: player1.username,
        pokemon: new Pokemon('Pikachu', 100, 90, 55, 40, [
          { name: 'Thunderbolt', power: 90 },
          { name: 'Quick Attack', power: 40 },
          { name: 'Tackle', power: 40 },
          { name: 'Growl', power: 0 }
        ])
      },
      {
        id: player2.id,
        username: player2.username,
        pokemon: new Pokemon('Bulbasaur', 120, 60, 49, 49, [
          { name: 'Vine Whip', power: 45 },
          { name: 'Tackle', power: 40 },
          { name: 'Growl', power: 0 },
          { name: 'Leech Seed', power: 0 }
        ])
      }
    ];
    this.moves = [null, null];
    this.timer = null;
  }

  setMove(playerIndex, moveIndex) {
    this.moves[playerIndex] = this.players[playerIndex].pokemon.moves[moveIndex];
  }

  isFinished() {
    return this.players.some(player => player.pokemon.currentHp <= 0);
  }

  getPublicData() {
    return {
      id: this.id,
      players: this.players.map(player => ({
        username: player.username,
        pokemon: {
          name: player.pokemon.name,
          hp: player.pokemon.hp,
          currentHp: player.pokemon.currentHp,
          speed: player.pokemon.speed,
          attack: player.pokemon.attack,
          defense: player.pokemon.defense,
          moves: player.pokemon.moves
        }
      }))
    };
  }
}

module.exports = { Battle };