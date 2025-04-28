const pokemonData = {
  pikachu: {
    name: "Pikachu",
    hp: 100,
    attack: 50,
    defense: 30,
    speed: 90,
    moves: [
      { name: "Thunderbolt", power: 1.5 },
      { name: "Quick Attack", power: 1.0 },
      { name: "Tackle", power: 0.8 },
      { name: "Growl", power: 0 }
    ]
  },
  bulbasaur: {
    name: "Bulbasaur",
    hp: 120,
    attack: 40,
    defense: 50,
    speed: 60,
    moves: [
      { name: "Vine Whip", power: 1.2 },
      { name: "Tackle", power: 0.8 },
      { name: "Growl", power: 0 },
      { name: "Leech Seed", power: 0.5 }
    ]
  }
};

class Battle {
  constructor(id, player1, player2) {
    this.id = id;
    this.players = [
      { ...player1, pokemon: { ...pokemonData.pikachu, currentHp: pokemonData.pikachu.hp } },
      { ...player2, pokemon: { ...pokemonData.bulbasaur, currentHp: pokemonData.bulbasaur.hp } }
    ];
    this.moves = [null, null]; // Stocke les choix d'attaques
    this.timer = null;
  }

  // Calculer les dégâts
  calculateDamage(attacker, defender, move) {
    if (!move || move.power === 0) return 0;
    const damage = Math.floor(attacker.pokemon.attack * move.power - defender.pokemon.defense * 0.5);
    return Math.max(1, damage);
  }

  // Enregistrer le choix d'une attaque
  setMove(playerIndex, moveIndex) {
    this.moves[playerIndex] = moveIndex !== null ? this.players[playerIndex].pokemon.moves[moveIndex] : null;
  }

  // Exécuter un tour avec les deux choix
  playTurn() {
    const results = [];
    // Déterminer l'ordre des attaques en fonction de la vitesse
    const order = this.players[0].pokemon.speed > this.players[1].pokemon.speed ? [0, 1] : [1, 0];

    for (const playerIndex of order) {
      const attacker = this.players[playerIndex];
      const defender = this.players[1 - playerIndex];
      const move = this.moves[playerIndex];

      if (move) {
        const damage = this.calculateDamage(attacker, defender, move);
        defender.pokemon.currentHp = Math.max(0, defender.pokemon.currentHp - damage);
        results.push({
          attacker: attacker.pokemon.name,
          move: move.name,
          damage,
          defender: defender.pokemon.name,
          defenderHp: defender.pokemon.currentHp
        });
      } else {
        results.push({
          attacker: attacker.pokemon.name,
          move: "None",
          damage: 0,
          defender: defender.pokemon.name,
          defenderHp: defender.pokemon.currentHp
        });
      }
    }

    // Réinitialiser les choix pour le prochain tour
    this.moves = [null, null];
    return results;
  }

  // Vérifier si la bataille est terminée
  isFinished() {
    return this.players.some(player => player.pokemon.currentHp <= 0);
  }

  // Obtenir les données publiques de la bataille
  getPublicData() {
    return {
      id: this.id,
      players: this.players.map(player => ({
        id: player.id,
        username: player.username,
        pokemon: {
          name: player.pokemon.name,
          currentHp: player.pokemon.currentHp,
          hp: player.pokemon.hp,
          attack: player.pokemon.attack,
          defense: player.pokemon.defense,
          speed: player.pokemon.speed,
          moves: player.pokemon.moves
        }
      }))
    };
  }
}

module.exports = { Battle, pokemonData };