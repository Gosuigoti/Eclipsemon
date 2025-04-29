import { useState, useEffect } from 'react';
import './Battle.css';
import battleBackground from './assets/battle-background.png'; // Import the local image

function Battle({ battle, socket, username, messages }) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [hasSelected, setHasSelected] = useState(false);
  const [opponentSelected, setOpponentSelected] = useState(false);
  const [animations, setAnimations] = useState({
    attacking: null,
    shaking: null,
    blinking: null
  });
  const [effectivenessMessage, setEffectivenessMessage] = useState(null);

  const player = battle.players.find(p => p.username === username);
  const opponent = battle.players.find(p => p.username !== username);

  const playerHpPercent = (player.pokemon.currentHp / player.pokemon.hp) * 100;
  const opponentHpPercent = (opponent.pokemon.currentHp / opponent.pokemon.hp) * 100;

  const getHealthColor = (percent) => {
    if (percent > 50) return 'green';
    if (percent > 20) return 'yellow';
    return 'red';
  };

  const getPokemonSprite = (pokemonName, isPlayer) => {
    const sprites = {
      Pikachu: {
        back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/25.png',
        front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'
      },
      Bulbasaur: {
        back: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/1.png',
        front: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'
      }
    };
    return isPlayer ? sprites[pokemonName].back : sprites[pokemonName].front;
  };

  // Placeholder Pokémon types (replace with actual data from your backend)
  const pokemonTypes = {
    Pikachu: ['Electric'],
    Bulbasaur: ['Grass', 'Poison']
  };

  // Placeholder move types (replace with actual data from your backend)
  const moveTypes = player.pokemon.moves.map((move) => {
    switch (move.name.toLowerCase()) {
      case 'vine whip':
        return 'Grass';
      case 'tackle':
        return 'Normal';
      case 'growl':
        return 'Normal';
      case 'leech seed':
        return 'Grass';
      default:
        return 'Normal';
    }
  });

  // Simple type effectiveness logic (expand as needed)
  const calculateEffectiveness = (moveType, targetTypes) => {
    const effectivenessChart = {
      Grass: {
        Grass: 0.5, // Not very effective
        Poison: 0.5 // Not very effective
      },
      Normal: {
        Grass: 1, // Neutral
        Poison: 1 // Neutral
      }
    };

    let multiplier = 1;
    targetTypes.forEach((targetType) => {
      const effectiveness = effectivenessChart[moveType]?.[targetType] || 1;
      multiplier *= effectiveness;
    });

    if (multiplier > 1) return "It's super effective";
    if (multiplier < 1) return "It's not very effective";
    if (multiplier === 0) return "It doesn't affect...";
    return null; // Neutral, no message
  };

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.attacker) {
      setAnimations({ attacking: lastMessage.attacker, shaking: null, blinking: null });
      setTimeout(() => {
        setAnimations({
          attacking: null,
          shaking: lastMessage.defender,
          blinking: lastMessage.defender
        });
        setTimeout(() => {
          setAnimations({ attacking: null, shaking: null, blinking: null });
        }, 500);

        // Check effectiveness if the player attacked
        if (lastMessage.attacker === player.pokemon.name) {
          const moveIndex = player.pokemon.moves.findIndex(move => move.name === lastMessage.move);
          const moveType = moveTypes[moveIndex] || 'Normal';
          const targetTypes = pokemonTypes[opponent.pokemon.name] || ['Normal'];
          const message = calculateEffectiveness(moveType, targetTypes);
          if (message) {
            setEffectivenessMessage(message);
            setTimeout(() => {
              setEffectivenessMessage(null);
            }, 2000); // Message disappears after 2 seconds
          }
        }
      }, 500);
    }
  }, [messages, player.pokemon.name, opponent.pokemon.name]);

  useEffect(() => {
    socket.on('newTurn', () => {
      console.log('Received newTurn event');
      setTimeLeft(30);
      setHasSelected(false);
      setOpponentSelected(false);
    });

    socket.on('moveSelected', ({ playerId }) => {
      console.log('Received moveSelected event for player:', playerId);
      if (playerId !== socket.id) {
        setOpponentSelected(true);
      }
    });

    return () => {
      socket.off('newTurn');
      socket.off('moveSelected');
    };
  }, [socket]);

  useEffect(() => {
    console.log('Battle component mounted, initializing timer');
    let timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      console.log('Battle component unmounted, cleaning up');
      clearInterval(timer);
    };
  }, []);

  const handleMove = (moveIndex) => {
    if (!hasSelected) {
      console.log('Player selected move:', moveIndex);
      socket.emit('move', { battleId: battle.id, moveIndex });
      setHasSelected(true);
    }
  };

  return (
    <div className="battle-container" style={{ backgroundImage: `url(${battleBackground})` }}>
      <div className="battle-field">
        <div className="pokemon-opponent">
          <div className="pokemon-type">{pokemonTypes[opponent.pokemon.name].join('/')}</div>
          <div className="health-bar-container opponent">
            <div className="health-bar">
              <div
                className={`health-fill ${getHealthColor(opponentHpPercent)} ${animations.blinking === opponent.pokemon.name ? 'blink' : ''}`}
                style={{ width: `${opponentHpPercent}%` }}
              ></div>
            </div>
            <div className="health-text">{`${opponent.pokemon.currentHp}/${opponent.pokemon.hp}`}</div>
          </div>
          <img
            src={getPokemonSprite(opponent.pokemon.name, false)}
            alt={opponent.pokemon.name}
            className={`pokemon-sprite ${animations.attacking === opponent.pokemon.name ? 'attack' : ''} ${animations.shaking === opponent.pokemon.name ? 'shake' : ''}`}
          />
        </div>

        <div className="pokemon-player">
          <div className="pokemon-type">{pokemonTypes[player.pokemon.name].join('/')}</div>
          {effectivenessMessage && (
            <div className="effectiveness-message">{effectivenessMessage}</div>
          )}
          <div className="health-bar-container">
            <div className="health-bar">
              <div
                className={`health-fill ${getHealthColor(playerHpPercent)} ${animations.blinking === player.pokemon.name ? 'blink' : ''}`}
                style={{ width: `${playerHpPercent}%` }}
              ></div>
            </div>
            <div className="health-text">{`${player.pokemon.currentHp}/${player.pokemon.hp}`}</div>
          </div>
          <img
            src={getPokemonSprite(player.pokemon.name, true)}
            alt={player.pokemon.name}
            className={`pokemon-sprite ${animations.attacking === player.pokemon.name ? 'attack' : ''} ${animations.shaking === player.pokemon.name ? 'shake' : ''}`}
          />
        </div>
      </div>

      <div className="moves-section">
        <div className="moves-container">
          {player.pokemon.moves.map((move, index) => (
            <button
              key={move.name}
              onClick={() => handleMove(index)}
              disabled={hasSelected}
              className={`move-button ${hasSelected ? '' : 'hover-pulse'}`}
            >
              {move.name} ({moveTypes[index]})
            </button>
          ))}
        </div>
      </div>

      <div className="timer-section">
        <p>Time left: {timeLeft}s</p>
        <p>{hasSelected ? 'You have selected your move' : 'Choose your move'}</p>
        <p>{opponentSelected ? 'Opponent has selected their move' : 'Waiting for opponent to choose'}</p>
      </div>
    </div>
  );
}

export default Battle;